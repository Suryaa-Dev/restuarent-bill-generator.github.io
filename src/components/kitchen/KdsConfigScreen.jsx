import React, { useMemo, useState } from 'react';
import { X, Plus, Search, ChevronLeft, Trash2, Check, Loader2, Square, LayoutGrid } from 'lucide-react';
import { t, translateCategory, translateItemName } from '../../i18n/translations';
import { getCategories } from '../../lib/menu';
import { updateKitchenConfig } from '../../lib/kitchen';
import { MAX_FEATURED, MAX_GROUPS, itemKey, normalizeConfig } from '../../lib/kds';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';

/* ---------- pick items from THIS kitchen ---------- */

function PickerModal({ lang, items, taken, limit, onPick, onClose }) {
    const single = false;
    const [q, setQ] = useState('');
    const [cat, setCat] = useState(null);
    const [sel, setSel] = useState([]); // keys
    const categories = useMemo(() => getCategories(items), [items]);

    const visible = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items.filter(i =>
            (!cat || i.category === cat) &&
            (!s || i.name.toLowerCase().includes(s) || (i.nameMr || '').includes(q.trim()))
        );
    }, [items, q, cat]);

    const room = limit == null ? Infinity : limit - sel.length;
    const toggle = (key) => {
        if (single) { onPick([key]); return; }
        setSel(prev => (prev.includes(key) ? prev.filter(k => k !== key) : room > 0 ? [...prev, key] : prev));
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[30rem] h-[85vh] md:h-[80vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{t('kdsPickItem', lang)}</h2>
                    <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                </div>
                <div className="p-4 pb-2 space-y-3 border-b">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchMenu', lang)}
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {[null, ...categories].map(c => (
                            <button key={c ?? '__all__'} onClick={() => setCat(c)}
                                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${cat === c ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {c ? translateCategory(c, lang) : t('allCategories', lang)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {visible.length === 0 && <p className="text-center text-gray-400 py-10">{t('kdsNoKitchenItems', lang)}</p>}
                    {visible.map(item => {
                        const key = itemKey(item);
                        const used = taken.has(key);
                        const checked = sel.includes(key);
                        return (
                            <button key={item.id} disabled={used} onClick={() => toggle(key)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${used ? 'bg-gray-50 border-gray-200 opacity-50' : checked ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 active:bg-gray-50'}`}>
                                {!single && (
                                    <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'}`}>
                                        {(checked || used) && <Check size={14} />}
                                    </span>
                                )}
                                <span className="flex-1 min-w-0">
                                    <span className="block font-semibold text-gray-800 truncate">{translateItemName(item.name, lang)}</span>
                                    <span className="block text-xs text-gray-500">{translateCategory(item.category, lang)}</span>
                                </span>
                                {used && <span className="text-[11px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-1">{t('alreadyHere', lang)}</span>}
                            </button>
                        );
                    })}
                </div>
                {!single && (
                    <div className="p-4 border-t">
                        <button disabled={sel.length === 0} onClick={() => onPick(sel)}
                            className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-40">
                            {t('add', lang)} {sel.length > 0 ? sel.length : ''}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------- screen ---------- */

const Section = ({ icon: Icon, title, note, children }) => (
    <div className="space-y-2.5">
        <div>
            <p className="flex items-center gap-2 font-bold text-gray-800"><Icon size={18} /> {title}</p>
            {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
        </div>
        {children}
    </div>
);

export default function KdsConfigScreen({ lang, kitchen, items, onSaved, onBack }) {
    const kitchenItems = useMemo(() => items.filter(i => i.kitchenId === kitchen.id), [items, kitchen.id]);
    const byKey = useMemo(() => new Map(kitchenItems.map(i => [itemKey(i), i])), [kitchenItems]);

    const initial = useMemo(() => normalizeConfig(kitchen.kdsConfig), [kitchen.kdsConfig]);
    const [featured, setFeatured] = useState(initial.featured);
    const [groups, setGroups] = useState(initial.groups);
    const [timer, setTimer] = useState(initial.timer);
    const [picker, setPicker] = useState(null); // { type:'featured' } | { type:'group', id }
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const touch = () => { setSaved(false); setError(''); };
    const label = (it) => translateItemName(it.name, lang);
    const toEntry = (key) => { const i = byKey.get(key); return { name: i.name, category: i.category }; };

    const handlePick = (keys) => {
        touch();
        if (picker.type === 'featured') {
            setFeatured(f => [...f, ...keys.map(toEntry)].slice(0, MAX_FEATURED));
        } else {
            setGroups(gs => gs.map(g => (g.id === picker.id ? { ...g, items: [...g.items, ...keys.map(toEntry)] } : g)));
        }
        setPicker(null);
    };

    const addGroup = () => {
        touch();
        setGroups(gs => [...gs, { id: `g${Date.now()}`, name: `Category ${gs.length + 1}`, items: [] }].slice(0, MAX_GROUPS));
    };

    const setLimit = (k, v) => { touch(); setTimer(tm => ({ ...tm, [k]: v === '' ? '' : Number(v) })); };

    const handleSave = async () => {
        const tm = { green: Number(timer.green), yellow: Number(timer.yellow), orange: Number(timer.orange) };
        if (!(tm.green > 0 && tm.green < tm.yellow && tm.yellow < tm.orange)) { setError(t('kdsTimerInvalid', lang)); return; }
        if (groups.some(g => !g.name.trim())) { setError(t('kitchenNameEmpty', lang)); return; }

        setSaving(true);
        setError('');
        try {
            const cfg = {
                featured,
                groups: groups.map(g => ({ ...g, name: g.name.trim() })),
                timer: tm,
            };
            const updated = await updateKitchenConfig(kitchen.id, cfg);
            onSaved(updated);
            setSaved(true);
        } catch (e) {
            console.error(e);
            setError(t('kdsSaveFailed', lang));
        } finally {
            setSaving(false);
        }
    };

    const featuredKeys = new Set(featured.map(itemKey));
    const pickerTaken = picker?.type === 'featured'
        ? featuredKeys
        : new Set((groups.find(g => g.id === picker?.id)?.items || []).map(itemKey));

    const Chip = ({ it, onRemove }) => (
        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 rounded-full pl-3 pr-1.5 py-1 text-sm font-medium">
            {label(it)}
            <button onClick={onRemove} className="w-5 h-5 rounded-full bg-gray-300 text-white flex items-center justify-center" aria-label={t('removeFromKitchen', lang)}><X size={12} /></button>
        </span>
    );

    return (
        <>
            <div className="flex items-center gap-2 p-4 border-b">
                <button onClick={onBack} className="p-1 -ml-1" aria-label={t('cancel', lang)}><ChevronLeft size={24} /></button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold truncate">{t('kdsDisplaySettings', lang)}</h2>
                    <p className="text-xs text-gray-500 truncate">{kitchen.name}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {kitchenItems.length === 0 && (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{t('kdsNoKitchenItems', lang)}</p>
                )}

                {/* main boxes */}
                <Section icon={Square} title={t('kdsMainBoxes', lang)} note={t('kdsMainBoxesNote', lang)}>
                    <div className="flex flex-wrap gap-2">
                        {featured.map((it, i) => <Chip key={itemKey(it)} it={it} onRemove={() => { touch(); setFeatured(f => f.filter((_, x) => x !== i)); }} />)}
                    </div>
                    <button disabled={featured.length >= MAX_FEATURED || kitchenItems.length === 0} onClick={() => setPicker({ type: 'featured' })}
                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                        <Plus size={16} /> {t('kdsAddItem', lang)} ({featured.length}/{MAX_FEATURED})
                    </button>
                </Section>

                {/* categories */}
                <Section icon={LayoutGrid} title={t('kdsCategoriesTitle', lang)} note={t('kdsCategoriesNote', lang)}>
                    {groups.map(g => (
                        <div key={g.id} className="rounded-xl border border-gray-200 p-3 space-y-2.5">
                            <div className="flex gap-2">
                                <input value={g.name} placeholder={t('kdsCategoryName', lang)}
                                    onChange={(e) => { touch(); setGroups(gs => gs.map(x => (x.id === g.id ? { ...x, name: e.target.value } : x))); }}
                                    className={inputCls} />
                                <button onClick={() => { touch(); setGroups(gs => gs.filter(x => x.id !== g.id)); }}
                                    className="px-3 rounded-lg bg-red-50 text-red-600" aria-label={t('deleteKitchen', lang)}><Trash2 size={18} /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {g.items.map((it, i) => (
                                    <Chip key={itemKey(it)} it={it} onRemove={() => { touch(); setGroups(gs => gs.map(x => (x.id === g.id ? { ...x, items: x.items.filter((_, n) => n !== i) } : x))); }} />
                                ))}
                            </div>
                            <button disabled={kitchenItems.length === 0} onClick={() => setPicker({ type: 'group', id: g.id })}
                                className="w-full py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40">
                                <Plus size={15} /> {t('kdsAddItems', lang)}
                            </button>
                        </div>
                    ))}
                    <button disabled={groups.length >= MAX_GROUPS} onClick={addGroup}
                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                        <Plus size={16} /> {t('kdsAddCategory', lang)} ({groups.length}/{MAX_GROUPS})
                    </button>
                </Section>

                {/* timer colours */}
                <Section icon={Square} title={t('kdsTimerTitle', lang)} note={t('kdsTimerNote', lang)}>
                    {[['green', 'kdsGreenUntil', 'bg-green-500'], ['yellow', 'kdsYellowUntil', 'bg-yellow-400'], ['orange', 'kdsOrangeUntil', 'bg-orange-500']].map(([k, key, dot]) => (
                        <label key={k} className="flex items-center gap-3">
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${dot}`} />
                            <span className="flex-1 text-sm font-medium text-gray-700">{t(key, lang)}</span>
                            <input type="number" inputMode="numeric" min="1" value={timer[k]} onChange={(e) => setLimit(k, e.target.value)} className={`${inputCls} !w-24 text-center`} />
                        </label>
                    ))}
                    <p className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <span className="w-3.5 h-3.5 rounded-full shrink-0 bg-red-600" />{t('kdsRedAfter', lang)}
                    </p>
                </Section>
            </div>

            <div className="p-4 border-t bg-white space-y-2">
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                <button onClick={handleSave} disabled={saving}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : null}
                    {saved ? t('kdsSaved', lang) : t('saveChanges', lang)}
                </button>
            </div>

            {picker && (
                <PickerModal
                    lang={lang}
                    items={kitchenItems}
                    taken={pickerTaken}
                    limit={picker.type === 'featured' ? MAX_FEATURED - featured.length : null}
                    onPick={handlePick}
                    onClose={() => setPicker(null)}
                />
            )}
        </>
    );
}

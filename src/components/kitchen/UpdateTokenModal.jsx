import React, { useMemo, useState } from 'react';
import { X, Plus, Minus, Search, Lock, ListPlus } from 'lucide-react';
import { t, translateCategory, translateItemName, translatePortion } from '../../i18n/translations';
import { lineKey } from '../../lib/kitchen';
import { getCategories } from '../../lib/menu';

let uidCounter = 0;
const nextUid = () => ++uidCounter;

const makeNewRow = (opt, qty, replacedFrom) => ({
    uid: nextUid(),
    name: opt.name,
    portion: opt.portion,
    category: opt.category,
    price: opt.price,
    kitchenId: opt.kitchenId ?? null,
    qty,
    origQty: 0,
    served: false,
    removed: false,
    wasRemoved: false,
    isNew: true,
    replacedFrom: replacedFrom || undefined,
});

// drop editor-only fields before saving
const strip = ({ uid, origQty, wasRemoved, isNew, ...rest }) => rest;

/* ---------- menu picker (replace / add) ---------- */

function MenuPicker({ items, lang, onPick, onClose }) {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState(null);
    const pickable = useMemo(() => items.filter(i => i.kitchenId), [items]);
    const categories = useMemo(() => getCategories(pickable), [pickable]);

    const visible = useMemo(() => {
        const s = q.trim().toLowerCase();
        return pickable.filter(i =>
            (!cat || i.category === cat) &&
            (!s || i.name.toLowerCase().includes(s) || (i.nameMr || '').includes(q.trim()))
        );
    }, [pickable, q, cat]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[30rem] h-[85vh] md:h-[80vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{t('pickItem', lang)}</h2>
                    <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                </div>

                <div className="p-4 pb-2 space-y-3 border-b">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={t('searchMenu', lang)}
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {[null, ...categories].map(c => (
                            <button
                                key={c ?? '__all__'}
                                onClick={() => setCat(c)}
                                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${cat === c ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                            >
                                {c ? translateCategory(c, lang) : t('allCategories', lang)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {visible.length === 0 && <p className="text-center text-gray-400 py-10">{t('noMenuItems', lang)}</p>}
                    {visible.map(item => (
                        <div key={item.id} className="p-3 rounded-xl border border-gray-200">
                            <p className="font-semibold text-gray-800">{translateItemName(item.name, lang)}</p>
                            <p className="text-xs text-gray-500">{translateCategory(item.category, lang)}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {item.options.map((o, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onPick({
                                            name: item.name,
                                            category: item.category,
                                            portion: o.portion,
                                            price: o.price,
                                            kitchenId: item.kitchenId || null,
                                        })}
                                        className="px-3 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-sm font-bold active:bg-orange-100"
                                    >
                                        {translatePortion(o.portion, lang)} ₹{o.price}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ---------- editor (styled like the cart drawer: Add More, + / -, item names) ---------- */

export default function UpdateTokenModal({ token, menuItems, lang, onSave, onClose }) {
    const [rows, setRows] = useState(() =>
        token.items.map(it => ({ ...it, uid: nextUid(), origQty: it.qty, wasRemoved: !!it.removed, isNew: false }))
    );
    const [picking, setPicking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const patchRow = (uid, patch) => setRows(rs => rs.map(r => (r.uid === uid ? { ...r, ...patch } : r)));
    // "-" at quantity 1 removes the line, like in the cart drawer
    const removeRow = (r) => (r.isNew ? setRows(rs => rs.filter(x => x.uid !== r.uid)) : patchRow(r.uid, { removed: true }));

    const handlePick = (opt) => {
        setRows(rs => {
            const k = lineKey(opt);
            const same = rs.find(r => !r.removed && !r.served && lineKey(r) === k);
            if (same) return rs.map(r => (r.uid === same.uid ? { ...r, qty: r.qty + 1 } : r));
            return [...rs, makeNewRow(opt, 1)];
        });
        setPicking(false);
    };

    const activeRows = rows.filter(r => !r.removed);
    const dirty = rows.some(r => r.isNew || (r.removed && !r.wasRemoved) || (!r.removed && r.qty !== r.origQty));
    const canSave = dirty && activeRows.length > 0 && !saving;

    const handleSave = async () => {
        if (activeRows.length === 0) { setError(t('mustKeepOneItem', lang)); return; }

        const items = rows.map(r => {
            if (r.removed && !r.wasRemoved) return { ...strip(r), qty: r.origQty, removed: true, change: 'removed' };
            if (r.isNew) return { ...strip(r), change: r.replacedFrom ? 'replaced' : 'added' };
            if (!r.removed && r.qty !== r.origQty) return { ...strip(r), change: 'qty', prevQty: r.origQty };
            return strip(r);
        });

        // difference in "live" quantity per line -> applied to the bill so it stays in step
        const oldQ = {};
        token.items.forEach(it => { if (!it.removed) oldQ[lineKey(it)] = (oldQ[lineKey(it)] || 0) + it.qty; });
        const newQ = {};
        items.forEach(it => { if (!it.removed) newQ[lineKey(it)] = (newQ[lineKey(it)] || 0) + it.qty; });

        const deltas = [...new Set([...Object.keys(oldQ), ...Object.keys(newQ)])]
            .map(k => {
                const sample = items.find(it => lineKey(it) === k) || token.items.find(it => lineKey(it) === k);
                return {
                    name: sample.name,
                    portion: sample.portion,
                    category: sample.category,
                    price: sample.price,
                    delta: (newQ[k] || 0) - (oldQ[k] || 0),
                };
            })
            .filter(d => d.delta !== 0);

        setSaving(true);
        setError('');
        try {
            await onSave(items, deltas);
        } catch (e) {
            console.error(e);
            setError(t('tokenSaveFailed', lang));
            setSaving(false);
        }
    };

    // rows that were already removed in an earlier edit are history — not shown here
    const visibleRows = rows.filter(r => !r.wasRemoved);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[70]">
                <div className="absolute bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-md bg-white rounded-t-3xl h-[85vh] flex flex-col">
                    {/* title + close */}
                    <div className="flex justify-between items-center px-4 pt-4 pb-2">
                        <h2 className="text-xl font-bold truncate">
                            {t('updateTokenTitle', lang)} <span className="text-blue-600">#{token.tokenNo}</span>
                        </h2>
                        <button onClick={onClose} className="p-1 -mr-1 shrink-0" aria-label={t('close', lang)}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* only action: Add More */}
                    <div className="px-4 pb-3 border-b">
                        <button
                            onClick={() => setPicking(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-700 active:bg-green-100"
                        >
                            <ListPlus size={18} />
                            <span className="text-sm font-semibold">{t('addMore', lang)}</span>
                        </button>
                    </div>

                    {/* items: name, - qty + */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {visibleRows.map((r, idx) => (
                            <div key={r.uid} className="flex justify-between items-center py-3 border-b gap-2">
                                <div className="min-w-0">
                                    <p className={`font-medium ${r.removed ? 'line-through text-gray-400' : ''}`}>
                                        <span className="text-gray-400 font-normal mr-1">{idx + 1}.</span>
                                        {translateItemName(r.name, lang)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {translatePortion(r.portion, lang)}
                                        {r.isNew && (
                                            <span className="ml-2 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{t('itemNew', lang)}</span>
                                        )}
                                    </p>
                                </div>

                                {r.served ? (
                                    <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 rounded-full px-2.5 py-1">
                                        <Lock size={12} /> {t('lockedServed', lang)} ×{r.qty}
                                    </span>
                                ) : r.removed ? (
                                    <button
                                        onClick={() => patchRow(r.uid, { removed: false })}
                                        className="shrink-0 text-sm font-bold text-blue-600 px-2 py-1"
                                    >
                                        {t('undo', lang)}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button
                                            onClick={() => (r.qty > 1 ? patchRow(r.uid, { qty: r.qty - 1 }) : removeRow(r))}
                                            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-bold w-8 text-center text-gray-800">{r.qty}</span>
                                        <button
                                            onClick={() => patchRow(r.uid, { qty: r.qty + 1 })}
                                            className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center active:bg-orange-600"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                        {dirty && activeRows.length === 0 && !error && (
                            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{t('mustKeepOneItem', lang)}</p>
                        )}
                    </div>

                    {/* a changed token has to be confirmed, so a single Save is all that's here */}
                    <div className="border-t p-4">
                        <button
                            onClick={handleSave}
                            disabled={!canSave}
                            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40"
                        >
                            {saving ? t('savingChanges', lang) : t('saveChanges', lang)}
                        </button>
                    </div>
                </div>
            </div>

            {picking && (
                <MenuPicker items={menuItems} lang={lang} onPick={handlePick} onClose={() => setPicking(false)} />
            )}
        </>
    );
}
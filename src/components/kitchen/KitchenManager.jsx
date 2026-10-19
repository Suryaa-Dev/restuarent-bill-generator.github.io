import React, { useMemo, useState } from 'react';
import { X, Plus, Search, ChevronLeft, ChevronRight, Trash2, Pencil, Check, ChefHat, UtensilsCrossed, Loader2, MonitorPlay } from 'lucide-react';
import KdsConfigScreen from './KdsConfigScreen';
import { t, translateCategory, translateItemName } from '../../i18n/translations';
import { getCategories } from '../../lib/menu';
import {
    createKitchen,
    renameKitchen,
    deleteKitchen,
    assignItemsToKitchen,
    unassignItem,
} from '../../lib/kitchen';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';

const Thumb = ({ src }) =>
    src ? (
        <img src={src} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 bg-gray-100" />
    ) : (
        <div className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <UtensilsCrossed size={16} className="text-orange-300" />
        </div>
    );

const nameTaken = (kitchens, name, exceptId) =>
    kitchens.some(k => k.id !== exceptId && k.name.trim().toLowerCase() === name.trim().toLowerCase());

const isUniqueViolation = (err) => err?.code === '23505';

/* ======================= screen: item picker for one kitchen ======================= */

function AddItemsScreen({ lang, kitchen, kitchens, items, onAssigned, onBack }) {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState(null);
    const [selected, setSelected] = useState(() => new Set());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const categories = useMemo(() => getCategories(items), [items]);
    const kitchenName = (id) => kitchens.find(k => k.id === id)?.name || '';

    const visible = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items.filter(i =>
            (!cat || i.category === cat) &&
            (!s || i.name.toLowerCase().includes(s) || (i.nameMr || '').includes(q.trim()) || i.category.toLowerCase().includes(s))
        );
    }, [items, q, cat]);

    // only items with no kitchen yet can be picked
    const available = visible.filter(i => !i.kitchenId);
    const allShownSelected = available.length > 0 && available.every(i => selected.has(i.id));

    const toggle = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleAllShown = () => setSelected(prev => {
        const next = new Set(prev);
        if (allShownSelected) available.forEach(i => next.delete(i.id));
        else available.forEach(i => next.add(i.id));
        return next;
    });

    const handleAdd = async () => {
        if (selected.size === 0) return;
        setSaving(true);
        setError('');
        try {
            const assigned = await assignItemsToKitchen(kitchen.id, [...selected]);
            onAssigned(assigned);
            if (assigned.length < selected.size) {
                // someone else grabbed a few in the meantime
                setError(t('kitchenAssignFailed', lang));
                setSelected(new Set());
                setSaving(false);
                return;
            }
            onBack();
        } catch (e) {
            console.error(e);
            setError(t('saveFailed', lang));
            setSaving(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 p-4 border-b">
                <button onClick={onBack} className="p-1 -ml-1" aria-label={t('cancel', lang)}><ChevronLeft size={24} /></button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold truncate">{t('addItemsToKitchen', lang)}</h2>
                    <p className="text-xs text-gray-500 truncate">{kitchen.name}</p>
                </div>
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
                <div className="flex items-center justify-between text-sm">
                    <button
                        onClick={toggleAllShown}
                        disabled={available.length === 0}
                        className="font-semibold text-orange-600 disabled:text-gray-300"
                    >
                        {allShownSelected ? t('deselectAllShown', lang) : t('selectAllShown', lang)} ({available.length})
                    </button>
                    <span className="text-gray-500">{selected.size} {t('selectedCount', lang)}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {visible.length === 0 && <p className="text-center text-gray-400 py-12">{t('noMenuItems', lang)}</p>}
                {visible.map(item => {
                    const here = item.kitchenId === kitchen.id;
                    const elsewhere = item.kitchenId && !here;
                    const disabled = !!item.kitchenId;
                    const checked = selected.has(item.id);
                    return (
                        <button
                            key={item.id}
                            disabled={disabled}
                            onClick={() => toggle(item.id)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left ${disabled ? 'bg-gray-50 border-gray-200 opacity-60' : checked ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 active:bg-gray-50'}`}
                        >
                            <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'}`}>
                                {(checked || here) && <Check size={14} />}
                            </span>
                            <Thumb src={item.img} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{translateItemName(item.name, lang)}</p>
                                <p className="text-xs text-gray-500 truncate">{translateCategory(item.category, lang)}</p>
                            </div>
                            {elsewhere && (
                                <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-full px-2 py-1 shrink-0 max-w-[40%] truncate">
                                    {t('inKitchen', lang)} {kitchenName(item.kitchenId)}
                                </span>
                            )}
                            {here && (
                                <span className="text-[11px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-1 shrink-0">{t('alreadyHere', lang)}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {error && <p className="mx-4 mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

            <div className="p-4 border-t bg-white">
                <button
                    onClick={handleAdd}
                    disabled={selected.size === 0 || saving}
                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    {saving && <Loader2 size={18} className="animate-spin" />}
                    {t('add', lang)} {selected.size > 0 ? `${selected.size} ` : ''}{t('itemsCount', lang)}
                </button>
            </div>
        </>
    );
}

/* ======================= screen: one kitchen ======================= */

function KitchenDetail({ lang, kitchen, kitchens, items, onKitchensChange, onItemsChange, onAddItems, onOpenKds, onBack }) {
    const [query, setQuery] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState(kitchen.name);
    const [busy, setBusy] = useState(false);
    const [busyItem, setBusyItem] = useState(null);
    const [error, setError] = useState('');

    const mine = useMemo(() => {
        const s = query.trim().toLowerCase();
        return items
            .filter(i => i.kitchenId === kitchen.id)
            .filter(i => !s || i.name.toLowerCase().includes(s) || (i.nameMr || '').includes(query.trim()) || i.category.toLowerCase().includes(s))
            .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }, [items, kitchen.id, query]);
    const totalMine = items.filter(i => i.kitchenId === kitchen.id).length;

    const handleRename = async () => {
        const name = nameDraft.trim();
        if (!name) { setError(t('kitchenNameEmpty', lang)); return; }
        if (name === kitchen.name) { setRenaming(false); return; }
        if (nameTaken(kitchens, name, kitchen.id)) { setError(t('kitchenNameTaken', lang)); return; }
        setBusy(true);
        setError('');
        try {
            const saved = await renameKitchen(kitchen.id, name);
            onKitchensChange(kitchens.map(k => (k.id === saved.id ? saved : k)));
            setRenaming(false);
        } catch (e) {
            console.error(e);
            setError(isUniqueViolation(e) ? t('kitchenNameTaken', lang) : t('saveFailed', lang));
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('confirmDeleteKitchen', lang))) return;
        setBusy(true);
        setError('');
        try {
            await deleteKitchen(kitchen.id);
            onItemsChange(items.map(i => (i.kitchenId === kitchen.id ? { ...i, kitchenId: null } : i)));
            onKitchensChange(kitchens.filter(k => k.id !== kitchen.id));
            onBack();
        } catch (e) {
            console.error(e);
            setError(t('saveFailed', lang));
            setBusy(false);
        }
    };

    const handleRemoveItem = async (item) => {
        setBusyItem(item.id);
        setError('');
        const apply = (kid) => onItemsChange(items.map(i => (i.id === item.id ? { ...i, kitchenId: kid } : i)));
        apply(null); // optimistic
        try {
            await unassignItem(item.id);
        } catch (e) {
            console.error(e);
            apply(kitchen.id);
            setError(t('saveFailed', lang));
        } finally {
            setBusyItem(null);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 p-4 border-b">
                <button onClick={onBack} className="p-1 -ml-1" aria-label={t('cancel', lang)}><ChevronLeft size={24} /></button>
                {renaming ? (
                    <div className="flex-1 flex gap-2 min-w-0">
                        <input
                            autoFocus
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className={`${inputCls} !py-2 min-w-0`}
                        />
                        <button onClick={handleRename} disabled={busy} className="px-3 rounded-lg bg-green-600 text-white" aria-label={t('save', lang)}><Check size={18} /></button>
                        <button onClick={() => { setRenaming(false); setNameDraft(kitchen.name); setError(''); }} className="px-3 rounded-lg bg-gray-100 text-gray-600" aria-label={t('cancel', lang)}><X size={18} /></button>
                    </div>
                ) : (
                    <>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold truncate flex items-center gap-2"><ChefHat size={18} className="shrink-0 text-indigo-600" />{kitchen.name}</h2>
                            <p className="text-xs text-gray-500">{totalMine} {t(totalMine === 1 ? 'itemSingular' : 'itemsCount', lang)}</p>
                        </div>
                        <button onClick={() => setRenaming(true)} className="p-2 rounded-lg bg-gray-100 text-gray-700" aria-label={t('renameKitchen', lang)}><Pencil size={18} /></button>
                        <button onClick={handleDelete} disabled={busy} className="p-2 rounded-lg bg-red-50 text-red-600" aria-label={t('deleteKitchen', lang)}><Trash2 size={18} /></button>
                    </>
                )}
            </div>

            <div className="p-4 pb-3 space-y-3 border-b">
                <button
                    onClick={onAddItems}
                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600"
                >
                    <Plus size={18} /> {t('addItemsToKitchen', lang)}
                </button>
                <button
                    onClick={onOpenKds}
                    className="w-full py-3 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold flex items-center justify-center gap-2 active:bg-indigo-100"
                >
                    <MonitorPlay size={18} /> {t('kdsDisplaySettings', lang)}
                </button>
                {totalMine > 6 && (
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('searchMenu', lang)}
                            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </div>
                )}
            </div>

            {error && <p className="mx-4 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {mine.length === 0 ? (
                    <p className="text-center text-gray-400 py-12 px-6">{totalMine === 0 ? t('noItemsInKitchen', lang) : t('noMenuItems', lang)}</p>
                ) : (
                    mine.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 bg-white">
                            <Thumb src={item.img} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{translateItemName(item.name, lang)}</p>
                                <p className="text-xs text-gray-500 truncate">{translateCategory(item.category, lang)}</p>
                            </div>
                            <button
                                onClick={() => handleRemoveItem(item)}
                                disabled={busyItem === item.id}
                                className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-semibold shrink-0 disabled:opacity-50"
                            >
                                {t('removeFromKitchen', lang)}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}

/* ======================= main: list of kitchens ======================= */

export default function KitchenManager({ lang, kitchens, onKitchensChange, items, onItemsChange, loadError, onClose }) {
    const [screen, setScreen] = useState({ name: 'list' }); // list | kitchen | add
    const [adding, setAdding] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const counts = useMemo(() => {
        const m = {};
        items.forEach(i => { if (i.kitchenId) m[i.kitchenId] = (m[i.kitchenId] || 0) + 1; });
        return m;
    }, [items]);
    const unassigned = items.filter(i => !i.kitchenId).length;

    const startAdding = () => {
        setNameDraft(`Kitchen ${kitchens.length + 1}`);
        setError('');
        setAdding(true);
    };

    const handleCreate = async () => {
        const name = nameDraft.trim();
        if (!name) { setError(t('kitchenNameEmpty', lang)); return; }
        if (nameTaken(kitchens, name)) { setError(t('kitchenNameTaken', lang)); return; }
        setSaving(true);
        setError('');
        try {
            const nextSort = (kitchens.reduce((m, k) => Math.max(m, k.sortOrder), 0) || 0) + 10;
            const created = await createKitchen(name, nextSort);
            onKitchensChange([...kitchens, created]);
            setAdding(false);
            setScreen({ name: 'kitchen', id: created.id });
        } catch (e) {
            console.error(e);
            setError(isUniqueViolation(e) ? t('kitchenNameTaken', lang) : t('saveFailed', lang));
        } finally {
            setSaving(false);
        }
    };

    const current = screen.id ? kitchens.find(k => k.id === screen.id) : null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[34rem] h-[94vh] md:h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                {screen.name === 'kds' && current ? (
                    <KdsConfigScreen
                        lang={lang}
                        kitchen={current}
                        items={items}
                        onSaved={(updated) => onKitchensChange(kitchens.map(k => (k.id === updated.id ? updated : k)))}
                        onBack={() => setScreen({ name: 'kitchen', id: current.id })}
                    />
                ) : screen.name === 'add' && current ? (
                    <AddItemsScreen
                        lang={lang}
                        kitchen={current}
                        kitchens={kitchens}
                        items={items}
                        onAssigned={(ids) => {
                            const set = new Set(ids);
                            onItemsChange(items.map(i => (set.has(i.id) ? { ...i, kitchenId: current.id } : i)));
                        }}
                        onBack={() => setScreen({ name: 'kitchen', id: current.id })}
                    />
                ) : screen.name === 'kitchen' && current ? (
                    <KitchenDetail
                        key={current.id}
                        lang={lang}
                        kitchen={current}
                        kitchens={kitchens}
                        items={items}
                        onKitchensChange={onKitchensChange}
                        onItemsChange={onItemsChange}
                        onAddItems={() => setScreen({ name: 'add', id: current.id })}
                        onOpenKds={() => setScreen({ name: 'kds', id: current.id })}
                        onBack={() => setScreen({ name: 'list' })}
                    />
                ) : (
                    <>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold flex items-center gap-2"><ChefHat size={20} /> {t('kitchenSettings', lang)}</h2>
                                <p className="text-xs text-gray-500 truncate">{t('kitchenSettingsNote', lang)}</p>
                            </div>
                            <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                        </div>

                        {loadError && (
                            <p className="mx-4 mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{t('kitchenSetupNeeded', lang)}</p>
                        )}

                        <div className="p-4 border-b space-y-3">
                            {adding ? (
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-500">{t('kitchenName', lang)}</label>
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            value={nameDraft}
                                            onChange={(e) => setNameDraft(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                            className={inputCls}
                                        />
                                        <button onClick={handleCreate} disabled={saving} className="px-4 rounded-lg bg-green-600 text-white font-bold disabled:opacity-60 flex items-center">
                                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} />}
                                        </button>
                                        <button onClick={() => { setAdding(false); setError(''); }} className="px-3 rounded-lg bg-gray-100 text-gray-600" aria-label={t('cancel', lang)}><X size={18} /></button>
                                    </div>
                                    {error && <p className="text-sm text-red-600">{error}</p>}
                                </div>
                            ) : (
                                <button
                                    onClick={startAdding}
                                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600"
                                >
                                    <Plus size={18} /> {t('addKitchen', lang)}
                                </button>
                            )}

                            {kitchens.length > 0 && unassigned > 0 && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    {unassigned} {t('unassignedItems', lang)}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {kitchens.length === 0 ? (
                                <div className="text-center text-gray-400 py-12 px-6">
                                    <ChefHat size={44} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{t('noKitchensYet', lang)}</p>
                                </div>
                            ) : (
                                kitchens.map(k => (
                                    <button
                                        key={k.id}
                                        onClick={() => setScreen({ name: 'kitchen', id: k.id })}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white active:bg-gray-50 text-left"
                                    >
                                        <span className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><ChefHat size={22} /></span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-bold text-gray-800 truncate">{k.name}</span>
                                            <span className="block text-xs text-gray-500">{counts[k.id] || 0} {t((counts[k.id] || 0) === 1 ? 'itemSingular' : 'itemsCount', lang)}</span>
                                        </span>
                                        <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

import React, { useMemo, useState } from 'react';
import { X, Plus, Minus, Search, Lock, ListPlus, ShoppingBag } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { ts } from '../../i18n/serveExtra';
import { CategoryPills, MenuItem, flattenRatePickerItems } from '../menu/MenuCards';
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
    addedAt: new Date().toISOString(), // when it entered the kitchen queue (KDS timer)
    cartAt: new Date().toISOString(), // added straight to the token, so cart time = sent time
    replacedFrom: replacedFrom || undefined,
});

// drop editor-only fields before saving
const strip = ({ uid, origQty, wasRemoved, isNew, ...rest }) => rest;

/* ---------- menu picker (Add more) ----------
   Same look as the home screen: category pills (first = favourites) and the same item cards.
   It stays open so several dishes can be added in a row; "Done" goes back to the token.   */

function MenuPicker({ items, favoriteItems, rows, addedCount, lang, onAdd, onClose }) {
    const [q, setQ] = useState('');
    const [cat, setCat] = useState(null); // null = favourites, like the home screen
    const pickable = useMemo(() => items.filter(i => i.kitchenId && !i.isHidden), [items]);
    const categories = useMemo(() => getCategories(pickable), [pickable]);
    const favourites = useMemo(() => (favoriteItems || []).filter(i => i.kitchenId), [favoriteItems]);

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        const base = s
            ? pickable.filter(i => i.name.toLowerCase().includes(s) || (i.nameMr || '').includes(q.trim()))
            : cat ? pickable.filter(i => i.category === cat) : favourites;
        return flattenRatePickerItems(base);
    }, [pickable, favourites, q, cat]);
    const ratePickerOnly = shown.length > 0 && shown.every(i => i.ratePicker);

    // quantity of a dish on this token right now (existing + newly added), like the home cards show for the bill
    const qtyOf = (name, portion, category) => rows
        .filter(r => !r.removed && r.name === name && r.portion === portion && (!r.category || !category || r.category === category))
        .reduce((sum, r) => sum + r.qty, 0);

    const add = (name, portion, price, category) => {
        const item = pickable.find(i => i.name === name && i.category === category) || pickable.find(i => i.name === name);
        if (!item) return;
        onAdd({ name, category, portion, price, kitchenId: item.kitchenId || null });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[32rem] h-[92vh] md:h-[85vh] rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                    <h2 className="text-lg font-bold shrink-0">{t('pickItem', lang)}</h2>
                    <div className="relative flex-1 min-w-0">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={t('searchMenu', lang)}
                            className="w-full h-10 border border-gray-300 rounded-full pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                    </div>
                    <button onClick={onClose} aria-label={t('close', lang)} className="p-1 shrink-0"><X size={24} /></button>
                </div>

                {!q.trim() && (
                    <CategoryPills
                        categories={categories}
                        selectedCategory={cat}
                        onSelectCategory={setCat}
                        lang={lang}
                        className="bg-white border-y px-4 py-3 flex gap-2 overflow-x-auto shrink-0"
                    />
                )}

                <div className={`flex-1 overflow-y-auto grid ${ratePickerOnly ? 'grid-cols-3' : 'grid-cols-2'} gap-3 p-3 content-start bg-white`}>
                    {shown.length === 0 && (
                        <p className="col-span-full text-center text-gray-400 py-12">
                            {q.trim() || cat ? t('noMenuItems', lang) : t('noFavoritesYet', lang)}
                        </p>
                    )}
                    {shown.map((item, idx) => (
                        <MenuItem
                            key={`${item.id}-${idx}`}
                            item={item}
                            onAddItem={add}
                            currentQty={qtyOf(item.name, item.options[0].portion, item.category)}
                            getQty={qtyOf}
                            lang={lang}
                        />
                    ))}
                </div>

                <div className="border-t p-3 bg-white">
                    <button onClick={onClose} className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold active:bg-blue-700">
                        {addedCount > 0 ? ts('doneAdded', lang).replace('{n}', addedCount) : ts('doneAdding', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------- editor (styled like the cart drawer: Add More, + / -, item names) ---------- */

export default function UpdateTokenModal({ token, menuItems, favoriteItems, lang, onSave, onClose }) {
    const [rows, setRows] = useState(() =>
        token.items.map(it => ({ ...it, uid: nextUid(), origQty: it.qty, wasRemoved: !!it.removed, isNew: false }))
    );
    const [picking, setPicking] = useState(false);
    const [parcel, setParcel] = useState(!!token.isParcel); // Parcel button: flips the WHOLE token
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
    };

    const activeRows = rows.filter(r => !r.removed);
    // food already served at the table can't become a parcel, so the button locks then
    const parcelLocked = rows.some(r => r.served && !r.removed);
    const parcelChanged = parcel !== !!token.isParcel;
    const dirty = parcelChanged || rows.some(r => r.isNew || (r.removed && !r.wasRemoved) || (!r.removed && r.qty !== r.origQty));
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

        const sampleOf = (k) => items.find(it => lineKey(it) === k) || token.items.find(it => lineKey(it) === k);
        const mk = (k, delta, isParcel) => {
            const sample = sampleOf(k);
            return { name: sample.name, portion: sample.portion, category: sample.category, price: sample.price, isParcel, delta };
        };
        const wasParcel = !!token.isParcel;
        let deltas;
        if (parcel === wasParcel) {
            // same section as before: just the net change (isParcel lands it on the matching bill section)
            deltas = [...new Set([...Object.keys(oldQ), ...Object.keys(newQ)])]
                .map(k => mk(k, (newQ[k] || 0) - (oldQ[k] || 0), wasParcel))
                .filter(d => d.delta !== 0);
        } else {
            // Parcel flipped: everything this token had leaves the old bill section and the new
            // quantities are added to the other one
            deltas = [
                ...Object.keys(oldQ).map(k => mk(k, -oldQ[k], wasParcel)),
                ...Object.keys(newQ).map(k => mk(k, newQ[k], parcel)),
            ].filter(d => d.delta !== 0);
        }

        setSaving(true);
        setError('');
        try {
            await onSave(items, deltas, parcel);
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

                    {/* actions: Add More + Parcel (flips this whole token to / from parcel) */}
                    <div className="px-4 pb-3 border-b flex items-stretch gap-2">
                        <button
                            onClick={() => setPicking(true)}
                            className="flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-700 active:bg-green-100"
                        >
                            <ListPlus size={18} />
                            <span className="text-sm font-semibold">{t('addMore', lang)}</span>
                        </button>
                        <button
                            onClick={() => setParcel(p => !p)}
                            disabled={parcelLocked}
                            aria-pressed={parcel}
                            className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-colors disabled:opacity-40 ${parcel
                                ? 'bg-purple-600 text-white border-purple-600 active:bg-purple-700'
                                : 'bg-white text-gray-700 border-gray-300 active:bg-gray-100'
                                }`}
                        >
                            <ShoppingBag size={18} />
                            <span className="text-sm font-semibold">{t('parcel', lang)}</span>
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
                <MenuPicker
                    items={menuItems}
                    favoriteItems={favoriteItems}
                    rows={rows}
                    addedCount={rows.filter(r => r.isNew && !r.removed).reduce((n, r) => n + r.qty, 0)}
                    lang={lang}
                    onAdd={handlePick}
                    onClose={() => setPicking(false)}
                />
            )}
        </>
    );
}
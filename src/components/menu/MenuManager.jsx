import React, { useMemo, useRef, useState } from 'react';
import { X, Plus, Minus, Search, ChevronLeft, ChevronRight, Camera, Trash2, UtensilsCrossed, Loader2 } from 'lucide-react';
import { t, translateCategory, translateItemName, translatePortion } from '../../i18n/translations';
import {
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    setMenuItemHidden,
    uploadMenuImage,
    deleteMenuImageByUrl,
    getCategories,
} from '../../lib/menu';

/* ---------- small pieces ---------- */

const Thumb = ({ src, size = 'w-12 h-12' }) =>
    src ? (
        <img src={src} alt="" className={`${size} rounded-lg object-cover shrink-0 bg-gray-100`} />
    ) : (
        <div className={`${size} rounded-lg bg-orange-50 flex items-center justify-center shrink-0`}>
            <UtensilsCrossed size={18} className="text-orange-300" />
        </div>
    );

const Switch = ({ checked, onChange, disabled, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-green-500' : 'bg-gray-300'} ${disabled ? 'opacity-50' : ''}`}
    >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
);

const priceSummary = (item, lang) =>
    item.options.map(o => (item.options.length > 1 || item.ratePicker
        ? `${translatePortion(o.portion, lang)} ₹${o.price}`
        : `₹${o.price}`)).join(' · ');

/* ---------- editor (add + edit share this screen) ---------- */

const emptyDraft = (category) => ({
    name: '',
    nameMr: '',
    category: category || '',
    img: null,
    options: [{ portion: '', price: '' }],
    isHidden: false,
    ratePicker: false,
});

function ItemEditor({ lang, item, categories, defaultCategory, onSaved, onDeleted, onBack, nextSortOrder, kitchenMode, kitchens }) {
    const isNew = !item;
    const [draft, setDraft] = useState(() =>
        item
            ? { ...item, options: item.options.map(o => ({ portion: o.portion, price: String(o.price) })) }
            : emptyDraft(defaultCategory)
    );
    const [newCategoryMode, setNewCategoryMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    // photos uploaded during this edit but not saved yet; cleaned up on cancel/replace
    const pendingUploads = useRef([]);
    const originalImg = item?.img || null;

    const set = (patch) => setDraft(d => ({ ...d, ...patch }));
    const setOption = (idx, patch) =>
        setDraft(d => ({ ...d, options: d.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) }));

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError('');
        setUploading(true);
        try {
            const url = await uploadMenuImage(file);
            if (draft.img && pendingUploads.current.includes(draft.img)) {
                deleteMenuImageByUrl(draft.img); // replaced an unsaved upload
                pendingUploads.current = pendingUploads.current.filter(u => u !== draft.img);
            }
            pendingUploads.current.push(url);
            set({ img: url });
        } catch (err) {
            console.error(err);
            setError(t('photoUploadFailed', lang));
        } finally {
            setUploading(false);
        }
    };

    const handleBack = () => {
        pendingUploads.current.forEach(deleteMenuImageByUrl);
        onBack();
    };

    const handleSave = async () => {
        setError('');
        const name = draft.name.trim();
        const category = draft.category.trim();
        const options = draft.options
            .map(o => ({ portion: String(o.portion).trim(), price: parseFloat(o.price) }))
            .filter(o => o.portion || !isNaN(o.price));

        if (!name || !category || options.length === 0 || options.some(o => !o.portion)) {
            setError(t('fillAllFields', lang));
            return;
        }
        if (options.some(o => isNaN(o.price) || o.price < 0)) {
            setError(t('priceInvalid', lang));
            return;
        }

        setSaving(true);
        try {
            const payload = { ...draft, name, category, options };
            // Normal mode never writes the kitchen column
            if (!kitchenMode) delete payload.kitchenId;
            const saved = isNew
                ? await createMenuItem(payload, nextSortOrder)
                : await updateMenuItem(item.id, payload);

            // the old photo is no longer used once the new one is saved
            if (originalImg && originalImg !== saved.img) deleteMenuImageByUrl(originalImg);
            pendingUploads.current = []; // saved: nothing left to clean up
            onSaved(saved);
        } catch (err) {
            console.error('Save item failed:', err);
            setError(t('saveFailed', lang));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('confirmDeleteItem', lang))) return;
        setSaving(true);
        try {
            await deleteMenuItem(item.id);
            deleteMenuImageByUrl(item.img);
            onDeleted(item.id);
        } catch (err) {
            console.error('Delete item failed:', err);
            setError(t('saveFailed', lang));
            setSaving(false);
        }
    };

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';
    const labelCls = 'block text-xs font-semibold text-gray-500 mb-1';

    return (
        <>
            <div className="flex items-center gap-2 p-4 border-b sticky top-0 bg-white z-10">
                <button onClick={handleBack} className="p-1 -ml-1" aria-label={t('cancel', lang)}>
                    <ChevronLeft size={24} />
                </button>
                <h2 className="text-lg font-bold flex-1 truncate">{isNew ? t('addItem', lang) : t('editItem', lang)}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Photo */}
                <div>
                    <span className={labelCls}>{t('itemPhoto', lang)}</span>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0"
                        >
                            {draft.img ? (
                                <img src={draft.img} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={28} className="text-gray-400" />
                            )}
                            {uploading && (
                                <span className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                    <Loader2 size={24} className="animate-spin text-orange-500" />
                                </span>
                            )}
                        </button>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="block px-4 py-2 rounded-lg bg-orange-50 text-orange-700 font-semibold text-sm border border-orange-200"
                            >
                                {uploading ? t('uploadingPhoto', lang) : draft.img ? t('changePhoto', lang) : t('addPhoto', lang)}
                            </button>
                            {draft.img && !uploading && (
                                <button
                                    type="button"
                                    onClick={() => set({ img: null })}
                                    className="block text-sm text-red-600 font-semibold"
                                >
                                    {t('removePhoto', lang)}
                                </button>
                            )}
                            <p className="text-xs text-gray-400">{t('onePhotoNote', lang)}</p>
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className={labelCls}>{t('itemName', lang)}</label>
                    <input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>{t('itemNameMr', lang)}</label>
                    <input value={draft.nameMr} onChange={(e) => set({ nameMr: e.target.value })} className={inputCls} />
                </div>

                {/* Category */}
                <div>
                    <label className={labelCls}>{t('pickCategory', lang)}</label>
                    {newCategoryMode ? (
                        <div className="flex gap-2">
                            <input
                                autoFocus
                                placeholder={t('newCategory', lang)}
                                value={draft.category}
                                onChange={(e) => set({ category: e.target.value })}
                                className={inputCls}
                            />
                            <button
                                type="button"
                                onClick={() => { setNewCategoryMode(false); set({ category: defaultCategory || categories[0] || '' }); }}
                                className="px-3 rounded-lg bg-gray-100 text-gray-600"
                                aria-label={t('cancel', lang)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <select
                            value={draft.category}
                            onChange={(e) => {
                                if (e.target.value === '__new__') { setNewCategoryMode(true); set({ category: '' }); }
                                else set({ category: e.target.value });
                            }}
                            className={`${inputCls} bg-white`}
                        >
                            {!draft.category && <option value="">—</option>}
                            {categories.map(c => <option key={c} value={c}>{translateCategory(c, lang)}</option>)}
                            {draft.category && !categories.includes(draft.category) && <option value={draft.category}>{draft.category}</option>}
                            <option value="__new__">+ {t('newCategory', lang)}</option>
                        </select>
                    )}
                </div>

                {/* Portions */}
                <div>
                    <span className={labelCls}>{t('portionsAndPrices', lang)}</span>
                    <div className="space-y-2">
                        {draft.options.map((o, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input
                                    placeholder={t('portionName', lang)}
                                    value={o.portion}
                                    onChange={(e) => setOption(idx, { portion: e.target.value })}
                                    className={`${inputCls} flex-1 min-w-0`}
                                />
                                <div className="relative w-28 shrink-0">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        placeholder="0"
                                        value={o.price}
                                        onChange={(e) => setOption(idx, { price: e.target.value })}
                                        className={`${inputCls} pl-7`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    disabled={draft.options.length === 1}
                                    onClick={() => setDraft(d => ({ ...d, options: d.options.filter((_, i) => i !== idx) }))}
                                    className="p-2 text-gray-400 disabled:opacity-30"
                                    aria-label="Remove portion"
                                >
                                    <Minus size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, options: [...d.options, { portion: '', price: '' }] }))}
                        className="mt-2 text-sm font-semibold text-orange-600 flex items-center gap-1"
                    >
                        <Plus size={16} /> {t('addPortion', lang)}
                    </button>
                </div>

                {/* Kitchen (only in Kitchen System mode) */}
                {kitchenMode && (
                    <div>
                        <label className={labelCls}>{t('kitchenField', lang)}</label>
                        <select
                            value={draft.kitchenId || ''}
                            onChange={(e) => set({ kitchenId: e.target.value || null })}
                            className={`${inputCls} bg-white`}
                        >
                            <option value="">— {t('noKitchenOption', lang)} —</option>
                            {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Visibility + layout */}
                <div className="rounded-xl border border-gray-200 divide-y">
                    <div className="flex items-center justify-between p-3">
                        <span className="font-medium text-gray-800">{t('showOnMenu', lang)}</span>
                        <Switch checked={!draft.isHidden} onChange={(v) => set({ isHidden: !v })} label={t('showOnMenu', lang)} />
                    </div>
                    <label className="flex items-center justify-between gap-3 p-3 text-sm text-gray-600">
                        <span>{t('ratePickerLabel', lang)}</span>
                        <input
                            type="checkbox"
                            checked={draft.ratePicker}
                            onChange={(e) => set({ ratePicker: e.target.checked })}
                            className="w-5 h-5 accent-orange-500"
                        />
                    </label>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

                {!isNew && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        className="w-full py-3 rounded-xl text-red-600 font-semibold border border-red-200 bg-red-50 flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> {t('deleteItem', lang)}
                    </button>
                )}
            </div>

            <div className="p-4 border-t bg-white flex gap-3">
                <button onClick={handleBack} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold">
                    {t('cancel', lang)}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className="flex-[2] py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {saving && <Loader2 size={18} className="animate-spin" />}
                    {t('saveItem', lang)}
                </button>
            </div>
        </>
    );
}

/* ---------- list screen ---------- */

export default function MenuManager({ lang, items, loadWarning, onItemsChange, onClose, kitchenMode = false, kitchens = [] }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState(null);
    const [editing, setEditing] = useState(null); // null = list, 'new' = add, item = edit
    const [busyId, setBusyId] = useState(null);
    const [listError, setListError] = useState('');

    const categories = useMemo(() => getCategories(items), [items]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items.filter(i =>
            (!category || i.category === category) &&
            (!q || i.name.toLowerCase().includes(q) || (i.nameMr || '').includes(q) || i.category.toLowerCase().includes(q))
        );
    }, [items, query, category]);

    const nextSortOrder = (items.reduce((m, i) => Math.max(m, i.sortOrder), 0) || 0) + 10;

    const toggleVisible = async (item, show) => {
        setListError('');
        setBusyId(item.id);
        const apply = (hidden) => onItemsChange(items.map(i => (i.id === item.id ? { ...i, isHidden: hidden } : i)));
        apply(!show); // optimistic
        try {
            await setMenuItemHidden(item.id, !show);
        } catch (err) {
            console.error(err);
            apply(item.isHidden); // roll back
            setListError(t('saveFailed', lang));
        } finally {
            setBusyId(null);
        }
    };

    const handleSaved = (saved) => {
        const exists = items.some(i => i.id === saved.id);
        onItemsChange(exists ? items.map(i => (i.id === saved.id ? saved : i)) : [...items, saved]);
        setEditing(null);
    };

    const handleDeleted = (id) => {
        onItemsChange(items.filter(i => i.id !== id));
        setEditing(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[34rem] h-[94vh] md:h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                {editing ? (
                    <ItemEditor
                        key={editing === 'new' ? 'new' : editing.id}
                        lang={lang}
                        item={editing === 'new' ? null : editing}
                        categories={categories}
                        defaultCategory={category || categories[0]}
                        nextSortOrder={nextSortOrder}
                        kitchenMode={kitchenMode}
                        kitchens={kitchens}
                        onSaved={handleSaved}
                        onDeleted={handleDeleted}
                        onBack={() => setEditing(null)}
                    />
                ) : (
                    <>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <UtensilsCrossed size={20} /> {t('updateMenu', lang)}
                                </h2>
                                <p className="text-xs text-gray-500 truncate">{t('menuSharedNote', lang)}</p>
                            </div>
                            <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                        </div>

                        <div className="p-4 pb-2 space-y-3 border-b">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={t('searchMenu', lang)}
                                        className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                </div>
                                <button
                                    onClick={() => setEditing('new')}
                                    className="px-4 rounded-lg bg-orange-500 text-white font-bold flex items-center gap-1 shrink-0"
                                >
                                    <Plus size={18} /> {t('addItem', lang)}
                                </button>
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                {[null, ...categories].map(c => (
                                    <button
                                        key={c ?? '__all__'}
                                        onClick={() => setCategory(c)}
                                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${category === c ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        {c ? translateCategory(c, lang) : t('allCategories', lang)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(loadWarning || listError) && (
                            <p className="mx-4 mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                {listError || t('menuLoadFailed', lang)}
                            </p>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {visible.length === 0 ? (
                                <p className="text-center text-gray-400 py-12">{t('noMenuItems', lang)}</p>
                            ) : (
                                visible.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => setEditing(item)}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer active:bg-gray-50 ${item.isHidden ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
                                    >
                                        <Thumb src={item.img} />
                                        <div className={`flex-1 min-w-0 ${item.isHidden ? 'opacity-50' : ''}`}>
                                            <p className="font-semibold text-gray-800 truncate">{translateItemName(item.name, lang)}</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {translateCategory(item.category, lang)} · <span className="text-orange-600 font-medium">{priceSummary(item, lang)}</span>
                                                {kitchenMode && (
                                                    <> · <span className="text-indigo-600 font-medium">{kitchens.find(k => k.id === item.kitchenId)?.name || '—'}</span></>
                                                )}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={!item.isHidden}
                                            disabled={busyId === item.id}
                                            onChange={(v) => toggleVisible(item, v)}
                                            label={t('showOnMenu', lang)}
                                        />
                                        <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                    </div>
                                ))
                            )}
                        </div>

                        <p className="px-4 py-2 text-xs text-gray-400 border-t text-center">
                            {visible.length} / {items.length} {t('itemsCount', lang)}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

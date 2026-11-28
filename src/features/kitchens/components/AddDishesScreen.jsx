import React, { useMemo, useState } from 'react';
import { Search, Check, Loader2 } from 'lucide-react';
import { t, translateCategory, translateItemName } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { getCategories } from '../../menu/utils/menuUtils';
import { assignItemsToKitchen } from '../../../services/kitchensService';
import { ScreenHeader, Thumb } from './kitchenUi';

// Kitchens -> (kitchen) -> Dishes -> Add dishes: pick menu items that are not in any kitchen yet.
export default function AddDishesScreen({ lang, kitchen, kitchens, items, onAssigned, onBack }) {
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
            <ScreenHeader lang={lang} onBack={onBack} trail={[ta('kTitle', lang), kitchen.name, ta('kDishesTitle', lang)]} title={ta('kAddDishes', lang)} />
            <p className="px-4 pt-3 text-xs text-gray-500">{ta('kAddDishesNote', lang)}</p>

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
                    {t('add', lang)} {selected.size > 0 ? `${selected.size} ` : ''}{ta('kDishWord', lang)}
                </button>
            </div>
        </>
    );
}


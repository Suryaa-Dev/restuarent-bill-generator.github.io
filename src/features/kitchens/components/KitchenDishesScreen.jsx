import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { t, translateCategory, translateItemName } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { unassignItem } from '../../../services/kitchensService';
import { ScreenHeader, Thumb } from './kitchenUi';

// Kitchens -> (kitchen) -> Dishes: the menu items whose orders go to this kitchen's screen.
export default function KitchenDishesScreen({ lang, kitchen, items, onItemsChange, onAddDishes, onBack }) {
    const [query, setQuery] = useState('');
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
            <ScreenHeader lang={lang} onBack={onBack} trail={[ta('kTitle', lang), kitchen.name]} title={ta('kDishesTitle', lang)} />

            <div className="p-4 pb-3 space-y-3 border-b">
                <p className="text-xs text-gray-500">{ta('kDishesNote', lang)}</p>
                <button
                    onClick={onAddDishes}
                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600"
                >
                    <Plus size={18} /> {ta('kAddDishes', lang)}
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
                    <p className="text-center text-gray-400 py-12 px-6">{totalMine === 0 ? ta('kNoDishes', lang) : t('noMenuItems', lang)}</p>
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

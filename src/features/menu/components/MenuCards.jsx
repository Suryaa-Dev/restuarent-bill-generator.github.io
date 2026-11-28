import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { t, translateCategory, translateItemName, translatePortion } from '../../../i18n/translations';

/* The home screen's menu look, shared so the same cards are used everywhere an item is picked
   (home menu, Update Token -> Add more). */

// Rate-picker items (Cold Drinks / Ice-cream) keep all their price points on one item; for the
// grid they are split into one standalone price button per price.
export const flattenRatePickerItems = (items) => {
    const out = [];
    items.forEach(item => {
        if (item.ratePicker) item.options.forEach(opt => out.push({ ...item, options: [opt] }));
        else out.push(item);
    });
    return out;
};

/* ---------------- Category Filter ---------------- */

// horizontal category filter (mobile)
export const CategoryPills = ({ categories, selectedCategory, onSelectCategory, lang, className = 'sticky top-0 z-40 bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto' }) => (
    <div className={className}>
        <button
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2 rounded-full ${selectedCategory === null ? 'bg-orange-500 text-white' : 'bg-gray-100'
                }`}
        >
            {t('fav', lang)}
        </button>

        {categories.map(cat => (
            <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100'
                    }`}
            >
                {translateCategory(cat, lang)}
            </button>
        ))}
    </div>
);

/* ---------------- Menu Item Card ---------------- */

// tap card = default portion, buttons = other portions
export const MenuItem = ({ item, onAddItem, currentQty, getQty, lang }) => {
    const displayName = translateItemName(item.name, lang);

    // Quick rate-picker layout: no photo, no shared wrapper card — each price is
    // its own standalone tappable button (used for Ice-cream where the
    // "portion" is really just a price tier, not a meaningful size label).
    // Expects a single-option item (see flattenRatePickerItems in the main App).
    if (item.ratePicker) {
        const opt = item.options[0];
        const qty = getQty ? getQty(item.name, opt.portion, item.category) : 0;
        return (
            <button
                onClick={() => onAddItem(item.name, opt.portion, opt.price, item.category)}
                className="relative bg-orange-50 rounded-lg border border-orange-200 flex items-center justify-center py-2.5 active:bg-orange-100"
            >
                <span className="text-orange-700 font-bold text-base">₹{opt.price}</span>
                {qty > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {qty}
                    </span>
                )}
            </button>
        );
    }

    const defaultOption = item.options[0]; // most ordered portion
    const hasMultipleOptions = item.options.length > 1;

    return (
        <div className="bg-white rounded-xl border border-gray-300 overflow-hidden flex flex-col h-60">
            <div
                onClick={() => onAddItem(item.name, defaultOption.portion, defaultOption.price, item.category)}
                className="cursor-pointer flex-1 flex flex-col"
            >
                {item.img ? (
                    <img src={item.img} alt={displayName} className="w-full h-28 object-cover" />
                ) : (
                    <div className="w-full h-28 bg-orange-50 flex items-center justify-center">
                        <UtensilsCrossed size={32} className="text-orange-300" />
                    </div>
                )}

                <div className="p-3 flex flex-col justify-between flex-1">
                    <h3 className="font-bold text-sm line-clamp-2">{displayName}</h3>

                    <div className="flex justify-between items-center">
                        <span className="text-orange-600 font-bold">₹{defaultOption.price}</span>

                        {currentQty > 0 && (
                            <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-bold">
                                {currentQty}x
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {hasMultipleOptions && (
                <div className="px-3 pb-3 flex gap-2">
                    {item.options.slice(1).map((opt, i) => {
                        const optQty = getQty ? getQty(item.name, opt.portion, item.category) : 0;
                        return (
                            <button
                                key={i}
                                onClick={() => onAddItem(item.name, opt.portion, opt.price, item.category)}
                                className="relative flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-200 active:bg-orange-100"
                            >
                                {translatePortion(opt.portion, lang)} ₹{opt.price}
                                {optQty > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                        {optQty}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
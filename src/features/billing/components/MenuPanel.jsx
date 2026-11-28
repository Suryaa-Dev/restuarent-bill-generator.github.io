import React from 'react';
import { t, translateCategory } from '../../../i18n/translations';
import { MenuItem } from '../../menu/components/MenuCards';

// Middle column: category pills (desktop) + the menu cards
export default function MenuPanel({ categories, selectedCategory, onSelectCategory, items, isRatePickerOnly, menuIsEmpty, onAddItem, getQty, lang }) {
    return (
        <div className="flex flex-col w-full md:w-[57%] border-r border-gray-300">

            {/* Desktop Category Pills */}
            <div className="hidden md:block sticky top-0 z-10 bg-white border-b px-4 py-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => onSelectCategory(null)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === null
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {t('fav', lang)}
                    </button>

                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => onSelectCategory(cat)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === cat
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {translateCategory(cat, lang)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            <div className={`flex-1 
                grid ${isRatePickerOnly ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'} 
                gap-3 md:gap-4 
                p-3 md:p-4 
                overflow-y-auto bg-white
                w-full`}
            >

                {items.length === 0 && (
                    <p className="col-span-full text-center text-gray-400 py-12">
                        {menuIsEmpty ? t('noMenuItems', lang) : t('noFavoritesYet', lang)}
                    </p>
                )}

                {items.map((item, idx) => (
                    <MenuItem
                        key={idx}
                        item={item}
                        onAddItem={onAddItem}
                        currentQty={getQty(item.name, item.options[0].portion, item.category)}
                        getQty={getQty}
                        lang={lang}
                    />
                ))}
            </div>
        </div>
    );
}

import React from 'react';
import { t } from '../../../i18n/translations';
import { CategoryPills } from '../../menu/components/MenuCards';

// Mobile "Home" tab: the big table button + category pills
export default function MobileTableBar({ selectedTable, total, onPickTable, categories, selectedCategory, onSelectCategory, lang }) {
    return (
        <>
            <div className="md:hidden sticky top-14 z-40 bg-white border-b px-4 py-2">
                <button
                    onClick={onPickTable}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-lg active:bg-orange-600 flex justify-between items-center px-6"
                >
                    <span>
                        {selectedTable ? `${t('tableLabel', lang)} ${selectedTable}` : t('selectTable', lang)}
                    </span>

                    {selectedTable && total > 0 && (
                        <span className="bg-white text-black px-3 py-1 rounded-xl font-bold text-lg">
                            ₹{total}
                        </span>
                    )}
                </button>
            </div>

            <div className="md:hidden">
                <CategoryPills categories={categories} selectedCategory={selectedCategory} onSelectCategory={onSelectCategory} lang={lang} />
            </div>
        </>
    );
}

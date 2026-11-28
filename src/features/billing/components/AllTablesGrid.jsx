import React from 'react';
import { Lock, ShoppingBag } from 'lucide-react';
import { t } from '../../../i18n/translations';

// overview of all tables with running totals
// three status dots (top-right of a table box): red = unsent items, orange = sent / not served,
// green = all served. Only the dot of the current status lights up, the others stay grey.
const STATUS_DOTS = [['red', 'bg-red-500'], ['orange', 'bg-orange-500'], ['green', 'bg-green-500']];

const AllTablesGrid = ({ tables, bills, parcels, statuses, lockedTables = {}, onTableClick, lang }) => {
    const getTableTotal = (tableNum) => {
        const bill = bills[tableNum] || [];
        return bill.reduce((sum, item) => sum + item.price * item.qty, 0);
    };

    const isTableEmpty = (tableNum) => {
        const bill = bills[tableNum] || [];
        return bill.length === 0;
    };

    return (
        // 20 tables = 4 per row x 5 rows. The grid takes exactly the free height (5 equal rows),
        // so every table is visible without scrolling on any phone size.
        <div className="flex-1 min-h-0 bg-white p-3">
            <div className="grid grid-cols-4 grid-rows-5 gap-2 h-full">
                {tables.map(num => {
                    const total = getTableTotal(num);
                    const empty = isTableEmpty(num);
                    const locked = !!lockedTables[num]; // another device has this table's cart open

                    return (
                        <button
                            key={num}
                            onClick={() => onTableClick(num)}
                            className={`relative min-h-0 border-2 rounded-xl px-1 pt-4 pb-6 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 ${locked ? 'bg-gray-100 border-red-200 opacity-60' : 'bg-gray-50 border-gray-200 active:bg-gray-100'}`}
                        >
                            {/* in use on another device */}
                            {locked && <Lock size={12} className="absolute top-1.5 left-1.5 text-red-500" aria-label="in use" />}

                            {/* status dots: pinned top-right */}
                            {statuses && (
                                <span className="absolute top-1.5 right-1.5 flex gap-0.5" aria-hidden="true">
                                    {STATUS_DOTS.map(([key, on]) => (
                                        <span key={key} className={`w-1.5 h-1.5 rounded-full ${statuses[num] === key ? on : 'bg-gray-300'}`} />
                                    ))}
                                </span>
                            )}

                            {/* table number + amount: always in the same place, with or without a parcel */}
                            <span className="text-lg font-bold text-gray-700 leading-none">T{num}</span>
                            {empty ? (
                                <span className="text-sm text-gray-400 leading-none">—</span>
                            ) : (
                                <span className="text-lg font-bold text-orange-600 leading-none">₹{total}</span>
                            )}

                            {/* parcel badge: pinned to the bottom, so it never pushes the number / amount around */}
                            {!empty && parcels[num] && (
                                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white bg-purple-600 rounded-full px-1.5 py-1 flex items-center gap-1 leading-none whitespace-nowrap">
                                    <ShoppingBag size={9} /> {t('parcelBadge', lang)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default AllTablesGrid;

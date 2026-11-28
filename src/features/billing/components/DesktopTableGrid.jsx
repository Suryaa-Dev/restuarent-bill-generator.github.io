import React from 'react';
import { ShoppingBag } from 'lucide-react';

const DesktopTableGrid = ({ tables, bills, parcels, selectedTable, onSelectTable }) => {
    const getTotal = (tableNum) => {
        const bill = bills[tableNum] || [];
        return bill.reduce((sum, item) => sum + item.price * item.qty, 0);
    };

    return (
        <div className="hidden md:block w-[18%] bg-white p-3 border-r border-gray-200 overflow-y-auto">

            <div className="grid grid-cols-2 gap-2">
                {tables.map(num => {
                    const total = getTotal(num);
                    const isSelected = selectedTable === num;

                    return (
                        <button
                            key={num}
                            onClick={() => onSelectTable(num)}
                            className={`relative aspect-square rounded-xl border p-2 flex flex-col 
                                items-center justify-center transition-all duration-150 select-none
                                ${isSelected
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-[1.04]'
                                    : total > 0
                                        ? 'bg-orange-50 text-gray-800 border-orange-200 shadow-sm hover:bg-orange-100'
                                        : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-300 shadow-sm'
                                }
                            `}
                        >

                            {total > 0 && parcels[num] && (
                                <span className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-1" title="Parcel">
                                    <ShoppingBag size={11} />
                                </span>
                            )}
                            <span className="text-base font-semibold">T{num}</span>

                            {total > 0 ? (
                                <span className="text-2xl font-bold mt-1">
                                    ₹{total}
                                </span>
                            ) : (
                                <span className="text-xs font-bold mt-1">
                                    Empty
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DesktopTableGrid;

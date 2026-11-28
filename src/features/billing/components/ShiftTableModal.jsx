import React, { useState } from 'react';
import { X } from 'lucide-react';
import { t } from '../../../i18n/translations';

// Lets staff move an entire order from one table to another. Occupied
// destination tables are shown but disabled — tapping one explains why
// instead of silently doing nothing or overwriting the other order.
const ShiftTableModal = ({ sourceTable, tables, bills, onShift, onClose, lang }) => {
    const [warnTable, setWarnTable] = useState(null);

    const isOccupied = (num) => (bills[num] || []).length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                    <div>
                        <h2 className="text-lg font-bold">{t('shiftOrderTitle', lang)}</h2>
                        <p className="text-xs text-gray-500">
                            {t('shiftOrderFrom', lang)} {sourceTable} {t('shiftOrderTo', lang)}
                        </p>
                    </div>
                    <button onClick={onClose}><X size={22} /></button>
                </div>

                {warnTable && (
                    <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                        {t('tableWordShort', lang)} {warnTable} {t('shiftOccupiedWarning', lang)}
                    </div>
                )}

                <div className="grid grid-cols-4 gap-2 p-4 overflow-y-auto">
                    {tables.filter(num => num !== sourceTable).map(num => {
                        const occupied = isOccupied(num);
                        return (
                            <button
                                key={num}
                                onClick={() => occupied ? setWarnTable(num) : onShift(num)}
                                className={`aspect-square rounded-xl font-bold flex items-center justify-center border-2 ${occupied
                                    ? 'bg-red-50 border-red-200 text-red-400'
                                    : 'bg-green-50 border-green-200 text-green-700 active:bg-green-100'
                                    }`}
                            >
                                {num}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ShiftTableModal;

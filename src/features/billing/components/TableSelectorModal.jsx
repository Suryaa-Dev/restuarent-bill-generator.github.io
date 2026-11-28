import React from 'react';
import { X } from 'lucide-react';
import { t } from '../../../i18n/translations';

// modal to select table before ordering
const TableSelectorModal = ({ tables, selectedTable, onSelectTable, onClose, lang }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center">
        <div className="bg-white w-full md:w-96 rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold">{t('selectTable', lang)}</h2>
                <button onClick={onClose}><X size={24} /></button>
            </div>

            <div className="grid grid-cols-4 gap-2 p-4 overflow-y-auto">
                {tables.map(num => (
                    <button
                        key={num}
                        onClick={() => { onSelectTable(num); onClose(); }}
                        className={`py-4 rounded-xl text-lg font-bold transition-all ${selectedTable === num
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                            }`}
                    >
                        T{num}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export default TableSelectorModal;

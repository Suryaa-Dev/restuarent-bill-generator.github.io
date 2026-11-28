import React from 'react';
import { Lock } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { ts } from '../../../i18n/serveExtra';

// The table's cart is open on another device: cancel, or open it anyway (nobody is thrown out).
export default function TableBusyDialog({ table, lang, onCancel, onContinue }) {
    return (
        <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-6" onClick={onCancel}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><Lock size={20} /></span>
                    <div>
                        <h3 className="font-bold text-lg leading-snug">{ts('tableBusyTitle', lang).replace('{n}', table)}</h3>
                        <p className="text-sm text-gray-600 mt-1">{ts('tableBusyWarn', lang)}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-800 font-bold active:bg-gray-200">
                        {t('cancel', lang)}
                    </button>
                    <button onClick={onContinue} className="flex-1 h-12 rounded-xl bg-orange-500 text-white font-bold active:bg-orange-600">
                        {ts('continueAnyway', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { tx } from '../../i18n/kdsExtra';

/* Opened from the pencil icon beside the token number (shown once any dish is served).
   The customer was not happy and sent a dish back: reduce its quantity here.
   The reduced plates leave the token and the bill. Nothing is sent to / changed on the KDS.
   onSave(actions) -> actions = [{ idx, newQty }]  (idx = position in token.items; newQty 0 = remove the line) */
export default function EditServedModal({ token, lang, onSave, onClose }) {
    const rows = useMemo(
        () => token.items.map((it, idx) => ({ it, idx })).filter(r => !r.it.removed && r.it.served),
        [token]
    );
    const [qty, setQty] = useState(() => Object.fromEntries(rows.map(r => [r.idx, r.it.qty])));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const step = (idx, max, d) => setQty(q => ({ ...q, [idx]: Math.min(max, Math.max(0, q[idx] + d)) }));

    const actions = rows
        .filter(r => qty[r.idx] < r.it.qty)
        .map(r => ({ idx: r.idx, newQty: qty[r.idx] }));

    const save = async () => {
        if (!actions.length || saving) return;
        setSaving(true);
        setError('');
        try {
            await onSave(actions);
            onClose();
        } catch (e) {
            console.error(e);
            setError(t('tokenSaveFailed', lang));
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[28rem] max-h-[90vh] rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-4 pt-4 pb-1">
                    <h2 className="text-xl font-bold truncate">
                        {tx('editServedTitle', lang)} <span className="text-blue-600">#{token.tokenNo}</span>
                    </h2>
                    <button onClick={onClose} className="p-1 -mr-1 shrink-0" aria-label={t('close', lang)}><X size={24} /></button>
                </div>
                <p className="px-4 pb-3 text-sm text-gray-500 border-b">{tx('editServedHint', lang)}</p>

                <div className="flex-1 overflow-y-auto px-4">
                    {rows.map(({ it, idx }) => {
                        const cur = qty[idx];
                        const removed = cur === 0;
                        const changed = cur < it.qty;
                        return (
                            <div key={idx} className="py-3 border-b flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className={`font-semibold leading-snug ${removed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                        {translateItemName(it.name, lang)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {translatePortion(it.portion, lang)} · {it.qty}{changed && <span className="text-red-600 font-semibold"> → {cur}</span>}
                                    </p>
                                    {removed && <p className="text-xs font-semibold text-red-600">{tx('editRemovedLabel', lang)}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => step(idx, it.qty, -1)}
                                        disabled={cur === 0}
                                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 disabled:opacity-30"
                                    ><Minus size={18} /></button>
                                    <span className="font-bold w-7 text-center text-lg">{cur}</span>
                                    <button
                                        onClick={() => step(idx, it.qty, 1)}
                                        disabled={cur >= it.qty}
                                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 disabled:opacity-30"
                                    ><Plus size={18} /></button>
                                </div>
                            </div>
                        );
                    })}
                    {error && <p className="my-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                </div>

                <div className="border-t p-4">
                    <button
                        onClick={save}
                        disabled={!actions.length || saving}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40"
                    >
                        {saving ? t('savingChanges', lang) : actions.length ? t('saveChanges', lang) : tx('editPickOne', lang)}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
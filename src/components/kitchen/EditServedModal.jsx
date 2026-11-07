import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ban, RotateCcw, Minus, Plus } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { tx } from '../../i18n/kdsExtra';

/* Edit a token whose dishes are ALL served (customer complained about the food).
   Every served line gets two icon buttons:
     [Cancel]  the dish is dropped from the token AND from the bill
     [Renew]   the dish goes back to the kitchen queue (KDS alerts the chef); the bill is unchanged
   For lines with qty > 1 a small stepper picks how many plates are affected.
   onSave(actions) -> actions = [{ idx, mode: 'cancel' | 'renew', n }]  (idx = position in token.items) */
export default function EditServedModal({ token, lang, onSave, onClose }) {
    const rows = useMemo(
        () => token.items.map((it, idx) => ({ it, idx })).filter(r => !r.it.removed && r.it.served),
        [token]
    );
    const [sel, setSel] = useState({}); // idx -> { mode, n }
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const pick = (idx, mode, qty) => setSel(s => {
        if (s[idx]?.mode === mode) { const { [idx]: _gone, ...rest } = s; return rest; } // tap again = undo
        return { ...s, [idx]: { mode, n: s[idx]?.n ?? qty } };
    });
    const setN = (idx, n, qty) => setSel(s => (s[idx] ? { ...s, [idx]: { ...s[idx], n: Math.min(qty, Math.max(1, n)) } } : s));

    const actions = Object.entries(sel).map(([idx, v]) => ({ idx: Number(idx), mode: v.mode, n: v.n }));
    const cancelCount = actions.filter(a => a.mode === 'cancel').length;
    const renewCount = actions.filter(a => a.mode === 'renew').length;

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
                        const cur = sel[idx];
                        return (
                            <div key={idx} className="py-3 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold leading-snug ${cur?.mode === 'cancel' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                            {translateItemName(it.name, lang)}
                                        </p>
                                        <p className="text-sm text-gray-500">{translatePortion(it.portion, lang)} · ×{it.qty}</p>
                                    </div>

                                    <button
                                        onClick={() => pick(idx, 'cancel', it.qty)}
                                        aria-pressed={cur?.mode === 'cancel'}
                                        aria-label={tx('actCancelLong', lang)}
                                        className={`w-[64px] h-14 shrink-0 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${cur?.mode === 'cancel' ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-red-200 text-red-600 active:bg-red-50'}`}
                                    >
                                        <Ban size={20} />
                                        <span className="text-[10px] font-bold leading-none">{tx('actCancel', lang)}</span>
                                    </button>
                                    <button
                                        onClick={() => pick(idx, 'renew', it.qty)}
                                        aria-pressed={cur?.mode === 'renew'}
                                        aria-label={tx('actRenewLong', lang)}
                                        className={`w-[64px] h-14 shrink-0 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${cur?.mode === 'renew' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-600 active:bg-amber-50'}`}
                                    >
                                        <RotateCcw size={20} />
                                        <span className="text-[10px] font-bold leading-none">{tx('actRenew', lang)}</span>
                                    </button>
                                </div>

                                {cur && (
                                    <p className={`mt-1.5 text-xs font-semibold ${cur.mode === 'cancel' ? 'text-red-600' : 'text-amber-700'}`}>
                                        {cur.mode === 'cancel' ? tx('actCancelLong', lang) : tx('actRenewLong', lang)}
                                    </p>
                                )}

                                {cur && it.qty > 1 && (
                                    <div className="mt-2 flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{tx('qtyAffected', lang)}</span>
                                        <button onClick={() => setN(idx, cur.n - 1, it.qty)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"><Minus size={16} /></button>
                                        <span className="font-bold w-6 text-center">{cur.n}</span>
                                        <button onClick={() => setN(idx, cur.n + 1, it.qty)} className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center active:bg-orange-600"><Plus size={16} /></button>
                                        <span className="text-sm text-gray-400">/ {it.qty}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {error && <p className="my-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                </div>

                <div className="border-t p-4 space-y-2">
                    {cancelCount > 0 && <p className="text-xs text-gray-500">{tx('editCancelBillNote', lang)}</p>}
                    <button
                        onClick={save}
                        disabled={!actions.length || saving}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40"
                    >
                        {saving
                            ? t('savingChanges', lang)
                            : actions.length
                                ? `${t('saveChanges', lang)} (${[
                                    cancelCount ? `${cancelCount} ${tx('editSummaryCancel', lang)}` : '',
                                    renewCount ? `${renewCount} ${tx('editSummaryRenew', lang)}` : '',
                                ].filter(Boolean).join(' · ')})`
                                : tx('editPickOne', lang)}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
import React, { useState } from 'react';
import { Check, Pencil, Ban, ShoppingBag, ChefHat } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';

const fmtTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    });
};

const Chip = ({ className = '', children }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 leading-tight ${className}`}>
        {children}
    </span>
);

/* ---------- one token card ---------- */

function TokenCard({ token, lang, onToggleServed, onCancel, onUpdate }) {
    const cancelled = token.status === 'cancelled';
    const liveItems = token.items.filter(i => !i.removed);
    const allServed = !cancelled && liveItems.length > 0 && liveItems.every(i => i.served);
    const live = !cancelled && !allServed;

    const frame = cancelled
        ? 'border-gray-200 bg-gray-50'
        : allServed
            ? 'border-green-300 bg-green-50/40'
            : 'border-orange-200 bg-white';

    return (
        <div className={`rounded-2xl border-2 overflow-hidden ${frame}`}>
            {/* header: #T7_02 ............ time */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
                <div className="min-w-0">
                    <p className={`text-lg font-extrabold leading-tight ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        #{token.tokenNo}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {token.isParcel && (
                            <Chip className="bg-purple-600 text-white"><ShoppingBag size={10} /> {t('parcelBadge', lang)}</Chip>
                        )}
                        {cancelled && <Chip className="bg-red-100 text-red-700">{t('tokenCancelled', lang)}</Chip>}
                        {!cancelled && token.revision > 0 && (
                            <Chip className="bg-amber-100 text-amber-800">{t('tokenUpdated', lang)}{token.revision > 1 ? ` ×${token.revision}` : ''}</Chip>
                        )}
                        {allServed && <Chip className="bg-green-600 text-white"><Check size={10} /> {t('tokenCompleted', lang)}</Chip>}
                    </div>
                </div>
                <span className="text-xs text-gray-500 shrink-0 pt-1">{fmtTime(token.createdAt)}</span>
            </div>

            {/* items: item_name  quantity  portion  [Serve] */}
            <div className="divide-y divide-black/5 border-t border-black/5">
                {token.items.map((it, idx) => {
                    const dim = it.removed || cancelled;
                    const note = it.removed
                        ? t('itemRemoved', lang)
                        : it.change === 'replaced'
                            ? `${t('itemReplaced', lang)}${it.replacedFrom ? ` · ${t('replacedFrom', lang)} ${it.replacedFrom}` : ''}`
                            : it.change === 'added'
                                ? t('itemNew', lang)
                                : it.change === 'qty' && it.prevQty != null
                                    ? `${t('itemQtyChanged', lang)} ${it.prevQty}→${it.qty}`
                                    : null;
                    return (
                        <div key={idx} className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <p className={`flex-1 min-w-0 font-semibold text-sm leading-snug ${dim ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    {translateItemName(it.name, lang)}
                                </p>
                                <span className={`w-8 shrink-0 text-center font-bold text-base ${dim ? 'text-gray-400' : 'text-gray-800'}`}>
                                    {it.qty}
                                </span>
                                <span className={`w-12 shrink-0 text-xs ${dim ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {translatePortion(it.portion, lang)}
                                </span>

                                {/* ACT button: Serve -> Served */}
                                {it.removed || (cancelled && !it.served) ? (
                                    <span className="w-[76px] shrink-0" />
                                ) : cancelled ? (
                                    <span className="w-[76px] shrink-0 text-center text-xs font-bold text-green-700">{t('served', lang)}</span>
                                ) : it.served ? (
                                    <button
                                        onClick={() => onToggleServed(token.id, idx)}
                                        className="w-[76px] h-10 shrink-0 rounded-xl bg-green-100 text-green-700 border border-green-300 text-xs font-bold flex items-center justify-center gap-1 active:bg-green-200"
                                    >
                                        <Check size={14} /> {t('served', lang)}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onToggleServed(token.id, idx)}
                                        className="w-[76px] h-10 shrink-0 rounded-xl bg-orange-500 text-white text-xs font-bold active:bg-orange-600"
                                    >
                                        {t('serve', lang)}
                                    </button>
                                )}
                            </div>
                            {/* only shown when the order was changed after firing, so the kitchen notices */}
                            {note && <p className={`text-[11px] font-semibold mt-0.5 ${it.removed ? 'text-red-600' : 'text-amber-700'}`}>{note}</p>}
                        </div>
                    );
                })}
            </div>

            {/* footer actions */}
            {live && (
                <div className="flex gap-2 p-3 border-t border-black/5">
                    <button
                        onClick={() => onCancel(token)}
                        className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 bg-white font-bold text-sm flex items-center justify-center gap-1.5 active:bg-red-50"
                    >
                        <Ban size={16} /> {t('cancelToken', lang)}
                    </button>
                    <button
                        onClick={() => onUpdate(token)}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:bg-blue-700"
                    >
                        <Pencil size={16} /> {t('updateToken', lang)}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ---------- list (LIFO: newest token first) ---------- */

export default function TokensPanel({ tokens, lang, onToggleServed, onCancel, onUpdate }) {
    const sorted = [...tokens].sort((a, b) => b.seq - a.seq);

    return (
        <div className="space-y-3">
            {sorted.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <ChefHat size={44} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm px-6">{t('noTokensYet', lang)}</p>
                </div>
            ) : (
                sorted.map(tk => (
                    <TokenCard
                        key={tk.id}
                        token={tk}
                        lang={lang}
                        onToggleServed={onToggleServed}
                        onCancel={onCancel}
                        onUpdate={onUpdate}
                    />
                ))
            )}
        </div>
    );
}

/* ---------- cancel confirmation (own modal so we can offer "also remove from bill") ---------- */

export function CancelTokenModal({ token, lang, onConfirm, onClose }) {
    const [removeFromBill, setRemoveFromBill] = useState(true);
    const [busy, setBusy] = useState(false);
    const hasUnserved = token.items.some(i => !i.removed && !i.served);
    const hasServed = token.items.some(i => !i.removed && i.served);

    const go = async () => {
        setBusy(true);
        try { await onConfirm(removeFromBill && hasUnserved); } finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl p-5 space-y-4">
                <div>
                    <h2 className="text-lg font-bold">{t('cancelTokenTitle', lang)} <span className="text-red-600">#{token.tokenNo}</span></h2>
                    <p className="text-sm text-gray-500 mt-1">{t('cancelTokenDesc', lang)}</p>
                </div>

                {hasUnserved && (
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                        <input
                            type="checkbox"
                            checked={removeFromBill}
                            onChange={(e) => setRemoveFromBill(e.target.checked)}
                            className="w-5 h-5 mt-0.5 accent-red-600 shrink-0"
                        />
                        <span className="text-sm text-gray-800">
                            {t('removeFromBillToo', lang)}
                            {hasServed && <span className="block text-xs text-gray-500 mt-0.5">{t('servedItemsStay', lang)}</span>}
                        </span>
                    </label>
                )}

                <div className="flex gap-3">
                    <button onClick={onClose} disabled={busy} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold">
                        {t('keepToken', lang)}
                    </button>
                    <button onClick={go} disabled={busy} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-60">
                        {t('cancelToken', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, ShoppingCart, Send, HandPlatter, Receipt, Clock } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../../../i18n/translations';
import { ts } from '../../../../i18n/serveExtra';
import { buildLiveTimeline, buildHistoryTimeline } from '../../utils/serviceTimeline';

/* "i" button next to the table number in the cart: a time-stamped record of the order, so a
   disputed wait can be settled with facts. Each token is listed separately, so the same dish
   sent twice (2 Manchurian, later 3 Manchurian) shows two different sets of times.        */

const TIME = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
const clock = (v) => (v ? new Date(v).toLocaleTimeString('en-IN', TIME).toUpperCase() : '—');
const span = (from, to) => {
    if (!from || !to) return null;
    const s = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h > 0 ? `${h}h ${m}m ${String(r).padStart(2, '0')}s` : `${m}m ${String(r).padStart(2, '0')}s`;
};

const Step = ({ icon: Icon, label, time, gap, tone = 'text-gray-800' }) => (
    <div className="flex items-center gap-2 text-sm">
        <Icon size={14} className="text-gray-400 shrink-0" />
        <span className="text-gray-500 w-24 shrink-0">{label}</span>
        <span className={`font-semibold tabular-nums ${tone}`}>{time}</span>
        {gap && <span className="text-xs text-gray-400 tabular-nums">+{gap}</span>}
    </div>
);

// `history` = item_timeline rows of a CLEARED bill (Order History); otherwise the live bill + tokens are used (cart drawer)
export default function ServiceTimeModal({ table, bill, tokens, history, lang, onClose }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(id);
    }, []);

    const tl = useMemo(() => (history ? buildHistoryTimeline(history) : buildLiveTimeline(bill, tokens)), [bill, tokens, history]);
    const cleared = !!history;
    const nowIso = new Date(now).toISOString();

    const servedTimes = tl.groups.flatMap(g => g.items).filter(i => i.servedAt).map(i => Date.parse(i.servedAt));
    const firstServed = servedTimes.length ? new Date(Math.min(...servedTimes)).toISOString() : null;
    const empty = tl.groups.length === 0 && tl.waiting.length === 0;

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-end justify-center" onClick={onClose}>
            <div className="bg-white w-full rounded-t-3xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Clock size={20} /> {t('tableLabel', lang)} {table} · {ts('serviceTimes', lang)}
                    </h2>
                    <button onClick={onClose} aria-label={t('close', lang)} className="p-1"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {empty && <p className="text-center text-gray-400 py-12">{ts(cleared ? 'noTimesHistory' : 'noTimes', lang)}</p>}

                    {!empty && (
                        <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3 space-y-1.5">
                            <Step icon={ShoppingCart} label={ts('orderStarted', lang)} time={clock(tl.orderStart)} />
                            <Step icon={HandPlatter} label={ts('firstServed', lang)} time={clock(firstServed)} gap={span(tl.orderStart, firstServed)} />
                            {cleared ? (
                                <Step icon={Receipt} label={ts('billCleared', lang)} time={clock(tl.clearedAt)} gap={span(tl.orderStart, tl.clearedAt)} />
                            ) : (
                                <Step icon={Receipt} label={ts('billCleared', lang)} time={ts('notClearedYet', lang)} tone="text-gray-400" />
                            )}
                            <p className="pt-1 text-xs font-bold text-orange-700">
                                {cleared ? `${ts('timeAtTable', lang)}: ${span(tl.orderStart, tl.clearedAt) || '—'}` : `${ts('elapsed', lang)}: ${span(tl.orderStart, nowIso)}`}
                            </p>
                        </div>
                    )}

                    {tl.groups.map(g => (
                        <div key={g.id} className={`rounded-2xl border-2 overflow-hidden ${g.cancelled ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                                <span className="font-extrabold text-gray-900">#{g.tokenNo}</span>
                                <span className="flex items-center gap-2 text-xs">
                                    {g.isParcel && <span className="font-bold text-white bg-purple-600 rounded-full px-2 py-0.5">{t('parcelBadge', lang)}</span>}
                                    {g.cancelled && <span className="font-bold text-red-600">{ts('cancelledLabel', lang)}</span>}
                                    <span className="text-gray-500">{ts('sentAt', lang)} {clock(g.sentAt)}</span>
                                </span>
                            </div>
                            <div className="divide-y">
                                {g.items.map((it, i) => (
                                    <div key={i} className="p-3 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-bold text-gray-900">
                                                {translateItemName(it.name, lang)} <span className="text-gray-500 font-medium">{translatePortion(it.portion, lang)}</span>
                                            </p>
                                            <span className="font-extrabold text-orange-600 shrink-0">×{it.qty}</span>
                                        </div>
                                        <Step icon={ShoppingCart} label={ts('addedToCart', lang)} time={clock(it.cartAt)} />
                                        <Step icon={Send} label={ts('tokenSent', lang)} time={clock(it.sentAt)} gap={span(it.cartAt, it.sentAt)} />
                                        {it.served ? (
                                            <Step icon={Check} label={ts('served', lang)} time={clock(it.servedAt)} gap={span(it.sentAt, it.servedAt)} tone="text-green-700" />
                                        ) : !g.cancelled && (cleared ? (
                                            <Step icon={HandPlatter} label={ts('served', lang)} time={ts('notMarkedServed', lang)} tone="text-gray-400" />
                                        ) : (
                                            <Step icon={HandPlatter} label={ts('served', lang)} time={`${ts('waiting', lang)} ${span(it.sentAt, nowIso)}`} tone="text-amber-600" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {tl.waiting.length > 0 && (
                        <div className="rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden">
                            <p className="px-3 py-2 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wide">{ts(cleared ? 'neverSent' : 'notSentYet', lang)}</p>
                            <div className="divide-y">
                                {tl.waiting.map((w, i) => (
                                    <div key={i} className="p-3 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-bold text-gray-900">
                                                {translateItemName(w.name, lang)} <span className="text-gray-500 font-medium">{translatePortion(w.portion, lang)}</span>
                                            </p>
                                            <span className="font-extrabold text-orange-600 shrink-0">×{w.qty}</span>
                                        </div>
                                        <Step icon={ShoppingCart} label={ts('addedToCart', lang)} time={clock(w.cartAt)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
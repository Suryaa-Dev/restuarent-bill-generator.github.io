import React from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { BORDER, DOT, ageColor } from '../../lib/kds';

const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
});

// tell the kitchen when a line was changed after the token was fired
const changeNote = (it, lang) => {
    if (it.change === 'replaced') return `${t('itemReplaced', lang)}${it.replacedFrom ? ` · ${t('replacedFrom', lang)} ${it.replacedFrom}` : ''}`;
    if (it.change === 'added') return t('itemNew', lang);
    if (it.change === 'qty' && it.prevQty != null) return `${t('itemQtyChanged', lang)} ${it.prevQty}→${it.qty}`;
    return null;
};

/*  lines: [{ item, pending }]  — only the lines to show.
    isBold(item) lets a caller emphasise the selected item / category.      */
export default function KdsTokenCard({ token, lines, oldest, now, timer, isBold, lang, showParcel }) {
    const color = ageColor(oldest, now, timer);
    return (
        <div className={`rounded-xl border-2 bg-white overflow-hidden ${BORDER[color]}`}>
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-gray-50 border-b">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[color]}`} />
                    <span className="font-extrabold text-sm text-gray-900 truncate">#{token.tokenNo}</span>
                    {showParcel && token.isParcel && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-purple-600 text-white">
                            <ShoppingBag size={10} /> {t('parcelBadge', lang)}
                        </span>
                    )}
                </div>
                <span className="text-[11px] text-gray-500 shrink-0">{fmtTime(token.createdAt)}</span>
            </div>

            <div className="divide-y divide-black/5">
                {lines.map(({ item: it, pending }, i) => {
                    const bold = isBold ? isBold(it) : false;
                    const note = pending ? changeNote(it, lang) : null;
                    return (
                        <div key={i} className={`px-2.5 py-1.5 ${pending ? '' : 'opacity-45'}`}>
                            <div className="flex items-center gap-2 text-sm">
                                <span className={`flex-1 min-w-0 leading-snug ${bold ? 'font-extrabold text-gray-900' : 'font-medium text-gray-800'} ${pending ? '' : 'line-through'}`}>
                                    {translateItemName(it.name, lang)}
                                </span>
                                <span className={`w-7 text-center shrink-0 ${bold ? 'font-extrabold' : 'font-bold'}`}>{it.qty}</span>
                                <span className={`w-11 shrink-0 text-xs ${bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{translatePortion(it.portion, lang)}</span>
                                {!pending && <Check size={14} className="text-green-600 shrink-0" />}
                            </div>
                            {note && <p className="text-[10px] font-semibold text-amber-700">{note}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

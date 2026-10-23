import React from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { BORDER, ageColor } from '../../lib/kds';
import { AgeText } from './KdsBox';

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
export default function KdsTokenCard({ token, lines, oldest, now, timer, isBold, lang }) {
    const color = ageColor(oldest, now, timer);
    return (
        <div className={`rounded-2xl border-2 bg-white overflow-hidden shadow-sm ${BORDER[color]}`}>
            {/* who + how long */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-extrabold text-lg text-gray-900 truncate">#{token.tokenNo}</span>
                    {token.isParcel && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 border border-purple-300 text-purple-700 bg-white">
                            <ShoppingBag size={11} /> {t('parcelBadge', lang)}
                        </span>
                    )}
                </div>
                <div className="text-right leading-tight shrink-0">
                    <AgeText oldest={oldest} now={now} colorKey={color} lang={lang} className="text-sm" />
                    <p className="text-[11px] text-gray-400">{fmtTime(token.createdAt)}</p>
                </div>
            </div>

            {/* item · qty · portion */}
            <div className="divide-y divide-gray-100">
                {lines.map(({ item: it, pending }, i) => {
                    const bold = isBold ? isBold(it) : false;
                    const note = pending ? changeNote(it, lang) : null;
                    return (
                        <div key={i} className={`px-3.5 py-2 ${bold ? 'bg-gray-50' : ''} ${pending ? '' : 'opacity-40'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`flex-1 min-w-0 text-[15px] leading-snug ${bold ? 'font-extrabold' : 'font-semibold'} text-gray-900 ${pending ? '' : 'line-through'}`}>
                                    {translateItemName(it.name, lang)}
                                </span>
                                <span className="w-9 text-center shrink-0 text-xl font-extrabold tabular-nums text-gray-900">{it.qty}</span>
                                <span className={`w-14 shrink-0 text-sm ${bold ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>{translatePortion(it.portion, lang)}</span>
                                {!pending && <Check size={16} className="text-green-600 shrink-0" />}
                            </div>
                            {note && <p className="text-xs font-semibold text-amber-700 mt-0.5">{note}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
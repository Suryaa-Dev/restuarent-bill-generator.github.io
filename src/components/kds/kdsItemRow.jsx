import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { translateItemName, translatePortion } from '../../i18n/translations';
import { BORDER, portionList } from '../../lib/kds';
import { CustomRowBadge } from './CustomBadge';

/* Shortens a long two-word name so both words stay recognisable on one line:
     "Schezwan Rice" -> "Sche. Rice"     "Hakka Noodles" -> "Hak. Noodles"
     "Paneer Chilli" -> "Pan. Chilli"    "Fried Rice"    -> "Fried Rice" (short enough)
   Only the FIRST word is trimmed. Non-Latin text (Marathi) is left alone and simply
   ellipsised by the row, because cutting Devanagari by letters would break the characters. */
export function shortName(name) {
    const text = (name || '').trim();
    const words = text.split(/\s+/);
    if (words.length < 2 || text.length <= 11 || !/^[\x20-\x7E]+$/.test(text)) return text;
    const first = words[0];
    if (first.length <= 4) return text;
    const cut = first.length >= 7 ? 4 : 3;
    return [`${first.slice(0, cut)}.`, ...words.slice(1)].join(' ');
}

/* One-line item row for a rush: NAME (big, bold)  [customised badge]  [arrow]  QTY (very big) + portion tag.
   The border colour carries the timer. The row fills the height its parent gives it (AllTab sizes
   the rows so at least four fit on a landscape phone without scrolling).                          */
export default function KdsItemRow({ name, entry, options, colorKey, flag, onClick, lang }) {
    const list = portionList(entry.portions, options, false);
    const full = translateItemName(name, lang);
    const up = flag?.dir === 'up';
    const Icon = up ? ArrowUp : ArrowDown;
    const custom = (entry.custom || 0) > 0; // some pending portion has preparation instructions
    return (
        <button
            onClick={onClick}
            title={full}
            className={`w-full h-full min-h-[30px] flex items-center gap-2 bg-white rounded-lg border-2 px-2.5 text-left active:bg-gray-50 ${BORDER[colorKey || 'none']}`}
        >
            <span className="flex-1 min-w-0 truncate text-[17px] leading-none font-extrabold text-gray-900">{shortName(full)}</span>
            {custom && <CustomRowBadge lang={lang} />}
            {flag && (
                <span className={`shrink-0 flex items-center text-[13px] font-extrabold tabular-nums ${up ? 'text-green-600' : 'text-red-600'}`}>
                    <Icon size={13} strokeWidth={3} />{flag.n}
                </span>
            )}
            <span className="shrink-0 flex items-center gap-2.5">
                {list.map(([p, q]) => (
                    <span key={p} className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-[22px] leading-none font-black tabular-nums text-gray-900">{q}</span>
                        <span className="text-[12px] leading-none font-bold text-gray-700 bg-gray-100 rounded px-1.5 py-1">{translatePortion(p, lang)}</span>
                    </span>
                ))}
            </span>
        </button>
    );
}
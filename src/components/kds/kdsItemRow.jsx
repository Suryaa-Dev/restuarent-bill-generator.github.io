import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { translateItemName, translatePortion } from '../../i18n/translations';
import { BORDER, portionList } from '../../lib/kds';

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

// One-line item row: name · (arrow) · quantity + portion.  The border colour carries the timer.
export default function KdsItemRow({ name, entry, options, colorKey, flag, onClick, lang }) {
    const list = portionList(entry.portions, options, false);
    const full = translateItemName(name, lang);
    const up = flag?.dir === 'up';
    const Icon = up ? ArrowUp : ArrowDown;
    return (
        <button
            onClick={onClick}
            title={full}
            className={`w-full flex items-center gap-2 bg-white rounded-lg border-2 px-2 py-1 text-left active:bg-gray-50 ${BORDER[colorKey || 'none']}`}
        >
            <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-gray-900">{shortName(full)}</span>
            {flag && (
                <span className={`shrink-0 flex items-center text-[11px] font-extrabold tabular-nums ${up ? 'text-green-600' : 'text-red-600'}`}>
                    <Icon size={11} strokeWidth={3} />{flag.n}
                </span>
            )}
            <span className="shrink-0 flex items-baseline gap-2">
                {list.map(([p, q]) => (
                    <span key={p} className="whitespace-nowrap">
                        <span className="text-[15px] font-extrabold tabular-nums text-gray-900">{q}</span>
                        <span className="text-[10px] font-medium text-gray-500 ml-0.5">{translatePortion(p, lang)}</span>
                    </span>
                ))}
            </span>
        </button>
    );
}
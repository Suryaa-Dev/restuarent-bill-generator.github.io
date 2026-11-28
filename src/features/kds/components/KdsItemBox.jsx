import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { translateItemName, translatePortion } from '../../../i18n/translations';
import { BORDER, portionList } from '../utils/kds';
import { shortName } from './KdsItemRow';
import { CustomBoxBadge } from './CustomBadge';

/* Small item box for the part below the four main boxes (2 per row, 4 fit a column without scrolling):

        ┌─ ✓ ───────── ▲2 ┐   <- badges sit ON the border (customised dish, quantity change flag)
        │ Tadka Manch.     │   <- item name
        │ ┌────┐  ┌────┐   │
        │ │ 0  │  │ 2  │   │   <- Half box, Full box (zero stays visible but faded)
        │ └─ H ┘  └─ F ┘   │
        └──────────────────┘

   The border colour is the timer urgency colour. A box exists only while the dish has pending quantity. */

// Half always comes first, then Full, then any other portion in menu order
const rank = (p, i) => (p === 'Half' ? -2 : p === 'Full' ? -1 : i);

// one-letter tag under each quantity: H / F (Marathi: हा / फु); other portions use their first letter
const tag = (p, lang) => {
    if (p === 'Half') return lang === 'mr' ? 'हा' : 'H';
    if (p === 'Full') return lang === 'mr' ? 'फु' : 'F';
    return (Array.from(translatePortion(p, lang) || p)[0] || '').toUpperCase();
};

export default function KdsItemBox({ name, entry, options, colorKey, flag, onClick, lang }) {
    const full = translateItemName(name, lang);
    const list = portionList(entry.portions, options, true)
        .map(([p, q], i) => ({ p, q, r: rank(p, i) }))
        .sort((a, b) => a.r - b.r);
    const custom = (entry.custom || 0) > 0;
    const up = flag?.dir === 'up';
    const FlagIcon = up ? ArrowUp : ArrowDown;

    return (
        <button
            onClick={onClick}
            title={full}
            className={`relative min-w-0 bg-white rounded-lg border-2 px-1.5 pt-1.5 pb-1 text-left active:bg-gray-50 ${BORDER[colorKey || 'none']}`}
        >
            {custom && <CustomBoxBadge small lang={lang} />}
            {flag && (
                <span className={`absolute -top-2 right-1.5 z-20 flex items-center rounded-full bg-white px-1 text-[11px] font-extrabold leading-4 tabular-nums shadow-sm ${up ? 'text-green-600' : 'text-red-600'}`}>
                    <FlagIcon size={11} strokeWidth={3} />{flag.n}
                </span>
            )}

            <span className="block truncate text-[13px] leading-[14px] font-extrabold text-gray-900">{shortName(full)}</span>

            <span className={`mt-[3px] grid gap-1 ${list.length >= 3 ? 'grid-cols-3' : list.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {list.map(({ p, q }) => (
                    <span key={p} className="rounded-md border border-gray-200 bg-gray-50 py-px text-center">
                        <span className={`block text-[17px] leading-[17px] font-black tabular-nums ${q > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{q}</span>
                        <span className="block text-[9px] leading-[9px] font-bold text-gray-500">{tag(p, lang)}</span>
                    </span>
                ))}
            </span>
        </button>
    );
}

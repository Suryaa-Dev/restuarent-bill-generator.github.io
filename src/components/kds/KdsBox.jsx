import React, { useState } from 'react';
import { ArrowUp, ArrowDown, UtensilsCrossed } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { BORDER, FILL, TEXT, ageMinutes, portionList } from '../../lib/kds';

const SIZE = {
    // main boxes: size follows BOTH width and height so it always fits a short landscape phone
    xl: { num: 'text-[clamp(1.6rem,min(4.4vw,10vh),3rem)]', label: 'text-[clamp(.7rem,1.4vw,.95rem)]', gap: 'gap-4 md:gap-7' },
    lg: { num: 'text-[clamp(1.5rem,3.4vw,2.4rem)]', label: 'text-xs md:text-sm', gap: 'gap-5 md:gap-8' },
};

// Quantities as big numbers with a small portion label underneath.
//   6      3
//  Half   Full
export function PortionBlocks({ portions, options, showZero, lang, size = 'lg', align = 'center' }) {
    const list = portionList(portions, options, showZero);
    const s = SIZE[size];
    if (list.length === 0) return <span className="text-2xl text-gray-300">—</span>;
    return (
        <div className={`flex items-end ${align === 'start' ? 'justify-start' : 'justify-center'} ${s.gap}`}>
            {list.map(([p, q]) => (
                <div key={p} className={`flex flex-col ${align === 'start' ? 'items-start' : 'items-center'}`}>
                    <span className={`${s.num} font-extrabold tabular-nums leading-none ${q === 0 ? 'text-gray-300' : 'text-gray-900'}`}>{q}</span>
                    <span className={`${s.label} font-medium mt-1 leading-none ${q === 0 ? 'text-gray-300' : 'text-gray-500'}`}>{translatePortion(p, lang)}</span>
                </div>
            ))}
        </div>
    );
}

// compact "6 Half  3 Full" for the small category cards — wraps instead of overflowing
function PortionInline({ portions, options, lang }) {
    const list = portionList(portions, options, false);
    return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            {list.map(([p, q]) => (
                <span key={p} className="whitespace-nowrap">
                    <span className="text-xl font-extrabold tabular-nums text-gray-900">{q}</span>{' '}
                    <span className="text-[11px] font-medium text-gray-500">{translatePortion(p, lang)}</span>
                </span>
            ))}
        </div>
    );
}

// "12 min" in the timer colour — plain text (used on token cards / item page)
export function AgeText({ oldest, now, colorKey, lang, className = '' }) {
    if (!Number.isFinite(oldest)) return null;
    return (
        <span className={`font-semibold tabular-nums ${TEXT[colorKey || 'none']} ${className}`}>
            {ageMinutes(oldest, now)} {t('kdsMin', lang)}
        </span>
    );
}

// time badge: same pill as the quantity badge on the billing cards, sitting on the top-left corner
function AgeBadge({ oldest, now, colorKey, lang, small }) {
    if (!Number.isFinite(oldest)) return null;
    return (
        <span className={`absolute z-20 flex items-center justify-center rounded-full text-white font-bold tabular-nums shadow ${FILL[colorKey || 'none']} ${small ? '-top-2 left-2 h-[18px] px-1.5 text-[10px]' : '-top-2.5 left-3 h-5 px-2 text-[11px] md:h-6 md:text-xs'}`}>
            {ageMinutes(oldest, now)} {t('kdsMin', lang)}
        </span>
    );
}

// arrow badge: ↑3 added / ↓2 cancelled, on the top-right corner
function FlagBadge({ flag, small }) {
    if (!flag) return null;
    const up = flag.dir === 'up';
    const Icon = up ? ArrowUp : ArrowDown;
    return (
        <span className={`absolute z-20 flex items-center gap-0.5 rounded-full bg-white border font-extrabold tabular-nums shadow-sm ${small ? '-top-2 right-2 h-[18px] px-1.5 text-[10px]' : '-top-2.5 right-3 h-5 px-2 text-[11px] md:h-6 md:text-xs'} ${up ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}`}>
            <Icon size={small ? 10 : 13} strokeWidth={3} />
            {flag.n}
        </span>
    );
}

// the dish photo as a soft backdrop: pinned right, fading out to the left, low opacity,
// so the name and quantities (left) always stay the clearest thing on the box
function Backdrop({ img }) {
    const [broken, setBroken] = useState(false);
    const fade = 'linear-gradient(to left, #000 20%, transparent 95%)';
    return (
        <div aria-hidden className="absolute inset-0 rounded-[14px] overflow-hidden pointer-events-none">
            {img && !broken ? (
                <img
                    src={img}
                    alt=""
                    loading="lazy"
                    onError={() => setBroken(true)}
                    className="absolute right-0 top-0 h-full w-[90%] object-cover opacity-[0.46]"
                    style={{ WebkitMaskImage: fade, maskImage: fade }}
                />
            ) : (
                <UtensilsCrossed className="absolute -right-3 -bottom-3 text-gray-100" size={92} strokeWidth={1.5} />
            )}
        </div>
    );
}

export default function KdsBox({ name, entry, options, colorKey, flag, small, showZero, onClick, lang, now, img }) {
    const border = BORDER[colorKey || 'none'];

    if (small) {
        return (
            <button
                onClick={onClick}
                disabled={!onClick}
                className={`relative w-full bg-white text-left rounded-xl border-2 shadow-sm px-2.5 pt-3 pb-2 ${border} ${onClick ? 'active:bg-gray-50' : ''}`}
            >
                {entry && <AgeBadge oldest={entry.oldest} now={now} colorKey={colorKey} lang={lang} small />}
                <FlagBadge flag={flag} small />
                <span className="block text-[13px] font-semibold leading-snug text-gray-900 line-clamp-2 mb-1">{translateItemName(name, lang)}</span>
                <PortionInline portions={entry?.portions} options={options} lang={lang} />
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`relative w-full bg-white text-left rounded-2xl border-2 shadow-sm h-[32vh] min-h-[124px] ${border} ${onClick ? 'active:bg-gray-50' : ''}`}
        >
            <Backdrop img={img} />
            {entry && <AgeBadge oldest={entry.oldest} now={now} colorKey={colorKey} lang={lang} />}
            <FlagBadge flag={flag} />
            <div className="relative z-10 h-full flex flex-col justify-between p-3 pt-4">
                {/* shrink-0: the name must never be squeezed out by the quantities */}
                <span className="shrink-0 font-bold text-gray-900 leading-tight line-clamp-2 text-[clamp(.95rem,2.2vw,1.4rem)]">
                    {translateItemName(name, lang)}
                </span>
                <PortionBlocks portions={entry?.portions} options={options} showZero={showZero} lang={lang} size="xl" align="start" />
            </div>
        </button>
    );
}
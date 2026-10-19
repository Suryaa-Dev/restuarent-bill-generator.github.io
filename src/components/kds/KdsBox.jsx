import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { BORDER, portionList } from '../../lib/kds';

// "6 Half | 2 Full"
export function PortionsText({ portions, options, showZero, lang, className = '' }) {
    const list = portionList(portions, options, showZero);
    if (list.length === 0) return <span className="text-gray-300">—</span>;
    return (
        <span className={className}>
            {list.map(([p, q], i) => (
                <React.Fragment key={p}>
                    {i > 0 && <span className="mx-1 text-gray-400 font-normal">|</span>}
                    <span className={q === 0 ? 'text-gray-300' : ''}>{q} {translatePortion(p, lang)}</span>
                </React.Fragment>
            ))}
        </span>
    );
}

// small corner indicator: green ↑n (added) / red ↓n (cancelled)
function FlagBadge({ flag, small }) {
    if (!flag) return null;
    const up = flag.dir === 'up';
    const Icon = up ? ArrowUp : ArrowDown;
    return (
        <span className={`absolute top-1 right-1.5 flex items-center font-extrabold ${small ? 'text-[10px]' : 'text-sm md:text-lg'} ${up ? 'text-green-600' : 'text-red-600'}`}>
            <Icon size={small ? 11 : 18} strokeWidth={3} />
            {flag.n}
        </span>
    );
}

export default function KdsBox({ name, entry, options, colorKey, flag, small, showZero, onClick, lang }) {
    const border = BORDER[colorKey || 'none'];
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`relative w-full bg-white flex flex-col items-center justify-center text-center ${small
                ? `rounded-md border-2 p-1.5 min-h-[56px]`
                : `rounded-xl border-4 p-2 h-[27vh] min-h-[92px]`} ${border} ${onClick ? 'active:bg-gray-50' : ''} transition-colors`}
        >
            <FlagBadge flag={flag} small={small} />
            <span className={`font-semibold leading-tight text-gray-900 ${small ? 'text-[11px]' : 'text-[clamp(1rem,2.6vw,1.9rem)]'}`}>
                {translateItemName(name, lang)}
            </span>
            <PortionsText
                portions={entry?.portions}
                options={options}
                showZero={showZero}
                lang={lang}
                className={`font-extrabold text-gray-900 leading-tight ${small ? 'text-[11px] mt-0.5' : 'text-[clamp(.9rem,2.3vw,1.75rem)] mt-1'}`}
            />
        </button>
    );
}

export const emptySlotLabel = (lang) => t('kdsSlotEmpty', lang);

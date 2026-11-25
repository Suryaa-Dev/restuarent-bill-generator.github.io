import React from 'react';
import { ListChecks } from 'lucide-react';
import { ts } from '../../i18n/serveExtra';

/* "This item has customised portions" marker, used on KDS boxes, item rows and token cards.

   Solid indigo (the same colour the modifier names use everywhere) with a white ListChecks icon.
   A small, softly blurred white highlight travels around its edge (.kds-orbit in index.css);
   with reduced motion it stands still. The boxes themselves have no animation.            */

const BASE = 'kds-orbit flex items-center justify-center rounded-full bg-indigo-600 text-white border-2 border-indigo-600 shadow-sm';

// KDS box: absolutely positioned at a FIXED spot to the right of the timer badge, so it never moves
// when the timer is missing or its text gets longer ("9 min" -> "120 min").
export function CustomBoxBadge({ small, lang }) {
    return (
        <span
            title={ts('customizedItem', lang)}
            aria-label={ts('customizedItem', lang)}
            className={`${BASE} absolute z-20 ${small ? '-top-2 left-[3.6rem] h-[18px] w-6' : '-top-2.5 left-[5rem] h-5 w-7 md:h-6 md:w-8'}`}
        >
            <ListChecks size={small ? 11 : 13} strokeWidth={2.75} />
        </span>
    );
}

// token card header, next to the timer
export function CustomInlineBadge({ lang }) {
    return (
        <span title={ts('customizedItem', lang)} aria-label={ts('customizedItem', lang)} className={`${BASE} relative h-6 w-7 shrink-0`}>
            <ListChecks size={14} strokeWidth={2.75} />
        </span>
    );
}

// one-line item row (below the boxes)
export function CustomRowBadge({ lang }) {
    return (
        <span title={ts('customizedItem', lang)} aria-label={ts('customizedItem', lang)} className={`${BASE} relative h-5 w-6 shrink-0`}>
            <ListChecks size={12} strokeWidth={2.75} />
        </span>
    );
}
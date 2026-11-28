import React from 'react';
import { ChefHat } from 'lucide-react';
import { translateCategory, translateItemName, translatePortion } from '../../../i18n/translations';
import { tb } from '../../../i18n/batchExtra';
import { ageColor, BORDER, DOT, TEXT } from '../utils/kds';

const minutesBetween = (from, to) => Math.max(1, Math.round((to - from) / 60000));
const unitLabel = (u, lang) => `T${u.tableNumber}${u.isParcel ? ` · ${tb('parcel', lang)}` : ''}`;

// Portion-wise quantity, e.g. 3H | 2F  (Half / Full ...). Letters come from the portion name; if two
// portions would share a letter, more letters are used so they stay distinguishable.
const PORTION_ORDER = ['quarter', 'small', 'half', 'medium', 'regular', 'full', 'large'];
const rankOf = (p) => { const i = PORTION_ORDER.indexOf(String(p).toLowerCase()); return i < 0 ? 99 : i; };

export function portionTags(portions, lang) {
    const entries = Object.entries(portions || {}).filter(([, n]) => n > 0)
        .sort(([a], [b]) => rankOf(a) - rankOf(b) || String(a).localeCompare(String(b)));
    const labels = entries.map(([p]) => [...String(translatePortion(p, lang) || '').trim()]);
    let len = 1;
    while (len < 6) {
        const heads = labels.map(l => l.slice(0, len).join('').toUpperCase());
        if (new Set(heads).size === heads.length) break;
        len += 1;
    }
    return entries.map(([, n], i) => ({ n, tag: labels[i].slice(0, len).join('').toUpperCase() }));
}

function QtyByPortion({ portions, qty, lang }) {
    const tags = portionTags(portions, lang);
    return (
        <div className="text-right shrink-0 flex items-baseline justify-end gap-1.5 text-3xl font-extrabold text-gray-900 tabular-nums leading-none" aria-label={`${qty}`}>
            {tags.length === 0 ? qty : tags.map((x, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="text-gray-300 font-bold">|</span>}
                    <span>{x.n}<span className="text-xl font-bold text-gray-500">{x.tag}</span></span>
                </React.Fragment>
            ))}
        </div>
    );
}

// who the plates are for: T3 ×3 · T2 ×2 · T5 · Parcel ×1 — each coloured by how long THAT order has waited
function Units({ units, now, timer, lang }) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
            {units.map(u => {
                const c = ageColor(u.since, now, timer);
                return (
                    <span key={u.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-sm font-semibold tabular-nums ${u.isParcel ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DOT[c]}`} />
                        {unitLabel(u, lang)} <span className="text-gray-500 font-bold">×{u.qty}</span>
                    </span>
                );
            })}
        </div>
    );
}

function Header({ badge, badgeTone, name, category, qty, lang, portions }) {
    return (
        <div className="flex items-start gap-3">
            <span className={`shrink-0 min-w-[2.25rem] h-9 px-2 rounded-full text-sm font-extrabold tabular-nums flex items-center justify-center ${badgeTone}`}>{badge}</span>
            <div className="flex-1 min-w-0">
                <p className="text-lg font-extrabold text-gray-900 leading-tight truncate">{translateItemName(name, lang)}</p>
                {category && <p className="text-xs text-gray-400 truncate">{translateCategory(category, lang)}</p>}
            </div>
            <QtyByPortion portions={portions} qty={qty} lang={lang} />
        </div>
    );
}

const URGENCY_LABEL = { green: 'urgGreen', yellow: 'urgYellow', orange: 'urgOrange', red: 'urgRed', none: 'urgGreen' };
const BADGE = {
    none: 'bg-gray-200 text-gray-700', green: 'bg-green-500 text-white', yellow: 'bg-amber-400 text-gray-900',
    orange: 'bg-orange-500 text-white', red: 'bg-red-600 text-white',
};

/* one recommended dish: rank, what to cook, for whom, how urgent */
function RecommendationCard({ rec, now, timer, lang }) {
    const color = ageColor(rec.oldestSince, now, timer);
    const mins = minutesBetween(rec.oldestSince, now);
    return (
        <div className={`bg-white rounded-2xl border-2 p-3.5 flex flex-col ${BORDER[color]}`}>
            <Header badge={`${rec.rank}`} badgeTone={BADGE[color]} name={rec.name} category={rec.category} qty={rec.qty} portions={rec.portions} lang={lang} />
            <Units units={rec.units} now={now} timer={timer} lang={lang} />
            <p className="mt-2.5 text-xs text-gray-500 flex flex-wrap items-center gap-x-1.5">
                <span className={`inline-flex items-center gap-1 font-bold ${TEXT[color]}`}>
                    <span className={`w-2 h-2 rounded-full ${DOT[color]}`} /> {tb(URGENCY_LABEL[color], lang)}
                </span>
                <span>·</span>
                <span>{rec.coverage} {tb(rec.coverage === 1 ? 'tableWaiting' : 'tablesWaiting', lang)}</span>
                <span>·</span>
                <span className={`font-semibold ${TEXT[color]}`}>{tb('waitingMin', lang, { n: mins })}</span>
            </p>
        </div>
    );
}

// colour key: what each urgency colour means for this kitchen's timer
function Legend({ timer, lang }) {
    const items = [
        ['green', tb('legendUpTo', lang, { n: timer.green })],
        ['yellow', tb('legendUpTo', lang, { n: timer.yellow })],
        ['orange', tb('legendUpTo', lang, { n: timer.orange })],
        ['red', tb('legendOver', lang, { n: timer.orange })],
    ];
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {items.map(([c, label]) => (
                <span key={c} className="inline-flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${DOT[c]}`} /> {label}</span>
            ))}
        </div>
    );
}

/* Batches tab = cooking order. Cook from the top; quantities per table are on the All tab.
   No buttons: nothing here changes an order. */
export default function BatchesTab({ batches, timer, lang }) {
    const { recs, now } = batches;
    return (
        <div className="h-full flex flex-col">
            <div className="shrink-0 px-3 md:px-4 pt-3 pb-2 space-y-1.5">
                <p className="text-sm font-bold text-gray-800">{tb('cookOrderTitle', lang)}</p>
                <p className="text-xs text-gray-500">{tb('cookOrderNote', lang)}</p>
                <Legend timer={timer} lang={lang} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 pb-6">
                {recs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
                        <ChefHat size={44} className="mb-3 opacity-50" />
                        <p>{tb('emptyRecommended', lang)}</p>
                    </div>
                ) : (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 items-start">
                        {recs.map(rec => <RecommendationCard key={rec.key} rec={rec} now={now} timer={timer} lang={lang} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

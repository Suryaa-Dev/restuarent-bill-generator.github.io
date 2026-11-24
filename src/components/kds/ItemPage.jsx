import React, { useMemo } from 'react';
import { ArrowLeft, Utensils, ShoppingBag } from 'lucide-react';
import { ageColor, aggregate, customSummary, portionList, BORDER } from '../../lib/kds';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { ts } from '../../i18n/serveExtra';
import { AgeText, PortionBlocks } from './KdsBox';
import KdsTokenCard from './KdsTokenCard';

const byAge = (a, b) => a.token.createdAt.localeCompare(b.token.createdAt) || a.token.seq - b.token.seq;

// Tables = blue, Parcel = purple (the app's parcel colour) — a soft tinted panel + icon chip,
// so the two columns are told apart at a glance. Timer colours stay on the white cards inside.
const THEME = {
    table: { panel: 'bg-blue-50 border-blue-100', chip: 'bg-blue-100 text-blue-700', text: 'text-blue-700', Icon: Utensils },
    parcel: { panel: 'bg-purple-50 border-purple-100', chip: 'bg-purple-100 text-purple-700', text: 'text-purple-700', Icon: ShoppingBag },
};

// Customization Summary: per modifier, the outstanding portions that carry it (Half and Full kept apart).
// A portion with two modifiers counts under both, so these are not item quantities.
function CustomSummary({ rows, options, lang }) {
    if (!rows || rows.length === 0) return null;
    return (
        <div className="shrink-0 mt-2 max-h-36 overflow-y-auto rounded-xl border border-indigo-100 bg-white/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 mb-1">{ts('customizationSummary', lang)}</p>
            <ul className="space-y-0.5">
                {rows.map(r => (
                    <li key={r.mod} className="flex items-baseline justify-between gap-2 text-[13px] leading-snug">
                        <span className="font-bold text-gray-900 truncate">{r.mod}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-gray-700">
                            {portionList(r.portions, options, false).map(([p, q]) => `${q} ${translatePortion(p, lang)}`).join(' | ')}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Column({ kind, entry, options, now, timer, lang, children, empty, summary }) {
    const th = THEME[kind];
    const color = entry ? ageColor(entry.oldest, now, timer) : 'none';
    return (
        <div className={`flex flex-col min-w-0 min-h-0 rounded-2xl border p-2.5 ${th.panel}`}>
            {/* one compact row: icon (tables = blue, parcel = purple) · totals · oldest wait. It never scrolls. */}
            <div className="shrink-0 flex items-center gap-2">
                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${th.chip}`}><th.Icon size={17} /></span>
                <div className={`flex-1 min-w-0 rounded-xl border-2 bg-white shadow-sm px-2.5 py-1 ${BORDER[color]}`}>
                    <PortionBlocks portions={entry?.portions} options={options} showZero lang={lang} size="md" />
                </div>
                {entry && <AgeText oldest={entry.oldest} now={now} colorKey={color} lang={lang} className="text-sm shrink-0" />}
            </div>

            <CustomSummary rows={summary} options={options} lang={lang} />

            {/* only this list scrolls */}
            <div className="mt-2 flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-1">
                {empty ? <p className="text-center text-sm text-gray-400 py-8">{t('kdsNothingPending', lang)}</p> : children}
            </div>
        </div>
    );
}

export default function ItemPage({ itemKey: key, name, lines, menuByKey, now, timer, lang, onServe, onBack }) {
    const options = menuByKey.get(key)?.options?.map(o => o.portion) || [];

    const mine = useMemo(() => lines.filter(l => l.key === key), [lines, key]);
    const split = useMemo(() => {
        const group = (parcel) => {
            const m = new Map();
            mine.filter(l => !!l.token.isParcel === parcel).forEach(l => {
                if (!m.has(l.token.id)) m.set(l.token.id, { token: l.token, lines: [], oldest: Infinity });
                const e = m.get(l.token.id);
                e.lines.push(l);
                e.oldest = Math.min(e.oldest, l.enteredAt);
            });
            return [...m.values()].sort(byAge);
        };
        return { table: group(false), parcel: group(true) };
    }, [mine]);

    const tableSummary = useMemo(() => customSummary(mine.filter(l => !l.token.isParcel)), [mine]);
    const parcelSummary = useMemo(() => customSummary(mine.filter(l => l.token.isParcel)), [mine]);
    const tableAgg = aggregate(mine.filter(l => !l.token.isParcel)).get(key);
    const parcelAgg = aggregate(mine.filter(l => l.token.isParcel)).get(key);

    return (
        <div className="h-full flex flex-col">
            {/* back to the main KDS screen + selected item name */}
            <div className="relative flex items-center justify-center px-3 md:px-4 pt-2 pb-0 shrink-0">
                <button
                    onClick={onBack}
                    className="absolute left-3 md:left-4 flex items-center gap-1.5 pl-2.5 pr-4 h-10 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-800 shadow-sm active:bg-gray-100"
                    aria-label={t('kdsBackToAll', lang)}
                >
                    <ArrowLeft size={18} /> {t('kdsBackToAll', lang)}
                </button>
                <h2 className="text-2xl font-bold text-gray-900 truncate px-28">{translateItemName(name, lang)}</h2>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 md:gap-4 p-3 pt-2 md:p-4">
                {/* Tables: token number + only the selected item */}
                <Column kind="table" entry={tableAgg} options={options} now={now} timer={timer} lang={lang} summary={tableSummary} empty={split.table.length === 0}>
                    {split.table.map(g => (
                        <KdsTokenCard
                            key={g.token.id}
                            token={g.token}
                            oldest={g.oldest}
                            now={now}
                            timer={timer}
                            lang={lang}
                            showTime={false}
                            lines={g.lines.map(l => ({ item: l.item, pending: true, idx: l.idx }))}
                            onServe={onServe ? (idx) => onServe(g.token.id, idx) : undefined}
                        />
                    ))}
                </Column>

                {/* Parcel: the whole token's pending items, selected item in bold */}
                <Column kind="parcel" entry={parcelAgg} options={options} now={now} timer={timer} lang={lang} summary={parcelSummary} empty={split.parcel.length === 0}>
                    {split.parcel.map(g => {
                        const all = lines.filter(l => l.token.id === g.token.id);
                        return (
                            <KdsTokenCard
                                key={g.token.id}
                                token={g.token}
                                oldest={g.oldest}
                                now={now}
                                timer={timer}
                                lang={lang}
                                showTime={false}
                                lines={all.map(l => ({ item: l.item, pending: true, idx: l.idx }))}
                                onServe={onServe ? (idx) => onServe(g.token.id, idx) : undefined}
                                isBold={(it) => `${it.name}||${it.category || ''}` === key}
                            />
                        );
                    })}
                </Column>
            </div>
        </div>
    );
}
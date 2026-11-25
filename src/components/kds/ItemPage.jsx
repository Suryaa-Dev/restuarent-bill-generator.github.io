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
// One single row (scrolls sideways if there are many): "Spicy 1 Half · Extra Gravy 1 Half | 1 Full"
function CustomSummary({ rows, options, lang }) {
    if (!rows || rows.length === 0) return null;
    return (
        <div className="shrink-0 mt-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rows.map(r => (
                <span key={r.sig} className="shrink-0 inline-flex items-baseline gap-1.5 rounded-full border border-indigo-100 bg-white px-3 py-1 text-[13px] leading-snug">
                    <span className="font-bold text-gray-900">{r.mods.join(', ')}</span>
                    <span className="font-semibold tabular-nums text-indigo-700">
                        {portionList(r.portions, options, false).map(([p, q]) => `${q} ${translatePortion(p, lang)}`).join(' | ')}
                    </span>
                </span>
            ))}
        </div>
    );
}

function Column({ kind, entry, options, now, timer, lang, children, empty, summary }) {
    const th = THEME[kind];
    const color = entry ? ageColor(entry.oldest, now, timer) : 'none';
    return (
        <div className={`flex flex-col min-w-0 min-h-0 rounded-2xl border p-2.5 ${th.panel}`}>
            {/* one compact row: icon (tables = blue, parcel = purple) · totals. The wait time is on each token. */}
            <div className="shrink-0 flex items-center gap-2">
                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${th.chip}`}><th.Icon size={17} /></span>
                <div className={`flex-1 min-w-0 rounded-xl border-2 bg-white shadow-sm px-2.5 py-1 ${BORDER[color]}`}>
                    <PortionBlocks portions={entry?.portions} options={options} showZero lang={lang} size="md" />
                </div>
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
            {/* the Back button lives in the top bar (KitchenDisplay), so the page starts right at the columns */}
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 md:gap-4 p-3 md:p-4">
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
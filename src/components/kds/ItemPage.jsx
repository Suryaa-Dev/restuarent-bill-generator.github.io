import React, { useMemo } from 'react';
import { ArrowLeft, Utensils, ShoppingBag } from 'lucide-react';
import { ageColor, aggregate, BORDER } from '../../lib/kds';
import { t, translateItemName } from '../../i18n/translations';
import { AgeText, PortionBlocks } from './KdsBox';
import KdsTokenCard from './KdsTokenCard';

const byAge = (a, b) => a.token.createdAt.localeCompare(b.token.createdAt) || a.token.seq - b.token.seq;

// Tables = blue, Parcel = purple (the app's parcel colour) — a soft tinted panel + icon chip,
// so the two columns are told apart at a glance. Timer colours stay on the white cards inside.
const THEME = {
    table: { panel: 'bg-blue-50 border-blue-100', chip: 'bg-blue-100 text-blue-700', text: 'text-blue-700', Icon: Utensils },
    parcel: { panel: 'bg-purple-50 border-purple-100', chip: 'bg-purple-100 text-purple-700', text: 'text-purple-700', Icon: ShoppingBag },
};

function Column({ kind, title, count, entry, options, now, timer, lang, children, empty }) {
    const th = THEME[kind];
    const color = entry ? ageColor(entry.oldest, now, timer) : 'none';
    return (
        <div className={`flex flex-col min-w-0 min-h-0 rounded-2xl border p-2.5 ${th.panel}`}>
            <div className="shrink-0 flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${th.chip}`}><th.Icon size={16} /></span>
                <p className={`text-sm font-bold uppercase tracking-wide ${th.text}`}>
                    {title} <span className="font-semibold opacity-70">· {count}</span>
                </p>
                {entry && <AgeText oldest={entry.oldest} now={now} colorKey={color} lang={lang} className="text-sm ml-auto" />}
            </div>

            {/* totals: fixed, they never scroll */}
            <div className={`shrink-0 rounded-xl border-2 bg-white shadow-sm px-3 py-2 ${BORDER[color]}`}>
                <PortionBlocks portions={entry?.portions} options={options} showZero lang={lang} size="lg" />
            </div>

            {/* only this list scrolls */}
            <div className="mt-2.5 flex-1 min-h-0 overflow-y-auto space-y-2.5 pb-1">
                {empty ? <p className="text-center text-sm text-gray-400 py-8">{t('kdsNothingPending', lang)}</p> : children}
            </div>
        </div>
    );
}

export default function ItemPage({ itemKey: key, name, lines, menuByKey, now, timer, lang, onBack }) {
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
                <Column kind="table" title={t('kdsTables', lang)} count={split.table.length} entry={tableAgg} options={options} now={now} timer={timer} lang={lang} empty={split.table.length === 0}>
                    {split.table.map(g => (
                        <KdsTokenCard
                            key={g.token.id}
                            token={g.token}
                            oldest={g.oldest}
                            now={now}
                            timer={timer}
                            lang={lang}
                            lines={g.lines.map(l => ({ item: l.item, pending: true }))}
                        />
                    ))}
                </Column>

                {/* Parcel: the whole token's pending items, selected item in bold */}
                <Column kind="parcel" title={t('kdsParcel', lang)} count={split.parcel.length} entry={parcelAgg} options={options} now={now} timer={timer} lang={lang} empty={split.parcel.length === 0}>
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
                                lines={all.map(l => ({ item: l.item, pending: true }))}
                                isBold={(it) => `${it.name}||${it.category || ''}` === key}
                            />
                        );
                    })}
                </Column>
            </div>
        </div>
    );
}
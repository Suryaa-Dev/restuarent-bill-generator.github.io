import React, { useMemo } from 'react';
import { ageColor, aggregate, BORDER } from '../../lib/kds';
import { t } from '../../i18n/translations';
import { PortionsText } from './KdsBox';
import KdsTokenCard from './KdsTokenCard';

const byAge = (a, b) => a.token.createdAt.localeCompare(b.token.createdAt) || a.token.seq - b.token.seq;

function Column({ title, entry, options, now, timer, lang, children, empty }) {
    const color = entry ? ageColor(entry.oldest, now, timer) : 'none';
    return (
        <div className="flex flex-col min-w-0">
            <div className={`rounded-xl border-4 bg-white text-center py-2 px-2 ${BORDER[color]}`}>
                <p className="text-sm md:text-lg font-semibold text-gray-700">{title}</p>
                <PortionsText portions={entry?.portions} options={options} showZero lang={lang} className="text-[clamp(.95rem,2.4vw,1.8rem)] font-extrabold text-gray-900" />
            </div>
            <div className="mt-3 space-y-2.5">
                {empty ? <p className="text-center text-sm text-gray-300 py-6">{t('kdsNothingPending', lang)}</p> : children}
            </div>
        </div>
    );
}

export default function ItemPage({ itemKey: key, lines, menuByKey, now, timer, lang }) {
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
        <div className="grid grid-cols-2 gap-3 p-3">
            {/* Tables: token number + only the selected item */}
            <Column title={t('kdsTables', lang)} entry={tableAgg} options={options} now={now} timer={timer} lang={lang} empty={split.table.length === 0}>
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
            <Column title={t('kdsParcel', lang)} entry={parcelAgg} options={options} now={now} timer={timer} lang={lang} empty={split.parcel.length === 0}>
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
    );
}

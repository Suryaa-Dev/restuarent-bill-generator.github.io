import React, { useMemo } from 'react';
import { t } from '../../i18n/translations';
import { ageColor, itemKey } from '../../lib/kds';
import KdsBox from './KdsBox';

const optionsOf = (menuByKey, key) => menuByKey.get(key)?.options?.map(o => o.portion) || [];

export default function AllTab({ config, agg, menuByKey, flags, now, lang, onOpen }) {
    const featuredKeys = useMemo(() => new Set(config.featured.map(itemKey)), [config.featured]);
    const groupedKeys = useMemo(() => new Set(config.groups.flatMap(g => g.items.map(itemKey))), [config.groups]);

    // pending items that no box / category claims still need to be visible
    const others = useMemo(
        () => [...agg.values()].filter(e => !featuredKeys.has(e.key) && !groupedKeys.has(e.key)),
        [agg, featuredKeys, groupedKeys]
    );

    const columns = [
        ...config.groups.map(g => ({
            id: g.id,
            name: g.name,
            entries: g.items.map(itemKey).map(k => agg.get(k)).filter(Boolean), // box only while it has pending qty
        })),
        ...(others.length > 0 ? [{ id: '__other', name: t('kdsOther', lang), entries: others }] : []),
    ];

    const slots = Array.from({ length: 4 }, (_, i) => config.featured[i] || null);
    // phones: one compact card per row in every category column (two per row only on wide screens)
    const boxesPerRow = 'grid-cols-1 min-[1000px]:grid-cols-2';

    return (
        <div className="h-full flex flex-col gap-4 p-3 md:p-4">
            {/* Part 1 — main boxes (always shown, fixed: they never scroll) */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 shrink-0">
                {slots.map((it, i) => {
                    if (!it) {
                        return (
                            <div key={i} className="rounded-2xl border-2 border-dashed border-gray-300 h-[32vh] min-h-[124px] flex items-center justify-center text-center text-xs text-gray-400 px-3">
                                {config.featured.length === 0 && i === 0 ? t('kdsSetupBoxes', lang) : ''}
                            </div>
                        );
                    }
                    const key = itemKey(it);
                    const entry = agg.get(key);
                    return (
                        <KdsBox
                            key={key}
                            name={it.name}
                            entry={entry}
                            options={optionsOf(menuByKey, key)}
                            showZero
                            colorKey={entry ? ageColor(entry.oldest, now, config.timer) : 'none'}
                            flag={flags[key]}
                            img={menuByKey.get(key)?.img}
                            onClick={() => onOpen(key, it.name)}
                            lang={lang}
                            now={now}
                        />
                    );
                })}
            </div>

            {/* Part 2 — custom categories; an item box exists only while it has pending qty.
                Every column scrolls on its own. */}
            {columns.length > 0 && (
                <div className="grid gap-3 flex-1 min-h-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gridTemplateRows: 'minmax(0, 1fr)' }}>
                    {columns.map(col => {
                        const units = col.entries.reduce((s, e) => s + e.total, 0);
                        return (
                            <section key={col.id} className="flex flex-col min-h-0 rounded-2xl bg-gray-50 border border-gray-200">
                                <header className="shrink-0 flex items-center justify-between gap-1.5 px-2.5 py-2 border-b border-gray-200">
                                    <h3 className="text-[13px] md:text-sm font-bold text-gray-800 truncate">{col.name || '—'}</h3>
                                    <span className="text-[11px] md:text-xs font-bold tabular-nums text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5">{units}</span>
                                </header>
                                <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-3.5 pb-2">
                                    <div className={`grid gap-2 content-start ${boxesPerRow}`}>
                                        {col.entries.map(entry => (
                                            <KdsBox
                                                key={entry.key}
                                                small
                                                name={entry.name}
                                                entry={entry}
                                                options={optionsOf(menuByKey, entry.key)}
                                                colorKey={ageColor(entry.oldest, now, config.timer)}
                                                flag={flags[entry.key]}
                                                onClick={() => onOpen(entry.key, entry.name)}
                                                lang={lang}
                                                now={now}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
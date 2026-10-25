import React, { useMemo } from 'react';
import { t } from '../../i18n/translations';
import { ageColor, itemKey } from '../../lib/kds';
import KdsBox from './KdsBox';
import KdsItemRow from './KdsItemRow';

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
            entries: g.items.map(itemKey).map(k => agg.get(k)).filter(Boolean), // a row exists only while it has pending qty
        })),
        ...(others.length > 0 ? [{ id: '__other', entries: others }] : []),
    ];

    const slots = Array.from({ length: 4 }, (_, i) => config.featured[i] || null);

    return (
        <div className="h-full flex flex-col gap-3 p-3 md:p-4">
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

            {/* Part 2 — your custom groups: no titles, just compact one-line rows.
                Thin dividers separate the groups; every column scrolls on its own. */}
            {columns.length > 0 && (
                <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gridTemplateRows: 'minmax(0, 1fr)' }}>
                    {columns.map((col, ci) => (
                        <section key={col.id} className={`min-h-0 overflow-y-auto px-1.5 ${ci > 0 ? 'border-l-2 border-gray-300' : ''}`}>
                            <div className="space-y-1 py-0.5">
                                {col.entries.map(entry => (
                                    <KdsItemRow
                                        key={entry.key}
                                        name={entry.name}
                                        entry={entry}
                                        options={optionsOf(menuByKey, entry.key)}
                                        colorKey={ageColor(entry.oldest, now, config.timer)}
                                        flag={flags[entry.key]}
                                        onClick={() => onOpen(entry.key, entry.name)}
                                        lang={lang}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
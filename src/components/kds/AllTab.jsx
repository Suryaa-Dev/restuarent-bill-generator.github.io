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

    return (
        <div className="p-3 space-y-4">
            {/* Part 1 — main boxes (always shown) */}
            <div className="grid grid-cols-4 gap-3">
                {slots.map((it, i) => {
                    if (!it) {
                        return (
                            <div key={i} className="rounded-xl border-4 border-dashed border-gray-200 h-[27vh] min-h-[92px] flex items-center justify-center text-center text-xs text-gray-300 px-2">
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
                            onClick={() => onOpen(key, it.name)}
                            lang={lang}
                        />
                    );
                })}
            </div>

            {/* Part 2 — custom categories; an item box exists only while it has pending qty */}
            {columns.length > 0 && (
                <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                    {columns.map((col, ci) => (
                        <div key={col.id} className={`px-2 ${ci > 0 ? 'border-l-2 border-gray-300' : ''}`}>
                            <p className="text-center text-sm font-semibold text-gray-700 mb-2 truncate">{col.name || '—'}</p>
                            <div className="grid grid-cols-2 gap-2">
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
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

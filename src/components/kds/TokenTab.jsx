import React, { useEffect, useMemo, useState } from 'react';
import { t, translateCategory } from '../../i18n/translations';
import KdsTokenCard from './KdsTokenCard';

const byAge = (a, b) => a.token.createdAt.localeCompare(b.token.createdAt) || a.token.seq - b.token.seq;

// Table tab and Parcel tab share this: same layout, different token set
export default function TokenTab({ mode, lines, kitchenId, now, timer, lang }) {
    const [cat, setCat] = useState(null);

    // tokens of this mode that still have something pending in this kitchen
    const groups = useMemo(() => {
        const m = new Map();
        lines.filter(l => !!l.token.isParcel === (mode === 'parcel')).forEach(l => {
            if (!m.has(l.token.id)) m.set(l.token.id, { token: l.token, pendingCats: new Set(), oldest: Infinity });
            const g = m.get(l.token.id);
            g.pendingCats.add(l.item.category);
            g.oldest = Math.min(g.oldest, l.enteredAt);
        });
        return [...m.values()].sort(byAge);
    }, [lines, mode]);

    // pills only for categories that actually have active orders
    const categories = useMemo(() => {
        const s = new Set();
        groups.forEach(g => g.pendingCats.forEach(c => s.add(c)));
        return [...s].sort();
    }, [groups]);

    useEffect(() => { if (cat && !categories.includes(cat)) setCat(null); }, [categories, cat]);
    useEffect(() => { setCat(null); }, [mode]);

    const visible = cat ? groups.filter(g => g.pendingCats.has(cat)) : groups;

    return (
        <div className="p-3 space-y-3">
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {[null, ...categories].map(c => (
                        <button
                            key={c ?? '__all__'}
                            onClick={() => setCat(c)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap border ${cat === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}
                        >
                            {c ? translateCategory(c, lang) : t('allCategories', lang)}
                        </button>
                    ))}
                </div>
            )}

            {visible.length === 0 ? (
                <p className="text-center text-gray-300 py-16">{t('kdsNoOrders', lang)}</p>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
                    {visible.map(g => {
                        const shown = g.token.items
                            .filter(it => it.kitchenId === kitchenId && !it.removed)
                            .map(it => ({ item: it, pending: !it.served }));
                        return (
                            <KdsTokenCard
                                key={g.token.id}
                                token={g.token}
                                oldest={g.oldest}
                                now={now}
                                timer={timer}
                                lang={lang}
                                lines={shown}
                                isBold={cat ? (it) => it.category === cat : undefined}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

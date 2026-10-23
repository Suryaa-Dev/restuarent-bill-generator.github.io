import React, { useEffect, useMemo, useState } from 'react';
import { t, translateCategory } from '../../i18n/translations';
import KdsTokenCard from './KdsTokenCard';

const colsFor = (w) => (w >= 1280 ? 4 : w >= 1024 ? 3 : 2);
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
    const categoryCounts = useMemo(() => {
        const m = new Map(); // category -> number of tokens waiting on it
        groups.forEach(g => g.pendingCats.forEach(c => m.set(c, (m.get(c) || 0) + 1)));
        return m;
    }, [groups]);
    const categories = useMemo(() => [...categoryCounts.keys()].sort(), [categoryCounts]);

    useEffect(() => { if (cat && !categories.includes(cat)) setCat(null); }, [categories, cat]);
    useEffect(() => { setCat(null); }, [mode]);

    const visible = cat ? groups.filter(g => g.pendingCats.has(cat)) : groups;

    // number of columns follows the screen width (same breakpoints as before: 2 / 3 / 4)
    const [colCount, setColCount] = useState(() => colsFor(window.innerWidth));
    useEffect(() => {
        const on = () => setColCount(colsFor(window.innerWidth));
        window.addEventListener('resize', on);
        return () => window.removeEventListener('resize', on);
    }, []);
    const columns = Array.from({ length: colCount }, () => []);
    visible.forEach((g, i) => columns[i % colCount].push(g));

    return (
        <div className="h-full flex flex-col gap-3 p-3 md:p-4">
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
                    {[null, ...categories].map(c => {
                        const active = cat === c;
                        const n = c ? categoryCounts.get(c) : groups.length;
                        return (
                            <button
                                key={c ?? '__all__'}
                                onClick={() => setCat(c)}
                                className={`h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap border flex items-center gap-2 ${active ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300'}`}
                            >
                                {c ? translateCategory(c, lang) : t('allCategories', lang)}
                                <span className={`text-xs font-bold tabular-nums rounded-full px-1.5 ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>{n}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {visible.length === 0 ? (
                <p className="text-center text-gray-300 py-16">{t('kdsNoOrders', lang)}</p>
            ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {/* stacked columns: every token sits right under the previous one (no row gaps),
                        dealt left-to-right so the oldest tokens stay at the top */}
                    <div className="flex gap-3 items-start pb-2">
                        {columns.map((col, ci) => (
                            <div key={ci} className="flex-1 min-w-0 space-y-3">
                                {col.map(g => {
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
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
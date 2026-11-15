import React, { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import { t, translateCategory, translateItemName, translatePortion } from '../../i18n/translations';
import { ts } from '../../i18n/serveExtra';
import { BORDER, TEXT, DEFAULT_TIMER, ageColor, ageMinutes, normalizeConfig } from '../../lib/kds';

/* =====================================================================
   Serve Management tab (mobile, 3rd tab).
   Everything is DERIVED from the live `tokens` list that App.jsx already keeps in sync
   (billing screen, table overview and KDS all read/write the same tokens), so a serve
   made anywhere shows up here at once and vice-versa. Serving goes through the SAME
   handler as the Serve button on the token cards (`onServe(tokenId, idx)`).
   Pending = token active + line not removed + line not served + dine-in (parcel excluded).
   ===================================================================== */

const portionShort = (p) => (p ? String(p).trim().charAt(0).toUpperCase() : '');

// "2H | 1F" from { Half: 2, Full: 1 }
const qtyLabel = (portions) =>
    Object.entries(portions)
        .filter(([, q]) => q > 0)
        .map(([p, q]) => `${q}${portionShort(p)}`)
        .join(' | ');

function ServeManagementTabInner({ tokens, tables, categories, kitchens, onServe, lang }) {
    const [sel, setSel] = useState(null);        // { mode: 'category' | 'table', value }
    const [modalTable, setModalTable] = useState(null);
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(Date.now());

    // keeps the waiting-time colours moving
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(id);
    }, []);

    // each kitchen has its own KDS timer limits; lines of unknown kitchens use the defaults
    const timerOf = useMemo(() => {
        const m = new Map();
        (kitchens || []).forEach(k => m.set(k.id, normalizeConfig(k.kdsConfig).timer));
        return (kitchenId) => m.get(kitchenId) || DEFAULT_TIMER;
    }, [kitchens]);

    // every pending dine-in line, oldest first
    const lines = useMemo(() => {
        const out = [];
        (tokens || []).forEach(tk => {
            if (tk.status !== 'active' || tk.isParcel) return;
            (tk.items || []).forEach((it, idx) => {
                if (it.removed || it.served || !(it.qty > 0)) return;
                const enteredAt = Date.parse(it.addedAt || tk.createdAt) || now;
                out.push({
                    tokenId: tk.id, tokenNo: tk.tokenNo, table: tk.tableNumber, idx, item: it, enteredAt,
                    color: ageColor(enteredAt, now, timerOf(it.kitchenId)),
                });
            });
        });
        return out.sort((a, b) => a.enteredAt - b.enteredAt);
    }, [tokens, now, timerOf]);

    // table -> { oldest line, lines[] }   (lines already oldest-first)
    const byTable = useMemo(() => {
        const m = new Map();
        lines.forEach(l => {
            if (!tables.includes(l.table)) return;
            if (!m.has(l.table)) m.set(l.table, []);
            m.get(l.table).push(l);
        });
        return m;
    }, [lines, tables]);

    const pendingTables = useMemo(
        () => [...byTable.entries()].sort((a, b) => a[1][0].enteredAt - b[1][0].enteredAt).map(([n]) => n),
        [byTable]
    );
    // dine-in tokens of every table, so a fully served token can sink to the bottom of its table
    const liveTokensOf = (table) =>
        (tokens || []).filter(tk => tk.status === 'active' && !tk.isParcel && tk.tableNumber === table
            && (tk.items || []).some(i => !i.removed));
    const pendingCats = useMemo(() => {
        const s = new Set();
        lines.forEach(l => { if (l.item.category) s.add(l.item.category); });
        return (categories || []).filter(c => s.has(c));
    }, [lines, categories]);

    // a selection whose items are all served simply disappears
    // (a selected TABLE stays while it still has tokens, so its completed tokens stay visible at the bottom)
    const active = sel && (sel.mode === 'table'
        ? (byTable.has(sel.value) || liveTokensOf(sel.value).length > 0)
        : pendingCats.includes(sel.value)) ? sel : null;
    const tableList = active?.mode === 'table' && !pendingTables.includes(active.value)
        ? [...pendingTables, active.value] : pendingTables;

    const pick = (mode, value) =>
        setSel(prev => (prev && prev.mode === mode && prev.value === value ? null : { mode, value }));

    // same handler as the token card's Serve button; close the modal only when it really saved
    const serve = async (l) => {
        if (busy) return;
        setBusy(true);
        try {
            const ok = await onServe(l.tokenId, l.idx);
            if (ok !== false) setModalTable(null);
        } finally {
            setBusy(false);
        }
    };

    // result of category mode: tables with unserved items of that category
    const categoryBoxes = useMemo(() => {
        if (!active || active.mode !== 'category') return [];
        const boxes = [];
        byTable.forEach((tl, table) => {
            const mine = tl.filter(l => l.item.category === active.value);
            if (!mine.length) return;
            const portions = {};
            mine.forEach(l => { const p = l.item.portion || ''; portions[p] = (portions[p] || 0) + l.item.qty; });
            boxes.push({ table, portions, oldest: mine[0] });
        });
        return boxes.sort((a, b) => a.oldest.enteredAt - b.oldest.enteredAt);
    }, [active, byTable]);

    // table mode: one card per token (new orders are never merged into an older token);
    // tokens with pending dishes first (oldest first), fully served tokens sink to the bottom
    const tokenCards = useMemo(() => {
        if (!active || active.mode !== 'table') return [];
        const pend = byTable.get(active.value) || [];
        const cards = liveTokensOf(active.value).map(tk => {
            const mine = pend.filter(l => l.tokenId === tk.id);
            return { tk, pending: mine, done: mine.length === 0, oldest: mine[0] };
        });
        return [
            ...cards.filter(c => !c.done).sort((a, b) => a.oldest.enteredAt - b.oldest.enteredAt),
            ...cards.filter(c => c.done).sort((a, b) => a.tk.seq - b.tk.seq),
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, byTable, tokens]);

    const DishRow = ({ l, showToken }) => (
        <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug text-gray-900">{translateItemName(l.item.name, lang)}</p>
                <p className="text-[11px] text-gray-500">
                    {showToken && <span>#{l.tokenNo} · </span>}
                    <span className={`font-semibold tabular-nums ${TEXT[l.color]}`}>{ageMinutes(l.enteredAt, now)} {t('kdsMin', lang)}</span>
                </p>
            </div>
            <span className="w-8 shrink-0 text-center font-bold text-base text-gray-800">{l.item.qty}</span>
            <span className="w-12 shrink-0 text-xs text-gray-600">{translatePortion(l.item.portion, lang)}</span>
            <button
                onClick={() => serve(l)}
                disabled={busy}
                className="w-[76px] h-10 shrink-0 rounded-xl bg-orange-500 text-white text-xs font-bold active:bg-orange-600 disabled:opacity-60"
            >
                {t('serve', lang)}
            </button>
        </div>
    );

    const pillBase = 'shrink-0 rounded-full whitespace-nowrap font-semibold';
    const modalLines = modalTable ? byTable.get(modalTable) || [] : [];
    // table has nothing left to serve (here or on another device) -> drop the modal for good
    useEffect(() => { if (modalTable && !byTable.has(modalTable)) setModalTable(null); }, [modalTable, byTable]);

    return (
        <div className="flex flex-col flex-1 w-full overflow-hidden bg-gray-50">
            {/* 1. category pills */}
            {pendingCats.length > 0 && (
                <div className="bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto">
                    {pendingCats.map(cat => (
                        <button
                            key={cat}
                            onClick={() => pick('category', cat)}
                            className={`${pillBase} px-4 py-2 ${active?.mode === 'category' && active.value === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                            {translateCategory(cat, lang)}
                        </button>
                    ))}
                </div>
            )}

            {/* 2. table pills: number only, waiting time shown on the border (KDS colours) */}
            {tableList.length > 0 && (
                <div className="bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto">
                    {tableList.map(n => {
                        // a selected table with nothing pending left has no entry in byTable
                        const oldest = byTable.get(n)?.[0];
                        const on = active?.mode === 'table' && active.value === n;
                        return (
                            <button
                                key={n}
                                onClick={() => pick('table', n)}
                                className={`${pillBase} min-w-[44px] h-11 px-3 border-2 ${oldest ? BORDER[oldest.color] : 'border-green-300'} ${on ? 'bg-orange-500 text-white' : 'bg-white text-gray-900'}`}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 3. result */}
            <div className="flex-1 overflow-y-auto p-4">
                {!active && tableList.length > 0 && (
                    <p className="text-center text-sm text-gray-400 py-10">{ts('pickPrompt', lang)}</p>
                )}

                {active?.mode === 'category' && (
                    <div className="grid grid-cols-3 gap-3">
                        {categoryBoxes.map(b => (
                            <button
                                key={b.table}
                                onClick={() => setModalTable(b.table)}
                                className="relative aspect-square bg-gray-50 border-2 border-gray-200 rounded-xl p-2 flex flex-col items-center justify-center transition-all active:bg-gray-100 active:scale-95"
                            >
                                <span className="text-lg font-bold text-gray-700 mb-2">T{b.table}</span>
                                <span className="text-base font-bold text-orange-600 tabular-nums whitespace-nowrap">{qtyLabel(b.portions)}</span>
                            </button>
                        ))}
                    </div>
                )}

                {active?.mode === 'table' && (
                    <div className="space-y-3">
                        {tokenCards.map(({ tk, pending, done, oldest }) => (
                            <div
                                key={tk.id}
                                className={`rounded-2xl border-2 overflow-hidden ${done ? 'border-green-300 bg-green-50/40' : `bg-white ${BORDER[oldest.color]}`}`}
                            >
                                <div className="flex items-center justify-between px-3 py-2 border-b border-black/5">
                                    <span className="font-extrabold text-lg text-gray-900">T{active.value} · #{tk.tokenNo}</span>
                                    {done && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-green-600 text-white">
                                            <Check size={10} /> {t('tokenCompleted', lang)}
                                        </span>
                                    )}
                                </div>
                                <div className="divide-y divide-black/5">
                                    {done
                                        ? tk.items.filter(i => !i.removed).map((i, n) => (
                                            <div key={n} className="flex items-center gap-2 px-3 py-2.5 text-gray-400">
                                                <p className="flex-1 min-w-0 text-sm font-semibold">{translateItemName(i.name, lang)}</p>
                                                <span className="w-8 text-center font-bold">{i.qty}</span>
                                                <span className="w-12 text-xs">{translatePortion(i.portion, lang)}</span>
                                                <span className="w-[76px] text-center text-xs font-bold text-green-700">{t('served', lang)}</span>
                                            </div>
                                        ))
                                        : pending.map(l => <DishRow key={`${l.tokenId}-${l.idx}`} l={l} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* table modal (category mode) */}
            {modalTable && modalLines.length > 0 && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-end justify-center" onClick={() => setModalTable(null)}>
                    <div className="bg-white w-full rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                            <h2 className="text-lg font-bold">{t('tableLabel', lang)} {modalTable} · {ts('pendingDishes', lang)}</h2>
                            <button onClick={() => setModalTable(null)} aria-label={ts('close', lang)} className="p-2 rounded-full bg-gray-100">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto divide-y divide-black/5">
                            {modalLines.map(l => <DishRow key={`${l.tokenId}-${l.idx}`} l={l} showToken />)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Safety net: if anything in this tab ever throws, only this tab shows a message;
// the rest of the app (bottom nav, other tabs) keeps working instead of a blank screen.
class ServeErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(err) { console.error('Serve tab crashed:', err); }
    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 bg-gray-50">
                <p className="text-sm text-gray-600">Something went wrong in the Serve tab.</p>
                <button onClick={() => this.setState({ failed: false })} className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold">
                    Reload
                </button>
            </div>
        );
    }
}

export default function ServeManagementTab(props) {
    return (
        <ServeErrorBoundary>
            <ServeManagementTabInner {...props} />
        </ServeErrorBoundary>
    );
}

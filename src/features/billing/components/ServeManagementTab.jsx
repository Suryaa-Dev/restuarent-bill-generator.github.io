import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, ShoppingBag } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../../i18n/translations';
import { ts } from '../../../i18n/serveExtra';
import { BORDER, TEXT, DEFAULT_TIMER, ageColor, ageMinutes, normalizeConfig } from '../../kds/utils/kds';

/* =====================================================================
   Serve Management tab (mobile, 3rd tab).
   Everything is DERIVED from the live `tokens` list that App.jsx already keeps in sync
   (billing screen, table overview and KDS all read/write the same tokens), so a serve
   made anywhere shows up here at once and vice-versa. Serving goes through the SAME
   handler as the Serve button on the token cards (`onServe(tokenId, idx)`).
   Pending = token active + line not removed + line not served. Dine-in and parcel orders are both
   shown: dine-in tables in the 2nd pill row, parcel tables in the 3rd row (a table with both
   appears in both rows, each with its own orders).
   ===================================================================== */

const portionShort = (p) => (p ? String(p).trim().charAt(0).toUpperCase() : '');

// "2H | 1F" from { Half: 2, Full: 1 }
const qtyLabel = (portions) =>
    Object.entries(portions)
        .filter(([, q]) => q > 0)
        .map(([p, q]) => `${q}${portionShort(p)}`)
        .join(' | ');

function ServeManagementTabInner({ tokens, tables, kitchens, onServe, lang }) {
    const [sel, setSel] = useState(null);        // { mode: 'item', value } | { mode: 'table', value, parcel }
    const [modal, setModal] = useState(null);    // { table, parcel, item }
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
            if (tk.status !== 'active') return;
            (tk.items || []).forEach((it, idx) => {
                if (it.removed || it.served || !(it.qty > 0)) return;
                const enteredAt = Date.parse(it.addedAt || tk.createdAt) || now;
                out.push({
                    tokenId: tk.id, tokenNo: tk.tokenNo, table: tk.tableNumber, parcel: !!tk.isParcel, idx, item: it, enteredAt,
                    color: ageColor(enteredAt, now, timerOf(it.kitchenId)),
                });
            });
        });
        return out.sort((a, b) => a.enteredAt - b.enteredAt);
    }, [tokens, now, timerOf]);

    // table -> lines[] (oldest first), separately for dine-in and for parcel orders
    const mapFor = (parcel) => {
        const m = new Map();
        lines.forEach(l => {
            if (l.parcel !== parcel || !tables.includes(l.table)) return;
            if (!m.has(l.table)) m.set(l.table, []);
            m.get(l.table).push(l);
        });
        return m;
    };
    const dineByTable = useMemo(() => mapFor(false), [lines, tables]); // eslint-disable-line react-hooks/exhaustive-deps
    const parcelByTable = useMemo(() => mapFor(true), [lines, tables]); // eslint-disable-line react-hooks/exhaustive-deps
    const mapOf = (parcel) => (parcel ? parcelByTable : dineByTable);

    // tokens of a table of one kind, so a fully served token can sink to the bottom of its table
    const liveTokensOf = (table, parcel) =>
        (tokens || []).filter(tk => tk.status === 'active' && !!tk.isParcel === !!parcel && tk.tableNumber === table
            && (tk.items || []).some(i => !i.removed));

    // one pill per dish that still has pending quantity (oldest pending dish first), dine-in or parcel
    const pendingItems = useMemo(() => {
        const seen = new Set();
        lines.forEach(l => { if (l.item.name) seen.add(l.item.name); });
        return [...seen];
    }, [lines]);

    // a selection whose items are all served simply disappears
    // (a selected TABLE stays while it still has tokens, so its completed tokens stay visible at the bottom)
    const active = sel && (sel.mode === 'table'
        ? (mapOf(sel.parcel).has(sel.value) || liveTokensOf(sel.value, sel.parcel).length > 0)
        : pendingItems.includes(sel.value)) ? sel : null;
    const isOn = (mode, value, parcel = false) =>
        active?.mode === mode && active.value === value && (mode === 'item' || !!active.parcel === parcel);

    // row 2: every dine-in table (greyed out when nothing to serve). A table that only has a
    // PARCEL order pending moves down to row 3 instead.
    const dineRow = tables.filter(n => !(parcelByTable.has(n) && !dineByTable.has(n)) || isOn('table', n, false));
    // row 3: tables with a pending parcel order (oldest first); an open one stays until closed
    const parcelRow = useMemo(() => {
        const list = [...parcelByTable.entries()].sort((a, b) => a[1][0].enteredAt - b[1][0].enteredAt).map(([n]) => n);
        return active?.mode === 'table' && active.parcel && !list.includes(active.value) ? [...list, active.value] : list;
    }, [parcelByTable, active]);

    const pick = (mode, value, parcel = false) =>
        setSel(prev => (prev && prev.mode === mode && prev.value === value && (mode === 'item' || !!prev.parcel === parcel)
            ? null
            : (mode === 'item' ? { mode, value } : { mode, value, parcel })));

    // same handler as the token card's Serve button; close the modal only when it really saved
    const serve = async (l) => {
        if (busy) return;
        setBusy(true);
        try {
            const ok = await onServe(l.tokenId, l.idx);
            if (ok !== false) setModal(null);
        } finally {
            setBusy(false);
        }
    };

    // item mode: every table that still waits for the selected dish (dine-in and parcel boxes apart)
    const itemBoxes = useMemo(() => {
        if (!active || active.mode !== 'item') return [];
        const boxes = [];
        [false, true].forEach(parcel => {
            mapOf(parcel).forEach((tl, table) => {
                const mine = tl.filter(l => l.item.name === active.value);
                if (!mine.length) return;
                const portions = {};
                mine.forEach(l => { const p = l.item.portion || ''; portions[p] = (portions[p] || 0) + l.item.qty; });
                boxes.push({ table, parcel, portions, oldest: mine[0] });
            });
        });
        return boxes.sort((a, b) => a.oldest.enteredAt - b.oldest.enteredAt);
    }, [active, dineByTable, parcelByTable]); // eslint-disable-line react-hooks/exhaustive-deps

    // table mode: one card per token (new orders are never merged into an older token);
    // tokens with pending dishes first (oldest first), fully served tokens sink to the bottom
    const tokenCards = useMemo(() => {
        if (!active || active.mode !== 'table') return [];
        const pend = mapOf(active.parcel).get(active.value) || [];
        const cards = liveTokensOf(active.value, active.parcel).map(tk => {
            const mine = pend.filter(l => l.tokenId === tk.id);
            return { tk, pending: mine, done: mine.length === 0, oldest: mine[0] };
        });
        return [
            ...cards.filter(c => !c.done).sort((a, b) => a.oldest.enteredAt - b.oldest.enteredAt),
            ...cards.filter(c => c.done).sort((a, b) => a.tk.seq - b.tk.seq),
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, dineByTable, parcelByTable, tokens]);

    const DishRow = ({ l, showToken }) => (
        <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug text-gray-900">{translateItemName(l.item.name, lang)}</p>
                {l.item.mods?.length > 0 && <p className="text-xs font-bold text-indigo-600">{l.item.mods.join(', ')}</p>}
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
    // opened from a dish pill: show ONLY that dish for that table
    const modalLines = modal ? (mapOf(modal.parcel).get(modal.table) || []).filter(l => !modal.item || l.item.name === modal.item) : [];
    // nothing left to serve (here or on another device) -> drop the modal for good
    useEffect(() => { if (modal && modalLines.length === 0) setModal(null); }, [modal, modalLines.length]);

    return (
        <div className="flex flex-col flex-1 w-full overflow-hidden bg-gray-50">
            {/* 1. item pills (dishes with pending quantity) */}
            {pendingItems.length > 0 && (
                <div className="bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto">
                    {pendingItems.map(name => (
                        <button
                            key={name}
                            onClick={() => pick('item', name)}
                            className={`${pillBase} px-4 py-2 ${active?.mode === 'item' && active.value === name ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                        >
                            {translateItemName(name, lang)}
                        </button>
                    ))}
                </div>
            )}

            {/* 2. dine-in table pills: number only; waiting time on the border (KDS colours).
                   Tables with nothing to serve are greyed out and not clickable. */}
            {dineRow.length > 0 && (
                <div className="bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto">
                    {dineRow.map(n => {
                        const oldest = dineByTable.get(n)?.[0];
                        const on = isOn('table', n, false);
                        const enabled = !!oldest || on;
                        return (
                            <button
                                key={n}
                                onClick={() => enabled && pick('table', n, false)}
                                disabled={!enabled}
                                aria-disabled={!enabled}
                                className={`${pillBase} min-w-[44px] h-11 px-3 border-2 ${enabled
                                    ? `${oldest ? BORDER[oldest.color] : 'border-green-300'} ${on ? 'bg-orange-500 text-white' : 'bg-white text-gray-900'}`
                                    : 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 3. parcel table pills: only tables with a pending parcel order, parcel-coloured border */}
            {parcelRow.length > 0 && (
                <div className="bg-purple-50/60 border-b px-4 py-3 flex items-center gap-2 overflow-x-auto">
                    <ShoppingBag size={18} className="shrink-0 text-purple-600" aria-label={t('parcelBadge', lang)} />
                    {parcelRow.map(n => {
                        const on = isOn('table', n, true);
                        return (
                            <button
                                key={n}
                                onClick={() => pick('table', n, true)}
                                className={`${pillBase} min-w-[44px] h-11 px-3 border-2 border-purple-500 ${on ? 'bg-purple-600 text-white' : 'bg-white text-purple-800'}`}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 3. result */}
            <div className="flex-1 overflow-y-auto p-4">
                {!active && (dineByTable.size > 0 || parcelByTable.size > 0) && (
                    <p className="text-center text-sm text-gray-400 py-10">{ts('pickPrompt', lang)}</p>
                )}

                {active?.mode === 'item' && (() => {
                    const dineBoxes = itemBoxes.filter(b => !b.parcel);
                    const parcelBoxes = itemBoxes.filter(b => b.parcel);
                    const grid = (list) => (
                        <div className="grid grid-cols-3 gap-3">
                            {list.map(b => (
                                <button
                                    key={`${b.table}-${b.parcel}`}
                                    onClick={() => setModal({ table: b.table, parcel: b.parcel, item: active.value })}
                                    className={`relative aspect-square border-2 rounded-xl p-2 flex flex-col items-center justify-center transition-all active:scale-95 ${b.parcel ? 'bg-purple-50 border-purple-400 active:bg-purple-100' : 'bg-gray-50 border-gray-200 active:bg-gray-100'}`}
                                >
                                    {b.parcel && <ShoppingBag size={13} className="absolute top-1.5 left-1.5 text-purple-600" aria-label={t('parcelBadge', lang)} />}
                                    <span className="text-lg font-bold text-gray-700 mb-2">T{b.table}</span>
                                    <span className="text-base font-bold text-orange-600 tabular-nums whitespace-nowrap">{qtyLabel(b.portions)}</span>
                                </button>
                            ))}
                        </div>
                    );
                    return (
                        <>
                            {dineBoxes.length > 0 && grid(dineBoxes)}
                            {/* parcel boxes always start on their own row, below a clear gap, never mixed in with dine-in */}
                            {parcelBoxes.length > 0 && (
                                <div className={dineBoxes.length > 0 ? 'mt-8' : ''}>
                                    <div className="flex items-center gap-2 mb-3 text-purple-700">
                                        <ShoppingBag size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wide">{t('parcelBadge', lang)}</span>
                                        <span className="flex-1 h-px bg-purple-200" />
                                    </div>
                                    {grid(parcelBoxes)}
                                </div>
                            )}
                        </>
                    );
                })()}

                {active?.mode === 'table' && (
                    <div className="space-y-3">
                        {tokenCards.map(({ tk, pending, done, oldest }) => (
                            <div
                                key={tk.id}
                                className={`rounded-2xl border-2 overflow-hidden ${done ? 'border-green-300 bg-green-50/40' : `bg-white ${BORDER[oldest.color]}`}`}
                            >
                                <div className="flex items-center justify-between px-3 py-2 border-b border-black/5">
                                    <span className="font-extrabold text-lg text-gray-900">T{active.value} · #{tk.tokenNo}</span>
                                    {tk.isParcel && !done && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-purple-600 text-white">
                                            <ShoppingBag size={10} /> {t('parcelBadge', lang)}
                                        </span>
                                    )}
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

            {/* modal opened from a dish pill: only that dish of that table */}
            {modal && modalLines.length > 0 && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-end justify-center" onClick={() => setModal(null)}>
                    <div className="bg-white w-full rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
                            <h2 className="text-lg font-bold flex items-center gap-2 min-w-0">
                                <span className="truncate">{t('tableLabel', lang)} {modal.table} · {modal.item ? translateItemName(modal.item, lang) : ts('pendingDishes', lang)}</span>
                                {modal.parcel && (
                                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-purple-600 text-white">
                                        <ShoppingBag size={10} /> {t('parcelBadge', lang)}
                                    </span>
                                )}
                            </h2>
                            <button onClick={() => setModal(null)} aria-label={ts('close', lang)} className="p-2 rounded-full bg-gray-100 shrink-0">
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
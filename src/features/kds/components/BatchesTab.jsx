import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChefHat, Flame, Play } from 'lucide-react';
import { translateCategory, translateItemName, translatePortion } from '../../../i18n/translations';
import { tb } from '../../../i18n/batchExtra';
import { ageColor, BORDER, TEXT } from '../utils/kds';
import { canUndoStart, recommendedView } from '../utils/batches';

const fmtTime = (iso, lang) => new Date(iso).toLocaleTimeString(lang === 'mr' ? 'mr-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const minutesBetween = (from, to) => Math.max(1, Math.round((to - from) / 60000));
const unitLabel = (u, lang) => `T${u.tableNumber}${u.isParcel ? ` · ${tb('parcel', lang)}` : ''}`;

// Portion-wise quantity, e.g. 3H | 2F  (Half / Full ...). Letters come from the portion name; if two
// portions would share a letter, more letters are used so they stay distinguishable.
const PORTION_ORDER = ['quarter', 'small', 'half', 'medium', 'regular', 'full', 'large'];
const rankOf = (p) => { const i = PORTION_ORDER.indexOf(String(p).toLowerCase()); return i < 0 ? 99 : i; };

export function portionTags(portions, lang) {
    const entries = Object.entries(portions || {}).filter(([, n]) => n > 0)
        .sort(([a], [b]) => rankOf(a) - rankOf(b) || String(a).localeCompare(String(b)));
    const labels = entries.map(([p]) => [...String(translatePortion(p, lang) || '').trim()]);
    let len = 1;
    while (len < 6) {
        const heads = labels.map(l => l.slice(0, len).join('').toUpperCase());
        if (new Set(heads).size === heads.length) break;
        len += 1;
    }
    return entries.map(([, n], i) => ({ n, tag: labels[i].slice(0, len).join('').toUpperCase() }));
}

function QtyByPortion({ portions, qty, lang }) {
    const tags = portionTags(portions, lang);
    return (
        <div className="text-right shrink-0 flex items-baseline justify-end gap-1.5 text-3xl font-extrabold text-gray-900 tabular-nums leading-none" aria-label={`${qty}`}>
            {tags.length === 0 ? qty : tags.map((x, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="text-gray-300 font-bold">|</span>}
                    <span>{x.n}<span className="text-xl font-bold text-gray-500">{x.tag}</span></span>
                </React.Fragment>
            ))}
        </div>
    );
}

// who the plates are for: T3 ×3 · T2 ×2 · T5 · Parcel ×1   (a tick = already served)
function Units({ units, lang }) {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
            {units.map(u => (
                <span key={u.id} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm font-semibold tabular-nums ${u.isParcel ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    {unitLabel(u, lang)} <span className="text-gray-500 font-bold">×{u.qty}</span>
                    {u.served && <Check size={14} className="text-green-600" aria-label={tb('servedMark', lang)} />}
                </span>
            ))}
        </div>
    );
}

function Header({ badge, badgeTone, name, category, qty, lang, portions }) {
    return (
        <div className="flex items-start gap-3">
            <span className={`shrink-0 min-w-[2.25rem] h-9 px-2 rounded-full text-sm font-extrabold tabular-nums flex items-center justify-center ${badgeTone}`}>{badge}</span>
            <div className="flex-1 min-w-0">
                <p className="text-lg font-extrabold text-gray-900 leading-tight truncate">{translateItemName(name, lang)}</p>
                {category && <p className="text-xs text-gray-400 truncate">{translateCategory(category, lang)}</p>}
            </div>
            <QtyByPortion portions={portions} qty={qty} lang={lang} />
        </div>
    );
}

/* ---------- unstarted recommendation ---------- */
function RecommendationCard({ rec, now, timer, busy, lang, onStart }) {
    const color = ageColor(rec.oldestSince, now, timer);
    const mins = minutesBetween(rec.oldestSince, now);
    return (
        <div className={`bg-white rounded-2xl border-2 p-3.5 flex flex-col ${BORDER[color]}`}>
            <Header badge={`#${rec.rank}`} badgeTone="bg-orange-100 text-orange-700" name={rec.name} category={rec.category} qty={rec.qty} portions={rec.portions} lang={lang} />
            <Units units={rec.units} lang={lang} />
            <p className="mt-2.5 text-xs text-gray-500">
                {rec.coverage} {tb(rec.coverage === 1 ? 'tableWaiting' : 'tablesWaiting', lang)}
                <span className="mx-1.5">·</span>
                <span className={`font-semibold ${TEXT[color]}`}>{tb('waitingMin', lang, { n: mins })}</span>
            </p>
            {onStart && (
            <button
                onClick={() => onStart(rec)}
                disabled={busy}
                className="mt-3 h-12 rounded-xl bg-orange-500 text-white text-base font-bold flex items-center justify-center gap-2 active:bg-orange-600 disabled:opacity-50"
            >
                <Play size={18} /> {tb('startBatch', lang)}
            </button>
            )}
        </div>
    );
}

/* ---------- started batch (in progress) ---------- */
function InProgressCard({ batch, now, busy, lang, onDone, onUndo }) {
    const mins = minutesBetween(Date.parse(batch.startedAt), now);
    const undoable = canUndoStart(batch);
    return (
        <div className="bg-white rounded-2xl border-2 border-green-500 p-3.5 flex flex-col">
            <Header badge={`#${batch.batchNo}`} badgeTone="bg-green-100 text-green-700" name={batch.name} category={batch.category} qty={batch.qty} portions={batch.portions} lang={lang} />
            <Units units={batch.units} lang={lang} />
            <p className="mt-2.5 text-xs text-gray-500 flex flex-wrap gap-x-2">
                <span className="font-semibold text-green-700">{tb('cookingMin', lang, { n: mins })}</span>
                {batch.cancelledQty > 0 && <span className="text-red-600 font-semibold">{tb('cancelledNote', lang, { n: batch.cancelledQty })}</span>}
            </p>
            {onDone && (
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    onClick={() => onUndo(batch)}
                    disabled={busy || !undoable}
                    className="h-12 rounded-xl border-2 border-green-600 bg-green-50 text-green-800 text-[15px] font-bold flex items-center justify-center gap-1.5 active:bg-green-100 disabled:opacity-60"
                >
                    <Flame size={17} /> {tb('inProgress', lang)}
                </button>
                <button
                    onClick={() => onDone(batch)}
                    disabled={busy}
                    className="h-12 rounded-xl bg-green-600 text-white text-base font-bold flex items-center justify-center gap-2 active:bg-green-700 disabled:opacity-50"
                >
                    <Check size={19} /> {tb('done', lang)}
                </button>
            </div>
            )}
        </div>
    );
}

/* ---------- completed batch ---------- */
function DoneCard({ batch, lang }) {
    const took = batch.doneAt ? minutesBetween(Date.parse(batch.startedAt), Date.parse(batch.doneAt)) : null;
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-3.5 opacity-90">
            <Header badge={`#${batch.batchNo}`} badgeTone="bg-gray-100 text-gray-600" name={batch.name} category={batch.category} qty={batch.qty} portions={batch.portions} lang={lang} />
            <Units units={batch.units} lang={lang} />
            <p className="mt-2.5 text-xs text-gray-500 flex flex-wrap gap-x-2">
                <span className="font-semibold text-gray-700 inline-flex items-center gap-1"><Check size={13} className="text-green-600" />{batch.doneAt ? tb('doneAt', lang, { t: fmtTime(batch.doneAt, lang) }) : tb('done', lang)}</span>
                {took != null && <span>{tb('cookedIn', lang, { n: took })}</span>}
                {batch.cancelledQty > 0 && <span className="text-red-600 font-semibold">{tb('cancelledNote', lang, { n: batch.cancelledQty })}</span>}
                {batch.wastedQty > 0 && <span className="text-red-600 font-semibold">{tb('wastedNote', lang, { n: batch.wastedQty })}</span>}
            </p>
        </div>
    );
}

/* ---------- the tab ---------- */
// readOnly: the account may watch batches but not start / finish them
export default function BatchesTab({ batches, timer, lang, readOnly = false }) {
    const { inProgress, done, recs, error, busyId, notice, clearNotice, start, finish, undo, now } = batches;
    const [sub, setSub] = useState('recommended'); // recommended | progress | done

    useEffect(() => {
        if (!notice) return undefined;
        const id = setTimeout(clearNotice, 7000);
        return () => clearTimeout(id);
    }, [notice]); // eslint-disable-line react-hooks/exhaustive-deps

    const view = useMemo(() => recommendedView(inProgress, recs), [inProgress, recs]);

    const subs = [
        ['recommended', 'subRecommended', view.length],
        ['progress', 'subProgress', inProgress.length],
        ['done', 'subDone', done.length],
    ];

    const confirmUndo = (b) => { if (window.confirm(tb('undoConfirm', lang))) undo(b); };
    const onStart = readOnly ? undefined : start;
    const onDone = readOnly ? undefined : finish;
    const onUndo = readOnly ? undefined : confirmUndo;

    let cards;
    let empty;
    if (sub === 'recommended') {
        empty = tb('emptyRecommended', lang);
        cards = view.map(v => v.kind === 'batch'
            ? <InProgressCard key={v.id} batch={v.batch} now={now} busy={busyId === v.batch.id} lang={lang} onDone={onDone} onUndo={onUndo} />
            : <RecommendationCard key={v.id} rec={v.rec} now={now} timer={timer} busy={busyId === v.id} lang={lang} onStart={onStart} />);
    } else if (sub === 'progress') {
        empty = tb('emptyProgress', lang);
        cards = inProgress.map(b => <InProgressCard key={b.id} batch={b} now={now} busy={busyId === b.id} lang={lang} onDone={onDone} onUndo={onUndo} />);
    } else {
        empty = tb('emptyDone', lang);
        cards = done.map(b => <DoneCard key={b.id} batch={b} lang={lang} />);
    }

    return (
        <div className="h-full flex flex-col">
            {/* the three categories */}
            <div className="shrink-0 px-3 md:px-4 pt-3 pb-2 flex justify-center">
                <div className="inline-flex gap-1 p-1 rounded-full bg-white border border-gray-200">
                    {subs.map(([id, key, n]) => {
                        const active = sub === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setSub(id)}
                                className={`h-9 px-4 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${active ? 'bg-gray-900 text-white' : 'text-gray-700 active:bg-gray-100'}`}
                            >
                                {tb(key, lang)}
                                <span className={`text-xs font-bold tabular-nums rounded-full px-1.5 py-0.5 leading-none ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'}`}>{n}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {error && <p className="mx-3 md:mx-4 mb-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">{tb('setupNeeded', lang)}</p>}
            {notice && (
                <button onClick={clearNotice} className="mx-3 md:mx-4 mb-2 text-left text-sm font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                    {tb(notice.key, lang, notice.vars)}
                </button>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 pb-6">
                {cards.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
                        <ChefHat size={44} className="mb-3 opacity-50" />
                        <p>{empty}</p>
                    </div>
                ) : (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 items-start">{cards}</div>
                )}
            </div>
        </div>
    );
}
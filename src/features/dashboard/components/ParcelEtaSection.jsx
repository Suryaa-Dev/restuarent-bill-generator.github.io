import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Target, Timer, TrendingUp } from 'lucide-react';
import { fetchTimelineRows } from '../../../services/reportsService';
import { ChartCard, InsightCard } from './shared';

/* Parcel Analysis -> "Ready-time estimates": the time told to the customer (saved when the parcel
   token was sent) against the real time (token sent -> last dish served). The billing screen uses
   the same comparison to correct its future estimates.                                        */

const COLUMNS = 'bill_id, token_no, table_number, is_parcel, sent_at, served_at, eta_minutes, cleared_at';
const ON_TIME_GRACE = 2; // ready up to 2 min after the promised time still counts as on time
const ist12 = (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const avg = (l) => (l.length ? l.reduce((s, n) => s + n, 0) / l.length : null);
const fmt = (m) => (m === null ? '—' : `${Math.round(m)} min`);

export default function ParcelEtaSection({ range, branch }) {
    const [rows, setRows] = useState([]);
    const [state, setState] = useState('loading'); // loading | ok | missing

    useEffect(() => {
        if (!range) return undefined;
        let alive = true;
        setState('loading');
        fetchTimelineRows({ range, branch, columns: COLUMNS })
            .then(data => { if (alive) { setRows(data); setState('ok'); } })
            .catch(() => { if (alive) setState('missing'); }); // database not updated yet
        return () => { alive = false; };
    }, [range, branch]);

    const parcels = useMemo(() => {
        const m = new Map();
        rows.forEach(r => {
            if (!r.is_parcel || !r.token_no || !r.sent_at || !(r.eta_minutes > 0)) return;
            const k = `${r.bill_id}|${r.token_no}`;
            if (!m.has(k)) m.set(k, { key: k, token: r.token_no, eta: r.eta_minutes, sent: r.sent_at, served: [], dishes: 0, allServed: true });
            const p = m.get(k);
            if (Date.parse(r.sent_at) < Date.parse(p.sent)) p.sent = r.sent_at;
            if (r.served_at) p.served.push(Date.parse(r.served_at)); else p.allServed = false;
            p.dishes += 1;
        });
        return [...m.values()]
            .filter(p => p.allServed && p.served.length)
            .map(p => {
                const actual = (Math.max(...p.served) - Date.parse(p.sent)) / 60000;
                return { ...p, actual, diff: actual - p.eta };
            })
            .filter(p => p.actual > 0 && p.actual <= 180)
            .sort((a, b) => Date.parse(b.sent) - Date.parse(a.sent));
    }, [rows]);

    const s = useMemo(() => {
        const onTime = parcels.filter(p => p.diff <= ON_TIME_GRACE).length;
        return {
            n: parcels.length,
            eta: avg(parcels.map(p => p.eta)),
            actual: avg(parcels.map(p => p.actual)),
            onTimePct: parcels.length ? Math.round((onTime / parcels.length) * 100) : null,
            late: avg(parcels.filter(p => p.diff > ON_TIME_GRACE).map(p => p.diff)),
            buckets: [
                ['Early by 5+ min', parcels.filter(p => p.diff <= -5).length, 'bg-blue-500'],
                ['Close to the estimate', parcels.filter(p => p.diff > -5 && p.diff <= ON_TIME_GRACE).length, 'bg-green-500'],
                ['Late by 3–10 min', parcels.filter(p => p.diff > ON_TIME_GRACE && p.diff <= 10).length, 'bg-orange-500'],
                ['Late by 10+ min', parcels.filter(p => p.diff > 10).length, 'bg-red-500'],
            ],
        };
    }, [parcels]);

    return (
        <ChartCard title="Ready-time estimates" subtitle="The time told to the customer when the parcel token was sent, compared with when the last dish was really served">
            {state === 'loading' ? <p className="text-sm text-gray-400">Loading…</p>
                : state === 'missing' ? <p className="text-sm text-gray-500">Estimates will appear here once the database update for parcel times has been run.</p>
                : s.n === 0 ? <p className="text-sm text-gray-500">No parcel with an estimate was fully served in this period yet. Mark every parcel dish as served to track the real time.</p>
                : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InsightCard icon={<Target size={22} />} title="Ready on time" value={`${s.onTimePct}%`} subtitle={`of ${s.n} parcels (up to ${ON_TIME_GRACE} min late counts)`} color="bg-green-500" />
                            <InsightCard icon={<Clock size={22} />} title="Time told to customers" value={fmt(s.eta)} subtitle="average estimate" color="bg-purple-500" />
                            <InsightCard icon={<Timer size={22} />} title="Real time" value={fmt(s.actual)} subtitle="average, token sent → last dish served" color="bg-orange-500" />
                            <InsightCard icon={<TrendingUp size={22} />} title="When late, by" value={fmt(s.late)} subtitle="average extra wait" color="bg-red-500" />
                        </div>

                        <div className="space-y-2">
                            {s.buckets.map(([label, n, color]) => (
                                <div key={label} className="flex items-center gap-3 text-sm">
                                    <span className="w-44 shrink-0 text-gray-700">{label}</span>
                                    <div className="flex-1 h-3 rounded bg-gray-100 overflow-hidden">
                                        <div className={`h-full ${color}`} style={{ width: `${s.n ? (n / s.n) * 100 : 0}%` }} />
                                    </div>
                                    <span className="w-10 text-right font-semibold tabular-nums">{n}</span>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-gray-500 border-b">{['Sent', 'Token', 'Estimated', 'Real', 'Difference'].map(h => <th key={h} className="py-2 pr-4 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
                                <tbody className="divide-y">
                                    {parcels.slice(0, 12).map(p => (
                                        <tr key={p.key}>
                                            <td className="py-2 pr-4 whitespace-nowrap">{ist12(p.sent)}</td>
                                            <td className="pr-4 font-medium">#{p.token}</td>
                                            <td className="pr-4">{p.eta} min</td>
                                            <td className="pr-4">{Math.round(p.actual)} min</td>
                                            <td className={`pr-4 font-semibold ${p.diff > ON_TIME_GRACE ? 'text-red-600' : 'text-green-700'}`}>
                                                {p.diff > ON_TIME_GRACE ? `${Math.round(p.diff)} min late` : p.diff < -1 ? `${Math.round(-p.diff)} min early` : 'on time'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
        </ChartCard>
    );
}

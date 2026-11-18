import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, ChefHat, Clock, Timer, Users, Repeat, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { fetchAllRows } from '../../lib/fetchAll';
import { toISTParts, formatHour } from '../../lib/time';
import { ChartCard, InsightCard, LoadingBlock } from './shared';

/* Service Speed: analysis of the per-dish timing log (item_timeline table).
     waiter wait  = token sent  - added to cart
     serve time   = served      - token sent        (kitchen + bringing it out)
     dining time  = bill cleared - served
     full order   = bill cleared - first item added
   Values outside a sane window (negative, or > 4 h / 8 h) are ignored: they are almost always
   a forgotten "Serve" tap or a bill left open, and would distort every average.            */

const COLUMNS = 'id, bill_id, branch, table_number, token_no, is_parcel, item_name, category, qty, order_started_at, cart_at, sent_at, served_at, cleared_at';
const MAX_STEP_S = 4 * 3600;
const MAX_DINING_S = 8 * 3600;
const MAX_SIT_S = 6 * 3600;      // a bill open longer than this is treated as a forgotten bill
const LONG_WAIT_MIN = 25;        // "long wait" = all dishes took longer than this to reach the table

const secs = (a, b, max) => {
  if (!a || !b) return null;
  const d = (Date.parse(b) - Date.parse(a)) / 1000;
  return d >= 0 && d <= max ? d : null;
};
const avg = (list) => {
  const v = list.filter(n => n !== null && n !== undefined);
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
};
const fmt = (s) => {
  if (s === null || s === undefined) return '—';
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(r).padStart(2, '0')}s`;
};
const mins = (s) => (s === null ? null : Math.round((s / 60) * 10) / 10);
const median = (list) => {
  const v = list.filter(n => n !== null && n !== undefined).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};
const bucketOf = (value, edges) => {           // edges [15,30,45] -> index of the bucket
  const i = edges.findIndex(e => value < e);
  return i === -1 ? edges.length : i;
};
const ist12 = (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

export default function ServiceTimingTab({ range, branch }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!range) { setRows([]); setBusy(false); return undefined; }
    let cancelled = false;
    setBusy(true);
    setError('');
    fetchAllRows(() => {
      let q = supabase.from('item_timeline').select(COLUMNS, { count: 'exact' })
        .gte('cleared_at', range.start).lt('cleared_at', range.endExclusive)
        .order('cleared_at', { ascending: false }).order('id', { ascending: true });
      if (branch !== 'all') q = q.eq('branch', branch);
      return q;
    })
      .then(data => { if (!cancelled) setRows(data); })
      .catch(err => {
        console.error(err);
        if (!cancelled) setError('Could not load the timing log. Has item_timeline.sql been run in Supabase?');
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [range, branch]);

  const data = useMemo(() => rows.map(r => ({
    ...r,
    wait: secs(r.cart_at, r.sent_at, MAX_STEP_S),
    serve: secs(r.sent_at, r.served_at, MAX_STEP_S),
    dining: secs(r.served_at, r.cleared_at, MAX_DINING_S),
    hour: r.sent_at ? toISTParts(r.sent_at).hour : null,
  })), [rows]);

  const kitchenRows = useMemo(() => data.filter(r => r.sent_at), [data]);

  const totals = useMemo(() => {
    const perBill = new Map();
    data.forEach(r => { if (!perBill.has(r.bill_id)) perBill.set(r.bill_id, secs(r.order_started_at, r.cleared_at, MAX_DINING_S * 2)); });
    return {
      wait: avg(data.map(r => r.wait)),
      serve: avg(data.map(r => r.serve)),
      dining: avg(data.map(r => r.dining)),
      order: avg([...perBill.values()]),
      bills: perBill.size,
      dishes: data.length,
      notServed: kitchenRows.filter(r => !r.served_at).length,
    };
  }, [data, kitchenRows]);

  const byHour = useMemo(() => {
    const m = {};
    kitchenRows.forEach(r => {
      if (r.serve === null || r.hour === null) return;
      (m[r.hour] = m[r.hour] || []).push(r.serve);
    });
    return Object.keys(m).map(Number).sort((a, b) => a - b)
      .map(h => ({ label: formatHour(h), minutes: mins(avg(m[h])), dishes: m[h].length }));
  }, [kitchenRows]);

  const slowest = useMemo(() => {
    const m = {};
    kitchenRows.forEach(r => { if (r.serve !== null) (m[r.item_name] = m[r.item_name] || []).push(r.serve); });
    return Object.entries(m).filter(([, v]) => v.length >= 2)
      .map(([name, v]) => ({ name, minutes: mins(avg(v)), dishes: v.length }))
      .sort((a, b) => b.minutes - a.minutes).slice(0, 10);
  }, [kitchenRows]);

  const byCategory = useMemo(() => {
    const m = {};
    data.forEach(r => { const k = r.category || 'Other'; (m[k] = m[k] || []).push(r); });
    return Object.entries(m).map(([cat, list]) => ({
      cat, dishes: list.length, wait: avg(list.map(r => r.wait)), serve: avg(list.map(r => r.serve)), dining: avg(list.map(r => r.dining)),
    })).sort((a, b) => (b.serve ?? -1) - (a.serve ?? -1));
  }, [data]);

  // ---- customer view: one record per bill ----
  const visits = useMemo(() => {
    const m = new Map();
    data.forEach(r => {
      if (!m.has(r.bill_id)) m.set(r.bill_id, { id: r.bill_id, table: r.table_number, started: r.order_started_at, cleared: r.cleared_at, rows: [] });
      m.get(r.bill_id).rows.push(r);
    });
    return [...m.values()].map(v => {
      const kitchen = v.rows.filter(r => r.sent_at);
      const served = kitchen.filter(r => r.served_at).map(r => Date.parse(r.served_at));
      const allServed = kitchen.length > 0 && served.length === kitchen.length;
      const tokenNos = [...new Set(kitchen.map(r => r.token_no))];
      const sentTimes = [...new Set(kitchen.map(r => r.sent_at))].map(Date.parse).sort((a, b) => a - b);
      const startMs = Date.parse(v.started);
      const lastServedIso = served.length ? new Date(Math.max(...served)).toISOString() : null;
      return {
        ...v,
        parcel: v.rows.every(r => r.is_parcel),
        dishes: v.rows.reduce((n, r) => n + (r.qty || 0), 0),
        tokens: tokenNos.length,
        sit: secs(v.started, v.cleared, MAX_SIT_S),
        firstFood: served.length && !isNaN(startMs) ? secs(v.started, new Date(Math.min(...served)).toISOString(), MAX_STEP_S) : null,
        allFood: allServed ? secs(v.started, lastServedIso, MAX_STEP_S) : null,
        afterFood: allServed ? secs(lastServedIso, v.cleared, MAX_DINING_S) : null,
        reorderGap: sentTimes.length > 1 ? (sentTimes[1] - sentTimes[0]) / 1000 : null,
        hour: isNaN(startMs) ? null : toISTParts(v.started).hour,
      };
    });
  }, [data]);

  const dineIn = useMemo(() => visits.filter(v => !v.parcel), [visits]);
  const parcelVisits = useMemo(() => visits.filter(v => v.parcel), [visits]);

  const cust = useMemo(() => {
    const sits = dineIn.map(v => v.sit);
    const withWait = dineIn.filter(v => v.allFood !== null);
    return {
      sit: avg(sits), sitMedian: median(sits),
      firstFood: avg(dineIn.map(v => v.firstFood)),
      allFood: avg(dineIn.map(v => v.allFood)),
      afterFood: avg(dineIn.map(v => v.afterFood)),
      repeatPct: dineIn.length ? Math.round((dineIn.filter(v => v.tokens >= 2).length / dineIn.length) * 100) : 0,
      dishes: dineIn.length ? dineIn.reduce((n, v) => n + v.dishes, 0) / dineIn.length : 0,
      longWaitPct: withWait.length ? Math.round((withWait.filter(v => v.allFood > LONG_WAIT_MIN * 60).length / withWait.length) * 100) : null,
      withWait: withWait.length,
    };
  }, [dineIn]);

  const sitBuckets = useMemo(() => {
    const labels = ['< 15 min', '15–30', '30–45', '45–60', '60–90', '90+ min'];
    const counts = labels.map(label => ({ label, bills: 0 }));
    dineIn.forEach(v => { if (v.sit !== null) counts[bucketOf(v.sit / 60, [15, 30, 45, 60, 90])].bills += 1; });
    return counts;
  }, [dineIn]);

  const sitByHour = useMemo(() => {
    const m = {};
    dineIn.forEach(v => { if (v.sit !== null && v.hour !== null) (m[v.hour] = m[v.hour] || []).push(v.sit); });
    return Object.keys(m).map(Number).sort((a, b) => a - b)
      .map(h => ({ label: formatHour(h), minutes: mins(avg(m[h])), bills: m[h].length }));
  }, [dineIn]);

  const byDishCount = useMemo(() => {
    const labels = ['1–2 dishes', '3–4', '5–6', '7–9', '10+'];
    const rows = labels.map(label => ({ label, wait: [], sit: [], bills: 0 }));
    dineIn.forEach(v => {
      const r = rows[bucketOf(v.dishes, [3, 5, 7, 10])];
      r.bills += 1;
      if (v.allFood !== null) r.wait.push(v.allFood);
      if (v.sit !== null) r.sit.push(v.sit);
    });
    return rows.filter(r => r.bills > 0).map(r => ({ label: r.label, bills: r.bills, waitMin: mins(avg(r.wait)), sitMin: mins(avg(r.sit)) }));
  }, [dineIn]);

  const byRounds = useMemo(() => {
    const rows = [1, 2, 3].map(n => ({ rounds: n === 3 ? '3+ tokens' : `${n} token${n > 1 ? 's' : ''}`, list: [] }));
    dineIn.forEach(v => { if (v.tokens >= 1) rows[Math.min(v.tokens, 3) - 1].list.push(v); });
    return rows.filter(r => r.list.length).map(r => ({
      rounds: r.rounds, bills: r.list.length, dishes: r.list.reduce((n, v) => n + v.dishes, 0) / r.list.length,
      sit: avg(r.list.map(v => v.sit)), gap: avg(r.list.map(v => v.reorderGap)),
    }));
  }, [dineIn]);

  const longestSits = useMemo(
    () => dineIn.filter(v => v.sit !== null).sort((a, b) => b.sit - a.sit).slice(0, 8),
    [dineIn]
  );

  if (busy) return <LoadingBlock label="Loading timing log..." />;
  if (error) return <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>;
  if (!data.length) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-lg font-semibold text-gray-700">No timing data in this period</p>
        <p className="text-sm text-gray-500 mt-1">Timings are recorded for bills cleared after this feature was installed.</p>
      </div>
    );
  }

  const Table = ({ head, children }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 border-b">{head.map(h => <th key={h} className="py-2 pr-4 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Service timing</h2>
        <p className="text-sm text-gray-500">How fast orders move from cart to token to table.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard icon={<ShoppingCart size={22} />} title="Waiter wait" value={fmt(totals.wait)} subtitle="cart → token sent" color="bg-blue-500" />
        <InsightCard icon={<ChefHat size={22} />} title="Serve time" value={fmt(totals.serve)} subtitle="token sent → served" color="bg-orange-500" />
        <InsightCard icon={<Clock size={22} />} title="Dining time" value={fmt(totals.dining)} subtitle="served → bill cleared" color="bg-green-500" />
        <InsightCard icon={<Timer size={22} />} title="Full order" value={fmt(totals.order)} subtitle="first item → bill cleared" color="bg-purple-500" />
      </div>
      <p className="text-xs text-gray-500">
        {totals.bills} bills · {totals.dishes} dish lines.{' '}
        {totals.notServed > 0 && `${totals.notServed} sent dishes were never marked served and are left out of serve time. `}
        Gaps over 4 h (8 h for dining) are ignored.
      </p>

      <ChartCard title="Serve time by hour" subtitle="Average minutes from token sent to dish served, by the hour the token was sent (IST)">
        {byHour.length === 0 ? <p className="text-sm text-gray-400">No served dishes yet.</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="m" />
                <Tooltip formatter={(v, n, p) => [`${v} min (${p.payload.dishes} dishes)`, 'Avg serve time']} />
                <Bar dataKey="minutes" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Slowest dishes" subtitle="Average serve time, dishes served at least twice">
        {slowest.length === 0 ? <p className="text-sm text-gray-400">Not enough data yet.</p> : (
          <div style={{ height: Math.max(180, slowest.length * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slowest} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} unit="m" />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n, p) => [`${v} min (${p.payload.dishes} dishes)`, 'Avg serve time']} />
                <Bar dataKey="minutes" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="By category">
        <Table head={['Category', 'Dishes', 'Waiter wait', 'Serve time', 'Dining time']}>
          {byCategory.map(r => (
            <tr key={r.cat}><td className="py-2 pr-4 font-medium">{r.cat}</td><td className="pr-4">{r.dishes}</td><td className="pr-4">{fmt(r.wait)}</td><td className="pr-4 font-semibold text-orange-600">{fmt(r.serve)}</td><td>{fmt(r.dining)}</td></tr>
          ))}
        </Table>
      </ChartCard>

      {/* ---------------- customer timing ---------------- */}
      <div className="pt-2">
        <h2 className="text-xl font-bold text-gray-900">Customer timing</h2>
        <p className="text-sm text-gray-500">
          How long dine-in customers stay and wait. A visit starts when the first item is added to the cart and ends when the bill is cleared
          ({dineIn.length} dine-in · {parcelVisits.length} parcel bills).
        </p>
      </div>

      {dineIn.length === 0 ? (
        <p className="text-sm text-gray-400">No dine-in bills with timing in this period.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InsightCard icon={<Users size={22} />} title="Time at table (avg)" value={fmt(cust.sit)} subtitle={`median ${fmt(cust.sitMedian)}`} color="bg-indigo-500" />
            <InsightCard icon={<UtensilsCrossed size={22} />} title="Wait for first dish" value={fmt(cust.firstFood)} subtitle="order start → first served" color="bg-orange-500" />
            <InsightCard icon={<ChefHat size={22} />} title="Wait for all dishes" value={fmt(cust.allFood)} subtitle="order start → last served" color="bg-red-500" />
            <InsightCard icon={<Clock size={22} />} title="Stay after food arrives" value={fmt(cust.afterFood)} subtitle="last served → bill cleared" color="bg-green-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InsightCard icon={<Repeat size={22} />} title="Repeat-order bills" value={`${cust.repeatPct}%`} subtitle="sent 2 or more tokens" color="bg-blue-500" />
            <InsightCard icon={<UtensilsCrossed size={22} />} title="Dishes per bill" value={cust.dishes.toFixed(1)} subtitle="dine-in average" color="bg-teal-500" />
            <InsightCard icon={<AlertTriangle size={22} />} title={`Waited over ${LONG_WAIT_MIN} min`} value={cust.longWaitPct === null ? '—' : `${cust.longWaitPct}%`} subtitle={`of ${cust.withWait} bills with all dishes served`} color="bg-amber-500" />
          </div>

          <ChartCard title="How long customers sit" subtitle="Dine-in bills by time at table">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sitBuckets}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} bills`, 'Bills']} />
                  <Bar dataKey="bills" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Time at table by arrival hour" subtitle="Average minutes, by the hour the order started (IST). Shows when tables turn over slowly.">
            {sitByHour.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sitByHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="m" />
                    <Tooltip formatter={(v, n, p) => [`${v} min (${p.payload.bills} bills)`, 'Avg time at table']} />
                    <Bar dataKey="minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Waiting vs number of dishes" subtitle="Do bigger orders wait longer? Average minutes by dishes per bill">
            {byDishCount.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDishCount}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="m" />
                    <Tooltip formatter={(v, name, p) => [`${v} min`, name === 'waitMin' ? 'Wait for all dishes' : 'Time at table']} labelFormatter={(l, pl) => `${l} (${pl?.[0]?.payload?.bills ?? 0} bills)`} />
                    <Bar dataKey="waitMin" name="waitMin" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sitMin" name="sitMin" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2"><span className="text-red-500 font-semibold">Red</span> = wait for all dishes · <span className="text-indigo-500 font-semibold">Purple</span> = time at table</p>
          </ChartCard>

          <ChartCard title="Repeat orders" subtitle="Customers who order again stay longer, how much?">
            <Table head={['Tokens on the bill', 'Bills', 'Avg dishes', 'Avg time at table', 'Gap to 2nd order']}>
              {byRounds.map(r => (
                <tr key={r.rounds}><td className="py-2 pr-4 font-medium">{r.rounds}</td><td className="pr-4">{r.bills}</td><td className="pr-4">{r.dishes.toFixed(1)}</td><td className="pr-4 font-semibold text-indigo-600">{fmt(r.sit)}</td><td>{fmt(r.gap)}</td></tr>
              ))}
            </Table>
          </ChartCard>

          <ChartCard title="Longest stays" subtitle="Useful to spot unusually long visits">
            <Table head={['Started', 'Table', 'Time at table', 'Wait for food', 'Dishes', 'Tokens']}>
              {longestSits.map(v => (
                <tr key={v.id}>
                  <td className="py-2 pr-4 whitespace-nowrap">{ist12(v.started)}</td>
                  <td className="pr-4 font-medium">T{v.table}</td>
                  <td className="pr-4 font-semibold text-indigo-600">{fmt(v.sit)}</td>
                  <td className="pr-4">{fmt(v.allFood)}</td>
                  <td className="pr-4">{v.dishes}</td>
                  <td>{v.tokens || '—'}</td>
                </tr>
              ))}
            </Table>
          </ChartCard>
        </>
      )}

      {parcelVisits.length > 0 && (
        <ChartCard title="Parcel orders" subtitle="Order start → bill cleared (hand-over)">
          <p className="text-2xl font-bold text-gray-900">{fmt(avg(parcelVisits.map(v => v.sit)))}</p>
          <p className="text-xs text-gray-500">average over {parcelVisits.length} parcel bills · median {fmt(median(parcelVisits.map(v => v.sit)))}</p>
        </ChartCard>
      )}
    </div>
  );
}
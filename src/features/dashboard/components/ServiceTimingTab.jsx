import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ShoppingCart, ChefHat, Clock, Users, Repeat, UtensilsCrossed, AlertTriangle, HelpCircle } from 'lucide-react';
import { fetchTimelineRows } from '../../../services/reportsService';
import { fetchKitchens } from '../../../services/kitchensService';
import { ageColor, normalizeConfig, DEFAULT_TIMER } from '../../kds/utils/kds';
import { toISTParts, formatHour } from '../../../shared/utils/time';
import { ChartCard, InsightCard, LoadingBlock } from './shared';

/* Service Speed, written for the owner / manager (no technical terms on screen).
   Built from the per-dish timing log (item_timeline):

   SERVICE   how fast the KITCHEN delivers each dish: token sent -> served, judged with the same
             green / yellow / orange / red limits as the KDS timer (set per kitchen in KDS settings).
   CUSTOMER  how long people SIT and WAIT. Waiting is measured per order round (= per token):
             order taken (cart) -> last dish of THAT token served. A dish ordered late in the meal
             is never counted against the first round.

   Averages are weighted by quantity (3 portions count 3x). Medians are shown where one slow
   outlier would distort the average. Gaps over 4 h (8 h dining, 6 h at table) are ignored: they
   are almost always a forgotten Serve tap or a bill left open.                              */

const COLUMNS = 'id, bill_id, branch, table_number, token_no, is_parcel, item_name, category, qty, kitchen_id, order_started_at, cart_at, sent_at, served_at, cleared_at';
const MAX_STEP_S = 4 * 3600;
const MAX_DINING_S = 8 * 3600;
const MAX_SIT_S = 6 * 3600;
const LONG_WAIT_MIN = 25;               // an order round that took longer than this is a "long wait"

const BANDS = ['green', 'yellow', 'orange', 'red'];
const BAND_HEX = { green: '#22c55e', yellow: '#fbbf24', orange: '#f97316', red: '#ef4444' };
const BAND_BG = { green: 'bg-green-500', yellow: 'bg-amber-400', orange: 'bg-orange-500', red: 'bg-red-500' };
const BAND_NAME = { green: 'On time', yellow: 'Getting late', orange: 'Late', red: 'Very late' };
const BAND_TEXT = { green: 'text-green-700', yellow: 'text-amber-700', orange: 'text-orange-700', red: 'text-red-700' };
const BAND_SOFT = { green: 'bg-green-50 border-green-200', yellow: 'bg-amber-50 border-amber-200', orange: 'bg-orange-50 border-orange-200', red: 'bg-red-50 border-red-200' };

const secs = (a, b, max) => {
  if (!a || !b) return null;
  const d = (Date.parse(b) - Date.parse(a)) / 1000;
  return d >= 0 && d <= max ? d : null;
};
const avg = (list) => {
  const v = list.filter(n => n !== null && n !== undefined);
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
};
// quantity-weighted average of rows[field]
const wavg = (rows, field) => {
  let sum = 0, w = 0;
  rows.forEach(r => { if (r[field] !== null && r[field] !== undefined) { const q = r.qty || 1; sum += r[field] * q; w += q; } });
  return w ? sum / w : null;
};
const median = (list) => {
  const v = list.filter(n => n !== null && n !== undefined).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};
// plain "12 min" (or "1 h 5 min") for people, not "12m 05s"
const fmtMin = (s) => {
  if (s === null || s === undefined) return '—';
  const m = Math.max(0, Math.round(s / 60));
  if (m < 1) return 'under 1 min';
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
const mins = (s) => (s === null || s === undefined ? null : Math.round((s / 60) * 10) / 10);
const bucketOf = (value, edges) => {
  const i = edges.findIndex(e => value < e);
  return i === -1 ? edges.length : i;
};
const ist12 = (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();

// share of dishes (by quantity) in each KDS colour
const bandShares = (rows) => {
  const c = { green: 0, yellow: 0, orange: 0, red: 0 };
  let total = 0;
  rows.forEach(r => { if (r.band) { const q = r.qty || 1; c[r.band] += q; total += q; } });
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  return { total, counts: c, pct: { green: pct(c.green), yellow: pct(c.yellow), orange: pct(c.orange), red: pct(c.red) } };
};

export default function ServiceTimingTab({ range, branch }) {
  const [rows, setRows] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [dishSort, setDishSort] = useState('red');
  const [showAllDishes, setShowAllDishes] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchKitchens().then(k => { if (alive) setKitchens(k || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!range) { setRows([]); setBusy(false); return undefined; }
    let cancelled = false;
    setBusy(true);
    setError('');
    fetchTimelineRows({ range, branch, columns: COLUMNS })
      .then(data => { if (!cancelled) setRows(data); })
      .catch(err => {
        console.error(err);
        if (!cancelled) setError('Could not load the timing log. Check your connection and try again.');
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [range, branch]);

  // KDS colour limits per kitchen (Settings -> KDS timer)
  const timerOf = useMemo(() => {
    const m = new Map(kitchens.map(k => [k.id, normalizeConfig(k.kdsConfig).timer]));
    return (id) => m.get(id) || DEFAULT_TIMER;
  }, [kitchens]);
  // the KDS timer limits, to explain each colour in minutes (null when kitchens use different limits)
  const limits = useMemo(() => {
    const timers = kitchens.length ? kitchens.map(k => normalizeConfig(k.kdsConfig).timer) : [DEFAULT_TIMER];
    const same = timers.every(t => t.green === timers[0].green && t.yellow === timers[0].yellow && t.orange === timers[0].orange);
    return same ? timers[0] : null;
  }, [kitchens]);
  const bandRange = (b) => {
    if (!limits) return '';
    if (b === 'green') return `within ${limits.green} min`;
    if (b === 'yellow') return `${limits.green}–${limits.yellow} min`;
    if (b === 'orange') return `${limits.yellow}–${limits.orange} min`;
    return `over ${limits.orange} min`;
  };

  const data = useMemo(() => rows.map(r => {
    const serve = secs(r.sent_at, r.served_at, MAX_STEP_S);
    return {
      ...r,
      qty: r.qty || 1,
      wait: secs(r.cart_at, r.sent_at, MAX_STEP_S),
      serve,
      band: serve === null ? null : ageColor(0, serve * 1000, timerOf(r.kitchen_id)),
      hour: r.sent_at ? toISTParts(r.sent_at).hour : null,
    };
  }), [rows, timerOf]);

  const kitchenRows = useMemo(() => data.filter(r => r.sent_at), [data]);
  const servedRows = useMemo(() => kitchenRows.filter(r => r.serve !== null), [kitchenRows]);

  /* ---------------- service view ---------------- */
  const svc = useMemo(() => ({
    wait: wavg(data, 'wait'), waitMedian: median(data.map(r => r.wait)),
    serve: wavg(servedRows, 'serve'), serveMedian: median(servedRows.map(r => r.serve)),
    shares: bandShares(servedRows),
    notServed: kitchenRows.filter(r => !r.served_at).length,
  }), [data, servedRows, kitchenRows]);

  const byHour = useMemo(() => {
    const m = {};
    servedRows.forEach(r => { if (r.hour !== null) (m[r.hour] = m[r.hour] || []).push(r); });
    return Object.keys(m).map(Number).sort((a, b) => a - b).map(h => {
      const sh = bandShares(m[h]);
      return { label: formatHour(h), ...sh.counts, avg: mins(wavg(m[h], 'serve')), dishes: sh.total };
    });
  }, [servedRows]);

  const dishTable = useMemo(() => {
    const m = {};
    servedRows.forEach(r => { (m[r.item_name] = m[r.item_name] || []).push(r); });
    const list = Object.entries(m).map(([name, list]) => {
      const sh = bandShares(list);
      return { name, dishes: sh.total, avg: wavg(list, 'serve'), median: median(list.map(r => r.serve)), shares: sh };
    });
    const sorters = {
      red: (a, b) => b.shares.pct.red - a.shares.pct.red || (b.avg ?? 0) - (a.avg ?? 0),
      slow: (a, b) => (b.avg ?? 0) - (a.avg ?? 0),
      most: (a, b) => b.dishes - a.dishes,
    };
    return list.sort(sorters[dishSort]);
  }, [servedRows, dishSort]);

  const byCategory = useMemo(() => {
    const m = {};
    servedRows.forEach(r => { const k = r.category || 'Other'; (m[k] = m[k] || []).push(r); });
    return Object.entries(m).map(([cat, list]) => {
      const sh = bandShares(list);
      return { cat, dishes: sh.total, avg: wavg(list, 'serve'), median: median(list.map(r => r.serve)), shares: sh };
    }).sort((a, b) => b.shares.pct.red - a.shares.pct.red || (b.avg ?? 0) - (a.avg ?? 0));
  }, [servedRows]);

  /* ---------------- customer view ---------------- */
  // one record per order ROUND (= token): its own wait, never mixed with later rounds
  const visits = useMemo(() => {
    const bills = new Map();
    data.forEach(r => {
      if (!bills.has(r.bill_id)) bills.set(r.bill_id, { id: r.bill_id, table: r.table_number, started: r.order_started_at, cleared: r.cleared_at, rows: [] });
      bills.get(r.bill_id).rows.push(r);
    });
    return [...bills.values()].map(v => {
      const tokens = new Map();
      v.rows.filter(r => r.sent_at && r.token_no).forEach(r => {
        if (!tokens.has(r.token_no)) tokens.set(r.token_no, []);
        tokens.get(r.token_no).push(r);
      });
      const rounds = [...tokens.entries()].map(([token, list]) => {
        const carts = list.map(r => Date.parse(r.cart_at || r.sent_at)).filter(n => !isNaN(n));
        const cart = carts.length ? new Date(Math.min(...carts)).toISOString() : null;
        const served = list.filter(r => r.served_at).map(r => Date.parse(r.served_at));
        const all = served.length === list.length;
        return {
          token,
          dishes: list.reduce((n, r) => n + r.qty, 0),
          sentAt: list.map(r => Date.parse(r.sent_at)).sort((a, b) => a - b)[0],
          waitFirst: served.length ? secs(cart, new Date(Math.min(...served)).toISOString(), MAX_STEP_S) : null,
          waitAll: all ? secs(cart, new Date(Math.max(...served)).toISOString(), MAX_STEP_S) : null,
        };
      }).sort((a, b) => a.sentAt - b.sentAt);

      const allServed = rounds.length > 0 && v.rows.filter(r => r.sent_at).every(r => r.served_at);
      const lastServed = allServed ? new Date(Math.max(...v.rows.filter(r => r.served_at).map(r => Date.parse(r.served_at)))).toISOString() : null;
      const startMs = Date.parse(v.started);
      const waits = rounds.map(r => r.waitAll).filter(n => n !== null);
      return {
        ...v,
        parcel: v.rows.every(r => r.is_parcel),
        dishes: v.rows.reduce((n, r) => n + r.qty, 0),
        rounds,
        tokens: rounds.length,
        sit: secs(v.started, v.cleared, MAX_SIT_S),
        afterFood: lastServed ? secs(lastServed, v.cleared, MAX_DINING_S) : null,
        worstWait: waits.length ? Math.max(...waits) : null,
        avgWait: avg(waits),
        reorderGap: rounds.length > 1 ? (rounds[1].sentAt - rounds[0].sentAt) / 1000 : null,
        hour: isNaN(startMs) ? null : toISTParts(v.started).hour,
      };
    });
  }, [data]);

  const dineIn = useMemo(() => visits.filter(v => !v.parcel), [visits]);
  const parcelVisits = useMemo(() => visits.filter(v => v.parcel), [visits]);
  const rounds = useMemo(() => dineIn.flatMap(v => v.rounds), [dineIn]);

  const cust = useMemo(() => {
    const sits = dineIn.map(v => v.sit);
    const done = rounds.filter(r => r.waitAll !== null);
    return {
      sit: avg(sits), sitMedian: median(sits),
      waitAll: avg(rounds.map(r => r.waitAll)), waitAllMedian: median(rounds.map(r => r.waitAll)),
      waitFirst: avg(rounds.map(r => r.waitFirst)),
      afterFood: avg(dineIn.map(v => v.afterFood)),
      repeatPct: dineIn.length ? Math.round((dineIn.filter(v => v.tokens >= 2).length / dineIn.length) * 100) : 0,
      dishes: dineIn.length ? dineIn.reduce((n, v) => n + v.dishes, 0) / dineIn.length : 0,
      longWaitPct: done.length ? Math.round((done.filter(r => r.waitAll > LONG_WAIT_MIN * 60).length / done.length) * 100) : null,
      doneRounds: done.length,
    };
  }, [dineIn, rounds]);

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

  const waitByRoundSize = useMemo(() => {
    const labels = ['1–2 dishes', '3–4', '5–6', '7+'];
    const rows2 = labels.map(label => ({ label, waits: [], n: 0 }));
    rounds.forEach(r => {
      const b = rows2[bucketOf(r.dishes, [3, 5, 7])];
      b.n += 1;
      if (r.waitAll !== null) b.waits.push(r.waitAll);
    });
    return rows2.filter(r => r.n > 0).map(r => ({ label: r.label, rounds: r.n, minutes: mins(avg(r.waits)) }));
  }, [rounds]);

  const sitByDishes = useMemo(() => {
    const labels = ['1–2 dishes', '3–4', '5–6', '7–9', '10+'];
    const rows2 = labels.map(label => ({ label, sits: [], n: 0 }));
    dineIn.forEach(v => { const b = rows2[bucketOf(v.dishes, [3, 5, 7, 10])]; b.n += 1; if (v.sit !== null) b.sits.push(v.sit); });
    return rows2.filter(r => r.n > 0).map(r => ({ label: r.label, bills: r.n, minutes: mins(avg(r.sits)) }));
  }, [dineIn]);

  const byRounds = useMemo(() => {
    const groups = [1, 2, 3].map(n => ({ label: n === 3 ? '3+ tokens' : `${n} token${n > 1 ? 's' : ''}`, list: [] }));
    dineIn.forEach(v => { if (v.tokens >= 1) groups[Math.min(v.tokens, 3) - 1].list.push(v); });
    return groups.filter(g => g.list.length).map(g => ({
      label: g.label, bills: g.list.length, dishes: g.list.reduce((n, v) => n + v.dishes, 0) / g.list.length,
      sit: avg(g.list.map(v => v.sit)), gap: avg(g.list.map(v => v.reorderGap)),
    }));
  }, [dineIn]);

  const longestSits = useMemo(() => dineIn.filter(v => v.sit !== null).sort((a, b) => b.sit - a.sit).slice(0, 8), [dineIn]);

  if (busy) return <LoadingBlock label="Loading service times..." />;
  if (error) return <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>;
  if (!data.length) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-lg font-semibold text-gray-700">No service times in this period</p>
        <p className="text-sm text-gray-500 mt-1">Times are recorded when a bill is cleared in Kitchen System mode and the dishes are marked served.</p>
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
  // quantity in each colour, e.g.  12 · 3 · 1 · 0
  const qtyCells = (sh) => BANDS.map(b => (
    <td key={b} className={`pr-4 tabular-nums font-semibold ${sh.counts[b] ? BAND_TEXT[b] : 'text-gray-300'}`}>{sh.counts[b]}</td>
  ));
  const shownDishes = showAllDishes ? dishTable : dishTable.slice(0, 10);
  const onTimePct = svc.shares.pct.green + svc.shares.pct.yellow;
  const verdict = svc.shares.total === 0 ? null
    : onTimePct >= 85 ? { text: 'Good', tone: 'bg-green-100 text-green-800' }
    : onTimePct >= 65 ? { text: 'Okay — some dishes are slow', tone: 'bg-amber-100 text-amber-800' }
    : { text: 'Slow — needs attention', tone: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-6">
      {/* =============== KITCHEN SPEED =============== */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">How fast does food reach the customer?</h2>
        <p className="text-sm text-gray-500">Counted from the moment an order is sent to the kitchen until the dish is marked served.</p>
      </div>

      {/* the short answer */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-500">In short</p>
          {verdict && <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${verdict.tone}`}>{verdict.text}</span>}
        </div>
        <p className="text-lg text-gray-900 leading-snug">
          Food usually reached the customer <b>{fmtMin(svc.serveMedian)}</b> after the order went to the kitchen.{' '}
          <b>{onTimePct}%</b> of dishes ({svc.shares.counts.green + svc.shares.counts.yellow} of {svc.shares.total}) were served on time or only a little late.
        </p>
        {svc.wait !== null && (
          <p className="text-sm text-gray-600">Waiters took about <b>{fmtMin(svc.waitMedian)}</b> to send an order to the kitchen after adding it to the bill.</p>
        )}
      </div>

      {/* quantity served at each speed */}
      <ChartCard title="Dishes served at each speed" subtitle="Number of dishes (portions), using the same colours as the kitchen screen">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BANDS.map(b => (
            <div key={b} className={`rounded-xl border p-4 ${BAND_SOFT[b]}`}>
              <p className={`flex items-center gap-2 text-sm font-bold ${BAND_TEXT[b]}`}><span className={`w-3 h-3 rounded-full ${BAND_BG[b]}`} /> {BAND_NAME[b]}</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1 tabular-nums">{svc.shares.counts[b]}</p>
              <p className="text-xs text-gray-600">dishes · {svc.shares.pct[b]}%{bandRange(b) ? ` · ${bandRange(b)}` : ''}</p>
            </div>
          ))}
        </div>
        {svc.notServed > 0 && (
          <p className="text-xs text-gray-500 mt-3">{svc.notServed} dishes sent to the kitchen were never marked served, so they are not counted. Tap “Serve” on every dish to keep these numbers right.</p>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard icon={<ChefHat size={22} />} title="Kitchen time" value={fmtMin(svc.serveMedian)} subtitle="order sent → dish served (usual)" color="bg-orange-500" />
        <InsightCard icon={<ShoppingCart size={22} />} title="Waiter time" value={fmtMin(svc.waitMedian)} subtitle="dish added → order sent (usual)" color="bg-blue-500" />
        <InsightCard icon={<Users size={22} />} title="Wait for the whole order" value={fmtMin(cust.waitAllMedian)} subtitle="dine-in, order taken → all dishes served" color="bg-red-500" />
        <InsightCard icon={<Clock size={22} />} title="Time at the table" value={fmtMin(cust.sitMedian)} subtitle="dine-in, first item → bill cleared" color="bg-indigo-500" />
      </div>

      <ChartCard title="Busy hours: when does the kitchen slow down?" subtitle="Dishes served each hour (by the time the order was sent), split by speed. Tall red / orange parts = the kitchen fell behind.">
        {byHour.length === 0 ? <p className="text-sm text-gray-400">No served dishes yet.</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n) => [`${v} dishes`, BAND_NAME[n]]} labelFormatter={(l, p) => `${l} · usually ${p?.[0]?.payload?.avg ?? '—'} min · ${p?.[0]?.payload?.dishes ?? 0} dishes`} />
                <Legend formatter={(n) => BAND_NAME[n]} />
                {BANDS.map(b => <Bar key={b} dataKey={b} stackId="s" fill={BAND_HEX[b]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Which dishes are slow?" subtitle="How many portions of each dish were served at each speed">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Show first</span>
          <select value={dishSort} onChange={e => setDishSort(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white">
            <option value="red">Most often very late</option>
            <option value="slow">Takes longest</option>
            <option value="most">Most served</option>
          </select>
        </div>
        {dishTable.length === 0 ? <p className="text-sm text-gray-400">No served dishes yet.</p> : (
          <>
            <Table head={['Dish', 'Served', 'Usually takes', ...BANDS.map(b => BAND_NAME[b])]}>
              {shownDishes.map(d => (
                <tr key={d.name}>
                  <td className="py-2 pr-4 font-medium">{d.name}</td>
                  <td className="pr-4 tabular-nums">{d.dishes}</td>
                  <td className="pr-4 font-semibold">{fmtMin(d.median)}</td>
                  {qtyCells(d.shares)}
                </tr>
              ))}
            </Table>
            {dishTable.length > 10 && (
              <button onClick={() => setShowAllDishes(v => !v)} className="mt-3 text-sm font-semibold text-orange-600">
                {showAllDishes ? 'Show fewer' : `Show all ${dishTable.length} dishes`}
              </button>
            )}
          </>
        )}
      </ChartCard>

      <ChartCard title="By menu category">
        <Table head={['Category', 'Served', 'Usually takes', ...BANDS.map(b => BAND_NAME[b])]}>
          {byCategory.map(r => (
            <tr key={r.cat}>
              <td className="py-2 pr-4 font-medium">{r.cat}</td>
              <td className="pr-4 tabular-nums">{r.dishes}</td>
              <td className="pr-4 font-semibold">{fmtMin(r.median)}</td>
              {qtyCells(r.shares)}
            </tr>
          ))}
        </Table>
      </ChartCard>

      {/* =============== CUSTOMERS =============== */}
      <div className="pt-2">
        <h2 className="text-xl font-bold text-gray-900">Dine-in customers</h2>
        <p className="text-sm text-gray-500">How long people wait for food and how long they stay ({dineIn.length} dine-in bills, {parcelVisits.length} parcel bills).</p>
      </div>

      {dineIn.length === 0 ? (
        <p className="text-sm text-gray-400">No dine-in bills with times in this period.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InsightCard icon={<UtensilsCrossed size={22} />} title="Wait for the first dish" value={fmtMin(cust.waitFirst)} subtitle="after ordering, on average" color="bg-orange-500" />
            <InsightCard icon={<ChefHat size={22} />} title="Wait for the whole order" value={fmtMin(cust.waitAll)} subtitle="after ordering, on average" color="bg-red-500" />
            <InsightCard icon={<Clock size={22} />} title="Stay after eating" value={fmtMin(cust.afterFood)} subtitle="last dish served → bill cleared" color="bg-green-500" />
            <InsightCard icon={<AlertTriangle size={22} />} title={`Orders over ${LONG_WAIT_MIN} min`} value={cust.longWaitPct === null ? '—' : `${cust.longWaitPct}%`} subtitle={`of ${cust.doneRounds} orders customers waited longer than ${LONG_WAIT_MIN} min`} color="bg-amber-500" />
          </div>

          <ChartCard title="How long customers stay" subtitle="Number of dine-in bills by time at the table">
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

          <ChartCard title="Longest visits" subtitle="“Longest wait” = the slowest single order on that bill">
            <Table head={['Started', 'Table', 'Time at table', 'Orders sent', 'Longest wait', 'Dishes']}>
              {longestSits.map(v => (
                <tr key={v.id}>
                  <td className="py-2 pr-4 whitespace-nowrap">{ist12(v.started)}</td>
                  <td className="pr-4 font-medium">T{v.table}</td>
                  <td className="pr-4 font-semibold text-indigo-600">{fmtMin(v.sit)}</td>
                  <td className="pr-4">{v.tokens || '—'}</td>
                  <td className="pr-4 font-semibold text-red-600">{fmtMin(v.worstWait)}</td>
                  <td>{v.dishes}</td>
                </tr>
              ))}
            </Table>
          </ChartCard>

          {/* deeper analysis, folded away so the page stays simple */}
          <details className="bg-white rounded-xl border border-gray-200 p-5">
            <summary className="cursor-pointer font-bold text-gray-900">More details</summary>
            <div className="mt-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InsightCard icon={<Repeat size={22} />} title="Ordered more than once" value={`${cust.repeatPct}%`} subtitle="bills with 2 or more orders sent" color="bg-blue-500" />
                <InsightCard icon={<UtensilsCrossed size={22} />} title="Dishes per bill" value={cust.dishes.toFixed(1)} subtitle="dine-in average" color="bg-teal-500" />
                <InsightCard icon={<Users size={22} />} title="Average time at table" value={fmtMin(cust.sit)} subtitle={`usual: ${fmtMin(cust.sitMedian)}`} color="bg-indigo-500" />
              </div>
              <ChartCard title="Time at table by arrival hour" subtitle="Average minutes, by the hour the customer started ordering">
                {sitByHour.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sitByHour}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit="m" />
                        <Tooltip formatter={(v, n, p) => [`${v} min (${p.payload.bills} bills)`, 'Average time at table']} />
                        <Bar dataKey="minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Do bigger orders take longer?" subtitle="Average wait for the whole order, by how many dishes were in it">
                {waitByRoundSize.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waitByRoundSize}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit="m" />
                        <Tooltip formatter={(v, n, p) => [`${v} min (${p.payload.rounds} orders)`, 'Average wait']} />
                        <Bar dataKey="minutes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Do people who order more stay longer?" subtitle="Average time at the table, by dishes on the bill">
                {sitByDishes.length === 0 ? <p className="text-sm text-gray-400">No data.</p> : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sitByDishes}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} unit="m" />
                        <Tooltip formatter={(v, n, p) => [`${v} min (${p.payload.bills} bills)`, 'Average time at table']} />
                        <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Ordering again" subtitle="Bills grouped by how many orders were sent to the kitchen">
                <Table head={['Orders sent', 'Bills', 'Dishes per bill', 'Time at table', 'Time until 2nd order']}>
                  {byRounds.map(r => (
                    <tr key={r.label}><td className="py-2 pr-4 font-medium">{r.label}</td><td className="pr-4">{r.bills}</td><td className="pr-4">{r.dishes.toFixed(1)}</td><td className="pr-4 font-semibold text-indigo-600">{fmtMin(r.sit)}</td><td>{fmtMin(r.gap)}</td></tr>
                  ))}
                </Table>
              </ChartCard>
            </div>
          </details>
        </>
      )}

      {parcelVisits.length > 0 && (
        <ChartCard title="Parcel orders" subtitle="From the first item added until the bill was cleared (handed over). Ready-time estimates are in the Parcel Analysis tab.">
          <p className="text-2xl font-bold text-gray-900">{fmtMin(median(parcelVisits.map(v => v.sit)))}</p>
          <p className="text-xs text-gray-500">usual time over {parcelVisits.length} parcel bills · average {fmtMin(avg(parcelVisits.map(v => v.sit)))}</p>
        </ChartCard>
      )}

      <details className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-semibold text-gray-700 flex items-center gap-2"><HelpCircle size={16} /> How are these numbers worked out?</summary>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li>Every dish is timed from “Send Token” to the moment someone taps Serve for it.</li>
          <li>The colours use the waiting-time limits set for each kitchen in Kitchen settings → Kitchen screen layout.</li>
          <li>“Usually” means the middle value, so one forgotten Serve tap does not spoil the number.</li>
          <li>Portions count separately: 3 plates of rice count as 3 dishes. Times over 4 hours are ignored (a forgotten tap).</li>
        </ul>
      </details>
    </div>
  );
}

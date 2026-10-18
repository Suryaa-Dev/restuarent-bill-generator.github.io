import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { billTotal, billQty, inr, num, COLORS } from '../../lib/analytics';
import { WEEKDAYS_MON_FIRST, formatDateKey, formatISTTime } from '../../lib/time';
import { ChartCard, InsightCard, LoadingBlock } from './shared';

const SLOTS = [
  { id: 'morning', label: 'Morning', hint: '5 AM - 11 AM', test: h => h >= 5 && h < 11 },
  { id: 'lunch', label: 'Lunch', hint: '11 AM - 3 PM', test: h => h >= 11 && h < 15 },
  { id: 'evening', label: 'Evening', hint: '3 PM - 7 PM', test: h => h >= 15 && h < 19 },
  { id: 'dinner', label: 'Dinner', hint: '7 PM - 11 PM', test: h => h >= 19 && h < 23 },
  { id: 'late', label: 'Late night', hint: '11 PM - 5 AM', test: h => h >= 23 || h < 5 },
];

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (a, b) => (b ? (a / b) * 100 : 0);

export default function CustomerInsightsTab({ bills, loading }) {
  const d = useMemo(() => {
    const n = bills.length;
    if (!n) return null;
    const totals = bills.map(billTotal);
    const qtys = bills.map(billQty);
    const sales = totals.reduce((s, v) => s + v, 0);

    // ---- items per bill ----
    const sizeBuckets = [1, 2, 3, 4, 5, 6].map(k => ({ label: k === 6 ? '6+' : String(k), count: 0 }));
    qtys.forEach(q => { sizeBuckets[Math.min(Math.max(q, 1), 6) - 1].count += 1; });
    sizeBuckets.forEach(b => { b.share = pct(b.count, n); });

    const segment = (test) => {
      const idx = qtys.map((q, i) => (test(q) ? i : -1)).filter(i => i >= 0);
      const s = idx.reduce((acc, i) => acc + totals[i], 0);
      return { count: idx.length, share: pct(idx.length, n), avg: idx.length ? s / idx.length : 0 };
    };
    const segments = {
      small: segment(q => q <= 2),
      medium: segment(q => q >= 3 && q <= 5),
      large: segment(q => q >= 6),
    };

    // ---- bill value distribution (bucket width adapts to this period's data) ----
    const sortedTotals = [...totals].sort((a, b) => a - b);
    const p90 = sortedTotals[Math.min(n - 1, Math.floor(n * 0.9))] || 1;
    const step = Math.max(50, Math.ceil(p90 / 5 / 50) * 50);
    const valueBuckets = Array.from({ length: 6 }, (_, i) => ({
      label: i === 5 ? `${5 * step}+` : `${i * step}-${(i + 1) * step}`, count: 0,
    }));
    totals.forEach(t => { valueBuckets[Math.min(Math.floor(t / step), 5)].count += 1; });
    valueBuckets.forEach(b => { b.share = pct(b.count, n); });

    // ---- category popularity: % of bills containing it ----
    const catBills = {};
    bills.forEach(b => { new Set(b.items.map(i => i.category)).forEach(c => { catBills[c] = (catBills[c] || 0) + 1; }); });
    const categories = Object.entries(catBills)
      .map(([name, count]) => ({ name, count, share: pct(count, n) }))
      .sort((a, b) => b.count - a.count);

    // ---- what is ordered when (category mix per part of day) ----
    const catRevenue = {};
    bills.forEach(b => b.items.forEach(i => { catRevenue[i.category] = (catRevenue[i.category] || 0) + i.price * i.qty; }));
    const topCats = Object.entries(catRevenue).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
    const slotRows = SLOTS.map(slot => {
      const inSlot = bills.filter(b => slot.test(b.hour_of_day));
      const row = { ...slot, bills: inSlot.length, sales: 0, mix: {} };
      let rev = 0;
      inSlot.forEach(b => {
        row.sales += billTotal(b);
        b.items.forEach(i => {
          const key = topCats.includes(i.category) ? i.category : 'Other';
          row.mix[key] = (row.mix[key] || 0) + i.price * i.qty;
          rev += i.price * i.qty;
        });
      });
      row.avg = inSlot.length ? row.sales / inSlot.length : 0;
      row.chart = { label: slot.label };
      [...topCats, 'Other'].forEach(c => { row.chart[c] = rev ? +(((row.mix[c] || 0) / rev) * 100).toFixed(1) : 0; });
      return row;
    }).filter(r => r.bills > 0);
    const mixKeys = [...topCats, ...(slotRows.some(r => r.mix.Other) ? ['Other'] : [])];

    // ---- weekdays ----
    const weekdays = WEEKDAYS_MON_FIRST.map(w => {
      const wb = bills.filter(b => b.day_of_week === w);
      const s = wb.reduce((acc, b) => acc + billTotal(b), 0);
      return { weekday: w, short: w.slice(0, 3), bills: wb.length, sales: s, avg: wb.length ? s / wb.length : 0, items: wb.length ? wb.reduce((acc, b) => acc + billQty(b), 0) / wb.length : 0 };
    });

    // ---- tables ----
    const tableMap = {};
    bills.forEach(b => {
      const t = (tableMap[b.table_number] = tableMap[b.table_number] || { table: b.table_number, bills: 0, sales: 0 });
      t.bills += 1;
      t.sales += billTotal(b);
    });
    const tables = Object.values(tableMap).map(t => ({ ...t, name: `T${t.table}`, avg: t.sales / t.bills })).sort((a, b) => a.table - b.table);
    const busiestTable = [...tables].sort((a, b) => b.bills - a.bills)[0];

    // ---- biggest bills ----
    const biggest = [...bills].sort((a, b) => billTotal(b) - billTotal(a)).slice(0, 5);

    const maxQty = Math.max(...qtys);
    const parcelShare = pct(bills.filter(b => b.is_parcel).length, n);

    return {
      n, sales, avg: sales / n, median: median(totals), avgItems: qtys.reduce((s, v) => s + v, 0) / n,
      biggestBill: Math.max(...totals), maxQty, sizeBuckets, segments, valueBuckets, step, categories,
      slotRows, mixKeys, weekdays, tables, busiestTable, biggest, parcelShare,
    };
  }, [bills]);

  if (loading) return <LoadingBlock label="Loading customer insights..." />;
  if (!d) return null;

  const bestWeekday = [...d.weekdays].filter(w => w.bills).sort((a, b) => b.avg - a.avg)[0];
  const segCards = [
    { key: 'small', title: 'Quick orders', desc: '1-2 items', tone: 'bg-blue-50 border-blue-100 text-blue-700' },
    { key: 'medium', title: 'Regular orders', desc: '3-5 items', tone: 'bg-green-50 border-green-100 text-green-700' },
    { key: 'large', title: 'Big orders', desc: '6+ items', tone: 'bg-purple-50 border-purple-100 text-purple-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard icon="🧾" title="Average bill" color="bg-green-500" value={inr(d.avg)} subtitle={`Typical (median) bill ${inr(d.median)}`} />
        <InsightCard icon="🛒" title="Items per bill" color="bg-blue-500" value={d.avgItems.toFixed(1)} subtitle={`Largest order: ${d.maxQty} items`} />
        <InsightCard icon="🏆" title="Biggest bill" color="bg-orange-500" value={inr(d.biggestBill)} subtitle={`${(d.biggestBill / d.avg).toFixed(1)}x the average`} />
        <InsightCard icon="📦" title="Parcel share" color="bg-purple-500" value={`${d.parcelShare.toFixed(0)}%`} subtitle="of bills were parcel" />
      </div>

      {/* Order size */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {segCards.map(s => (
          <div key={s.key} className={`rounded-xl border p-5 ${s.tone}`}>
            <p className="text-sm font-semibold">{s.title} <span className="font-normal opacity-70">({s.desc})</span></p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{d.segments[s.key].share.toFixed(0)}%</p>
            <p className="text-sm text-gray-600">{num(d.segments[s.key].count)} bills · avg {inr(d.segments[s.key].avg)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="How many items per bill" subtitle="% of bills">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.sizeBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis unit="%" width={44} />
              <Tooltip formatter={(v, n, p) => [`${v.toFixed(1)}% (${p.payload.count} bills)`, 'Bills']} labelFormatter={(l) => `${l} item${l === '1' ? '' : 's'}`} />
              <Bar dataKey="share" fill="#60a5fa" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="share" position="top" formatter={(v) => (v >= 1 ? `${v.toFixed(0)}%` : '')} style={{ fontSize: 11, fill: '#6b7280' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="How much a bill is worth" subtitle={`Bill value in Rs., groups of ${inr(d.step)}`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.valueBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis unit="%" width={44} />
              <Tooltip formatter={(v, n, p) => [`${v.toFixed(1)}% (${p.payload.count} bills)`, 'Bills']} />
              <Bar dataKey="share" fill="#4ade80" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="share" position="top" formatter={(v) => (v >= 1 ? `${v.toFixed(0)}%` : '')} style={{ fontSize: 11, fill: '#6b7280' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Category reach */}
      <ChartCard title="What customers reach for" subtitle="% of bills that include at least one item from the category">
        <div className="space-y-3">
          {d.categories.map((c, i) => (
            <div key={c.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800">{c.name}</span>
                <span className="text-gray-600">{c.share.toFixed(0)}% <span className="text-gray-400">({num(c.count)} bills)</span></span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${c.share}%`, background: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Time of day */}
      <ChartCard title="What sells at different times of day" subtitle="Share of revenue by category in each part of the day (IST)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={d.slotRows.map(r => r.chart)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis unit="%" domain={[0, 100]} width={44} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend />
            {d.mixKeys.map((c, i) => <Bar key={c} dataKey={c} stackId="mix" fill={COLORS[i % COLORS.length]} />)}
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-2 font-medium">Part of day</th>
                <th className="text-right py-2 font-medium">Bills</th>
                <th className="text-right py-2 font-medium">Sales</th>
                <th className="text-right py-2 font-medium">Avg bill</th>
              </tr>
            </thead>
            <tbody>
              {d.slotRows.map(r => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-gray-800">{r.label} <span className="text-gray-400 font-normal">{r.hint}</span></td>
                  <td className="py-2 text-right text-gray-600">{num(r.bills)}</td>
                  <td className="py-2 text-right text-gray-600">{inr(r.sales)}</td>
                  <td className="py-2 text-right font-semibold text-green-700">{inr(r.avg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Weekdays */}
      <ChartCard
        title="Spending by weekday"
        subtitle={bestWeekday ? `Customers spend the most per bill on ${bestWeekday.weekday}s (${inr(bestWeekday.avg)})` : ''}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-2 font-medium">Weekday</th>
                <th className="text-right py-2 font-medium">Bills</th>
                <th className="text-right py-2 font-medium">Sales</th>
                <th className="text-right py-2 font-medium">Avg bill</th>
                <th className="text-right py-2 font-medium">Items/bill</th>
              </tr>
            </thead>
            <tbody>
              {d.weekdays.map(w => (
                <tr key={w.weekday} className="border-b border-gray-100">
                  <td className="py-2 font-medium text-gray-800">{w.weekday}</td>
                  <td className="py-2 text-right text-gray-600">{w.bills ? num(w.bills) : '—'}</td>
                  <td className="py-2 text-right text-gray-600">{w.bills ? inr(w.sales) : '—'}</td>
                  <td className={`py-2 text-right font-semibold ${w.weekday === bestWeekday?.weekday ? 'text-green-700' : 'text-gray-700'}`}>{w.bills ? inr(w.avg) : '—'}</td>
                  <td className="py-2 text-right text-gray-600">{w.bills ? w.items.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Table usage" subtitle={d.busiestTable ? `Busiest: Table ${d.busiestTable.table} with ${d.busiestTable.bills} bills` : ''}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.tables}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} width={36} />
              <Tooltip formatter={(v, n, p) => [`${v} bills · ${inr(p.payload.sales)} · avg ${inr(p.payload.avg)}`, 'Table']} />
              <Bar dataKey="bills" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Biggest bills" subtitle="Top 5 in this period">
          <div className="space-y-2">
            {d.biggest.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl font-bold text-gray-300 w-7">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Table {b.table_number}{b.is_parcel && <span className="ml-2 text-[11px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">Parcel</span>}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateKey(b.date_ist)} · {formatISTTime(b.completed_at)} · {billQty(b)} items</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">{inr(billTotal(b))}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
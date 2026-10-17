import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { billTotal, inr, num } from '../../lib/analytics';
import { WEEKDAYS_MON_FIRST, formatHour, formatDateKey, eachDateKey, weekdayOfKey, addDaysToKey } from '../../lib/time';
import { ChartCard, InsightCard, LoadingBlock, compactMoney } from './shared';

const weekStartKey = (key) => addDaysToKey(key, -WEEKDAYS_MON_FIRST.indexOf(weekdayOfKey(key)));

// consecutive hours -> "7 PM – 10 PM"
function toWindows(hours) {
  const sorted = [...hours].sort((a, b) => a - b);
  const out = [];
  sorted.forEach(h => {
    const last = out[out.length - 1];
    if (last && h === last.end + 1) last.end = h; else out.push({ start: h, end: h });
  });
  return out.map(w => `${formatHour(w.start)} – ${formatHour((w.end + 1) % 24)}`);
}

const MetricToggle = ({ metric, setMetric }) => (
  <div className="flex gap-2 mb-3">
    {[['orders', 'Bills'], ['sales', 'Sales']].map(([k, label]) => (
      <button
        key={k}
        onClick={() => setMetric(k)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium ${metric === k ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

export default function TimeAnalyticsTab({ bills, range, loading }) {
  const [metric, setMetric] = useState('orders'); // 'orders' | 'sales'

  const data = useMemo(() => {
    if (!range || bills.length === 0) return null;

    // ---- per day (days with no sales are kept as zeros so the trend has no gaps) ----
    const dayMap = {};
    eachDateKey(range.startKey, range.endKey).forEach(k => {
      dayMap[k] = { key: k, label: formatDateKey(k, false), weekday: weekdayOfKey(k), sales: 0, orders: 0 };
    });
    bills.forEach(b => {
      const d = dayMap[b.date_ist];
      if (d) { d.sales += billTotal(b); d.orders += 1; }
    });
    const days = Object.values(dayMap);
    const openDays = days.filter(d => d.orders > 0);
    const nOpen = openDays.length || 1; // averages are per day that actually had sales

    // ---- per hour ----
    const hourRows = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: formatHour(h), orders: 0, sales: 0 }));
    bills.forEach(b => { const r = hourRows[b.hour_of_day]; r.orders += 1; r.sales += billTotal(b); });
    const activeHours = hourRows.filter(h => h.orders > 0);
    const hMin = activeHours[0].hour;
    const hMax = activeHours[activeHours.length - 1].hour;
    const hourProfile = hourRows.slice(hMin, hMax + 1).map(h => ({
      ...h,
      avgOrders: +(h.orders / nOpen).toFixed(1),
      avgSales: Math.round(h.sales / nOpen),
    }));

    // ---- per weekday (average per day that had sales: 5 Saturdays vs 4 Mondays stays fair) ----
    const weekdayProfile = WEEKDAYS_MON_FIRST.map(w => {
      const ds = openDays.filter(d => d.weekday === w);
      const sales = ds.reduce((s, d) => s + d.sales, 0);
      const orders = ds.reduce((s, d) => s + d.orders, 0);
      return {
        weekday: w,
        short: w.slice(0, 3),
        days: ds.length,
        sales,
        orders,
        avgSales: ds.length ? Math.round(sales / ds.length) : 0,
        avgOrders: ds.length ? +(orders / ds.length).toFixed(1) : 0,
      };
    });

    // ---- weekday x hour grid ----
    const grid = {};
    let gridMaxOrders = 0;
    let gridMaxSales = 0;
    bills.forEach(b => {
      const key = `${b.day_of_week}-${b.hour_of_day}`;
      const c = (grid[key] = grid[key] || { orders: 0, sales: 0 });
      c.orders += 1;
      c.sales += billTotal(b);
      gridMaxOrders = Math.max(gridMaxOrders, c.orders);
      gridMaxSales = Math.max(gridMaxSales, c.sales);
    });
    const topSlots = Object.entries(grid)
      .map(([k, v]) => { const [w, h] = k.split('-'); return { weekday: w, hour: Number(h), ...v }; })
      .sort((a, b) => b.orders - a.orders || b.sales - a.sales)
      .slice(0, 3);

    // ---- rush / quiet windows (relative to this period's own peak hour) ----
    const peak = Math.max(...hourProfile.map(h => h.orders));
    const rush = hourProfile.filter(h => h.orders >= peak * 0.7).map(h => h.hour);
    const quiet = hourProfile.filter(h => h.orders <= peak * 0.3).map(h => h.hour);

    // ---- per week (shown only for 2+ weeks) ----
    const weekMap = {};
    days.forEach(d => {
      const k = weekStartKey(d.key);
      weekMap[k] = weekMap[k] || { key: k, label: `Wk ${formatDateKey(k, false)}`, sales: 0, orders: 0 };
      weekMap[k].sales += d.sales;
      weekMap[k].orders += d.orders;
    });
    const weeks = Object.values(weekMap);

    const withSales = weekdayProfile.filter(w => w.days > 0);
    const totalSales = bills.reduce((s, b) => s + billTotal(b), 0);

    return {
      days, nOpen, hourProfile, weekdayProfile, grid, gridMaxOrders, gridMaxSales, topSlots,
      rush, quiet, weeks, hMin, hMax,
      bestDay: [...openDays].sort((a, b) => b.sales - a.sales)[0],
      bestWeekday: [...withSales].sort((a, b) => b.avgSales - a.avgSales)[0],
      slowWeekday: [...withSales].sort((a, b) => a.avgSales - b.avgSales)[0],
      avgSalesPerDay: totalSales / nOpen,
      avgOrdersPerDay: bills.length / nOpen,
      avgBill: totalSales / bills.length,
      busiestHour: [...hourProfile].sort((a, b) => b.orders - a.orders)[0],
    };
  }, [bills, range]);

  if (loading) return <LoadingBlock label="Loading time analytics..." />;
  if (!data) return null;

  const {
    days, nOpen, hourProfile, weekdayProfile, grid, gridMaxOrders, gridMaxSales, topSlots,
    rush, quiet, weeks, bestDay, bestWeekday, slowWeekday, hMin, hMax,
    avgSalesPerDay, avgOrdersPerDay, avgBill, busiestHour,
  } = data;

  const isSingleDay = range.days === 1;
  const hoursShown = Array.from({ length: hMax - hMin + 1 }, (_, i) => hMin + i);
  const gridMax = metric === 'orders' ? gridMaxOrders : gridMaxSales;
  const hourKey = isSingleDay ? metric : metric === 'orders' ? 'avgOrders' : 'avgSales';

  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InsightCard
          icon="🔥" title="Busiest hour" color="bg-red-500"
          value={formatHour(busiestHour.hour)}
          subtitle={isSingleDay ? `${busiestHour.orders} bills` : `${busiestHour.avgOrders} bills per day on average`}
        />
        <InsightCard
          icon="📅" color="bg-green-500"
          title={isSingleDay ? 'Average bill' : 'Strongest weekday'}
          value={isSingleDay ? inr(avgBill) : bestWeekday?.weekday || '—'}
          subtitle={isSingleDay ? `${num(avgOrdersPerDay)} bills` : `${inr(bestWeekday?.avgSales)} per day on average`}
        />
        <InsightCard
          icon="💰" color="bg-orange-500"
          title={isSingleDay ? 'Sales' : 'Best day in period'}
          value={isSingleDay ? inr(avgSalesPerDay) : bestDay ? formatDateKey(bestDay.key) : '—'}
          subtitle={isSingleDay ? '' : bestDay ? `${inr(bestDay.sales)} · ${bestDay.orders} bills` : ''}
        />
        <InsightCard
          icon="📈" title="Average open day" color="bg-blue-500"
          value={inr(avgSalesPerDay)}
          subtitle={`${num(avgOrdersPerDay)} bills · ${nOpen} day${nOpen === 1 ? '' : 's'} with sales`}
        />
      </div>

      {/* Staffing guide */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Rush &amp; quiet windows</h3>
        <p className="text-sm text-gray-500 mb-4">
          Rush = hours with at least 70% of your busiest hour's bills. Quiet = 30% or less. Based on this period only.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-red-50 border border-red-100 p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">Rush</p>
            <p className="text-gray-900 font-bold">{toWindows(rush).join(', ') || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Have everyone in and prep done before this.</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm font-semibold text-blue-700 mb-1">Quiet</p>
            <p className="text-gray-900 font-bold">{toWindows(quiet).join(', ') || 'No clearly quiet hours'}</p>
            <p className="text-xs text-gray-500 mt-1">Good time for breaks, restocking, cleaning.</p>
          </div>
          <div className="rounded-lg bg-orange-50 border border-orange-100 p-4">
            <p className="text-sm font-semibold text-orange-700 mb-1">{isSingleDay ? 'Top hours' : 'Hottest weekday + hour slots'}</p>
            <ul className="text-gray-900 text-sm space-y-0.5">
              {topSlots.map(s => (
                <li key={`${s.weekday}-${s.hour}`} className="font-semibold">
                  {isSingleDay ? '' : `${s.weekday.slice(0, 3)} `}{formatHour(s.hour)}
                  <span className="font-normal text-gray-500"> · {s.orders} bills · {inr(s.sales)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Daily trend */}
      {!isSingleDay && (
        <ChartCard title="Daily trend" subtitle="Sales (bars) and number of bills (line). Dashed line = average open day.">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} />
              <YAxis yAxisId="left" tickFormatter={compactMoney} width={56} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} width={36} />
              <Tooltip formatter={(v, n) => (n === 'Sales' ? inr(v) : v)} />
              <Legend />
              <ReferenceLine yAxisId="left" y={avgSalesPerDay} stroke="#9ca3af" strokeDasharray="5 5" />
              <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#4ade80" radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="Bills" stroke="#6366f1" strokeWidth={2} dot={days.length <= 31} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Hour profile */}
      <ChartCard
        title={isSingleDay ? 'Hour by hour' : 'A typical day, hour by hour'}
        subtitle={isSingleDay ? 'Per hour (IST)' : `Average per day that had sales (${nOpen} day${nOpen === 1 ? '' : 's'}), IST`}
      >
        <MetricToggle metric={metric} setMetric={setMetric} />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourProfile}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={metric === 'sales' ? compactMoney : undefined} width={metric === 'sales' ? 56 : 40} />
            <Tooltip formatter={(v) => (metric === 'sales' ? inr(v) : v)} />
            <Bar dataKey={hourKey} name={metric === 'orders' ? 'Bills' : 'Sales'} radius={[4, 4, 0, 0]}>
              {hourProfile.map(h => (
                <Cell key={h.hour} fill={rush.includes(h.hour) ? '#ef4444' : quiet.includes(h.hour) ? '#93c5fd' : '#ff7e47'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2">Red = rush hours, light blue = quiet hours.</p>
      </ChartCard>

      {/* Weekday profile */}
      {!isSingleDay && (
        <ChartCard
          title="Which weekdays earn most"
          subtitle="Average sales per day that had sales, so a month with five Saturdays doesn't unfairly beat one with four."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekdayProfile}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="short" />
              <YAxis tickFormatter={compactMoney} width={56} />
              <Tooltip formatter={(v) => inr(v)} labelFormatter={(l, p) => p?.[0]?.payload?.weekday || l} />
              <Bar dataKey="avgSales" name="Avg sales / day" radius={[4, 4, 0, 0]}>
                {weekdayProfile.map(w => (
                  <Cell
                    key={w.weekday}
                    fill={w.weekday === bestWeekday?.weekday ? '#16a34a'
                      : w.weekday === slowWeekday?.weekday && bestWeekday?.weekday !== slowWeekday?.weekday ? '#93c5fd'
                        : '#4ade80'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left py-2 font-medium">Weekday</th>
                  <th className="text-right py-2 font-medium">Days</th>
                  <th className="text-right py-2 font-medium">Total sales</th>
                  <th className="text-right py-2 font-medium">Avg sales/day</th>
                  <th className="text-right py-2 font-medium">Avg bills/day</th>
                </tr>
              </thead>
              <tbody>
                {weekdayProfile.map(w => (
                  <tr key={w.weekday} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-800">{w.weekday}</td>
                    <td className="py-2 text-right text-gray-600">{w.days}</td>
                    <td className="py-2 text-right text-gray-600">{inr(w.sales)}</td>
                    <td className="py-2 text-right font-semibold text-green-700">{w.days ? inr(w.avgSales) : '—'}</td>
                    <td className="py-2 text-right text-gray-600">{w.days ? w.avgOrders : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Weekday x hour heat grid */}
      {!isSingleDay && (
        <ChartCard title="Busy-slot heat map" subtitle="Every weekday and hour in the period. Darker = busier.">
          <MetricToggle metric={metric} setMetric={setMetric} />
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th />
                  {hoursShown.map(h => <th key={h} className="font-medium text-gray-500 px-1 min-w-10">{formatHour(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS_MON_FIRST.map(w => (
                  <tr key={w}>
                    <td className="pr-2 font-medium text-gray-600 whitespace-nowrap">{w.slice(0, 3)}</td>
                    {hoursShown.map(h => {
                      const cell = grid[`${w}-${h}`];
                      const v = cell ? cell[metric] : 0;
                      const alpha = v && gridMax ? 0.12 + 0.88 * (v / gridMax) : 0;
                      return (
                        <td
                          key={h}
                          title={cell ? `${w} ${formatHour(h)}: ${cell.orders} bills, ${inr(cell.sales)}` : `${w} ${formatHour(h)}: no bills`}
                          className="h-9 min-w-10 text-center rounded"
                          style={{ background: v ? `rgba(255,126,71,${alpha})` : '#f3f4f6', color: alpha > 0.55 ? '#fff' : '#374151' }}
                        >
                          {v ? (metric === 'orders' ? v : compactMoney(Math.round(v))) : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Weekly trend: only when there are at least 2 weeks to compare */}
      {weeks.length >= 2 && (
        <ChartCard title="Week by week" subtitle="Weeks start on Monday. The first and last week may be partial.">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeks}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis yAxisId="left" tickFormatter={compactMoney} width={56} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} width={36} />
              <Tooltip formatter={(v, n) => (n === 'Sales' ? inr(v) : v)} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="sales" name="Sales" stroke="#ff7e47" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="Bills" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

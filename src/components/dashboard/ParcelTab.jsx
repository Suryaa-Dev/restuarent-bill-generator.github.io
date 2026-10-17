import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, IndianRupee, Percent, ShoppingBag } from 'lucide-react';
import { summarize, pctChange, rangeLabel, inr, num, billTotal } from '../../lib/analytics';
import { formatHour, formatDateKey, eachDateKey, WEEKDAYS_MON_FIRST } from '../../lib/time';
import { ChartCard, StatCard, LoadingBlock, compactMoney } from './shared';

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(0)}%` : '0%');

export default function ParcelTab({ bills, prevBills, range, dateRange, loading }) {
  const [metric, setMetric] = useState('orders');

  const parcel = useMemo(() => bills.filter(b => b.is_parcel), [bills]);
  const dineIn = useMemo(() => bills.filter(b => !b.is_parcel), [bills]);
  const prevParcel = useMemo(() => prevBills.filter(b => b.is_parcel), [prevBills]);

  const P = useMemo(() => summarize(parcel), [parcel]);
  const D = useMemo(() => summarize(dineIn), [dineIn]);
  const T = useMemo(() => summarize(bills), [bills]);
  const PP = useMemo(() => summarize(prevParcel), [prevParcel]);
  const compareLabel = rangeLabel(dateRange, range);

  // dine-in vs parcel, hour by hour (single day) or day by day
  const split = useMemo(() => {
    if (!range) return [];
    const make = (label) => ({ label, dineOrders: 0, parcelOrders: 0, dineSales: 0, parcelSales: 0 });
    let rows, keyOf;
    if (range.days === 1) {
      const hours = bills.map(b => b.hour_of_day);
      if (!hours.length) return [];
      const from = Math.min(...hours), to = Math.max(...hours);
      rows = Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, make(formatHour(from + i))]));
      keyOf = b => b.hour_of_day;
    } else {
      rows = Object.fromEntries(eachDateKey(range.startKey, range.endKey).map(k => [k, make(formatDateKey(k, false))]));
      keyOf = b => b.date_ist;
    }
    bills.forEach(b => {
      const r = rows[keyOf(b)];
      if (!r) return;
      if (b.is_parcel) { r.parcelOrders += 1; r.parcelSales += billTotal(b); }
      else { r.dineOrders += 1; r.dineSales += billTotal(b); }
    });
    return Object.values(rows);
  }, [bills, range]);

  const items = useMemo(() => {
    const m = {};
    bills.forEach(b => b.items.forEach(i => {
      const key = `${i.name}||${i.category}`;
      const r = (m[key] = m[key] || { key, name: i.name, category: i.category, parcelQty: 0, totalQty: 0, parcelRevenue: 0 });
      r.totalQty += i.qty;
      if (b.is_parcel) { r.parcelQty += i.qty; r.parcelRevenue += i.price * i.qty; }
    }));
    return Object.values(m).filter(r => r.parcelQty > 0);
  }, [bills]);
  const topParcelItems = useMemo(() => [...items].sort((a, b) => b.parcelQty - a.parcelQty).slice(0, 10), [items]);
  const parcelHeavy = useMemo(
    () => items.filter(r => r.totalQty >= 5).map(r => ({ ...r, share: r.parcelQty / r.totalQty })).sort((a, b) => b.share - a.share).slice(0, 5),
    [items]
  );

  const byCategory = useMemo(() => {
    const m = {};
    parcel.forEach(b => b.items.forEach(i => { m[i.category] = (m[i.category] || 0) + i.price * i.qty; }));
    return Object.entries(m).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [parcel]);

  const byWeekday = useMemo(() => WEEKDAYS_MON_FIRST.map(w => {
    const all = bills.filter(b => b.day_of_week === w);
    const par = all.filter(b => b.is_parcel);
    return { day: w.slice(0, 3), full: w, parcel: par.length, share: all.length ? Math.round((par.length / all.length) * 100) : 0 };
  }), [bills]);

  if (loading) return <LoadingBlock label="Loading parcel analysis..." />;

  if (parcel.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <div className="text-5xl mb-3">📦</div>
        <p className="text-lg font-semibold text-gray-800">No parcel orders in this period</p>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          Tap <b>Parcel</b> on a bill before clearing it and it will show up here. Bills cleared before the Parcel
          button existed are counted as dine-in.
        </p>
      </div>
    );
  }

  const avgDiff = pctChange(P.avg, D.avg);
  const itemsPerParcel = P.orders ? P.items / P.orders : 0;
  const itemsPerDine = D.orders ? D.items / D.orders : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Package />} title="Parcel Orders" value={num(P.orders)} change={pctChange(P.orders, PP.orders)} compareLabel={compareLabel} color="bg-purple-500" />
        <StatCard icon={<IndianRupee />} title="Parcel Sales" value={inr(P.sales)} change={pctChange(P.sales, PP.sales)} compareLabel={compareLabel} color="bg-green-500" delay={0.05} />
        <StatCard icon={<Percent />} title="Share of Orders" value={pct(P.orders, T.orders)} color="bg-blue-500" delay={0.1} compareLabel={`${pct(P.sales, T.sales)} of sales`} change={null} />
        <StatCard icon={<ShoppingBag />} title="Avg Parcel Bill" value={inr(P.avg)} change={avgDiff} compareLabel="avg dine-in bill" color="bg-orange-500" delay={0.15} />
      </div>

      <ChartCard title="Dine-in vs Parcel" subtitle={range?.days === 1 ? 'Hour by hour (IST)' : 'Day by day'}>
        <div className="flex gap-2 mb-3">
          {[['orders', 'Bills'], ['sales', 'Sales']].map(([k, label]) => (
            <button key={k} onClick={() => setMetric(k)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${metric === k ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={split}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickFormatter={metric === 'sales' ? compactMoney : undefined} allowDecimals={false} width={metric === 'sales' ? 56 : 40} />
            <Tooltip formatter={(v) => (metric === 'sales' ? inr(v) : v)} />
            <Legend />
            <Bar dataKey={metric === 'orders' ? 'dineOrders' : 'dineSales'} stackId="a" name="Dine-in" fill="#fdba74" />
            <Bar dataKey={metric === 'orders' ? 'parcelOrders' : 'parcelSales'} stackId="a" name="Parcel" fill="#9333ea" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Dine-in vs Parcel bills" subtitle="How the two kinds of bill compare">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-2 font-medium" />
                <th className="text-right py-2 font-medium">Dine-in</th>
                <th className="text-right py-2 font-medium text-purple-700">Parcel</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Bills', num(D.orders), num(P.orders)],
                ['Sales', inr(D.sales), inr(P.sales)],
                ['Average bill', inr(D.avg), inr(P.avg)],
                ['Items per bill', itemsPerDine.toFixed(1), itemsPerParcel.toFixed(1)],
              ].map(([label, a, b]) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-600">{label}</td>
                  <td className="py-2.5 text-right font-medium text-gray-800">{a}</td>
                  <td className="py-2.5 text-right font-semibold text-purple-700">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>

        <ChartCard title="Parcel share by weekday" subtitle="% of that weekday's bills that were parcel">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byWeekday}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis unit="%" width={44} />
              <Tooltip formatter={(v, n, p) => [`${v}% (${p.payload.parcel} parcel bills)`, 'Parcel share']} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} />
              <Bar dataKey="share" name="Parcel share" fill="#9333ea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top parcel items" subtitle="By quantity sold as parcel">
          <div className="space-y-1">
            {topParcelItems.map((r, idx) => (
              <div key={r.key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <p className="text-sm text-gray-900"><span className="text-gray-300 font-bold mr-2">#{idx + 1}</span>{r.name}</p>
                <div className="text-right">
                  <span className="font-bold text-purple-700">{num(r.parcelQty)}x</span>
                  <span className="block text-xs text-gray-400">{inr(r.parcelRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <div className="space-y-6">
          <ChartCard title="Parcel sales by category">
            <div className="space-y-2">
              {byCategory.map(c => (
                <div key={c.name} className="flex justify-between text-sm">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="font-semibold text-gray-900">{inr(c.revenue)} <span className="text-gray-400 font-normal">· {pct(c.revenue, P.sales)}</span></span>
                </div>
              ))}
            </div>
          </ChartCard>

          {parcelHeavy.length > 0 && (
            <ChartCard title="Most takeaway-heavy items" subtitle="Highest share sold as parcel (items with 5+ sold)">
              <div className="space-y-2">
                {parcelHeavy.map(r => (
                  <div key={r.key} className="flex justify-between text-sm">
                    <span className="text-gray-700">{r.name}</span>
                    <span className="font-semibold text-purple-700">{(r.share * 100).toFixed(0)}% <span className="text-gray-400 font-normal">({r.parcelQty}/{r.totalQty})</span></span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </div>
      </div>
    </div>
  );
}

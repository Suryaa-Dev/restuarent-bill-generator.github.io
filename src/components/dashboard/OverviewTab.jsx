import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { summarize, pctChange, rangeLabel, inr, num, billTotal } from '../../lib/analytics';
import { formatHour, formatDateKey, eachDateKey } from '../../lib/time';
import { ChartCard, StatCard, LoadingBlock, compactMoney } from './shared';

export default function OverviewTab({ bills, prevBills, range, dateRange, loading }) {
  const cur = useMemo(() => summarize(bills), [bills]);
  const prev = useMemo(() => summarize(prevBills), [prevBills]);
  const compareLabel = rangeLabel(dateRange, range);

  // Single day -> hour by hour. Longer range -> day by day (days with no sales show as 0).
  const trend = useMemo(() => {
    if (!range) return [];
    if (range.days === 1) {
      const hours = bills.map(b => b.hour_of_day);
      if (hours.length === 0) return [];
      const from = Math.min(...hours), to = Math.max(...hours);
      const rows = Array.from({ length: to - from + 1 }, (_, i) => ({ label: formatHour(from + i), hour: from + i, sales: 0, orders: 0 }));
      bills.forEach(b => { const r = rows[b.hour_of_day - from]; r.sales += billTotal(b); r.orders += 1; });
      return rows;
    }
    const map = {};
    eachDateKey(range.startKey, range.endKey).forEach(k => { map[k] = { label: formatDateKey(k, false), key: k, sales: 0, orders: 0 }; });
    bills.forEach(b => { const r = map[b.date_ist]; if (r) { r.sales += billTotal(b); r.orders += 1; } });
    return Object.values(map);
  }, [bills, range]);

  const categories = useMemo(() => {
    const m = {};
    bills.forEach(b => b.items.forEach(i => {
      m[i.category] = m[i.category] || { name: i.category, value: 0, qty: 0 };
      m[i.category].value += i.price * i.qty;
      m[i.category].qty += i.qty;
    }));
    const list = Object.values(m).sort((a, b) => b.value - a.value);
    const total = list.reduce((s, c) => s + c.value, 0);
    return list.map(c => ({ ...c, share: total ? (c.value / total) * 100 : 0 }));
  }, [bills]);

  const peakHours = useMemo(() => {
    const m = {};
    bills.forEach(b => { m[b.hour_of_day] = (m[b.hour_of_day] || 0) + 1; });
    return Object.entries(m)
      .map(([h, orders]) => ({ hour: formatHour(Number(h)), orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
  }, [bills]);

  const topItems = useMemo(() => {
    const m = {};
    bills.forEach(b => b.items.forEach(i => {
      const key = `${i.name}||${i.portion}||${i.category}`;
      m[key] = m[key] || { name: i.name, portion: i.portion, quantity: 0, revenue: 0 };
      m[key].quantity += i.qty;
      m[key].revenue += i.price * i.qty;
    }));
    return Object.values(m).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [bills]);

  const parcelOrders = bills.filter(b => b.is_parcel).length;

  if (loading) return <LoadingBlock label="Loading overview..." />;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<IndianRupee />} title="Total Sales" value={inr(cur.sales)} change={pctChange(cur.sales, prev.sales)} compareLabel={compareLabel} color="bg-green-500" delay={0} />
        <StatCard icon={<ShoppingBag />} title="Bills Count" value={num(cur.orders)} change={pctChange(cur.orders, prev.orders)} compareLabel={compareLabel} color="bg-blue-500" delay={0.05} />
        <StatCard icon={<TrendingUp />} title="Average Bill" value={inr(cur.avg)} change={pctChange(cur.avg, prev.avg)} compareLabel={compareLabel} color="bg-purple-500" delay={0.1} />
        <StatCard icon={<Package />} title="Items Sold" value={num(cur.items)} change={pctChange(cur.items, prev.items)} compareLabel={compareLabel} color="bg-orange-500" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard
          title={range?.days === 1 ? 'Sales by Hour' : 'Daily Sales'}
          subtitle={range?.days === 1 ? 'Hour of day (IST)' : 'One bar per day'}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff7e47" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff7e47" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} />
              <YAxis tickFormatter={compactMoney} width={56} />
              <Tooltip formatter={(v, n) => (n === 'Sales' ? inr(v) : v)} />
              <Area type="monotone" dataKey="sales" name="Sales" stroke="#ff7e47" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales by Category" subtitle="Share of revenue">
          <div className="space-y-3">
            {categories.map((c, idx) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="text-gray-600">{inr(c.value)} · {c.share.toFixed(0)}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.share}%`, background: ['#ff7e47', '#4ade80', '#60a5fa', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'][idx % 7] }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Peak Hours" subtitle="Top 5 hours by number of bills">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="orders" name="Bills" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Top Selling Items</h3>
          <span className="text-sm text-gray-500">{parcelOrders > 0 && `${parcelOrders} parcel bill${parcelOrders === 1 ? '' : 's'} included`}</span>
        </div>
        <div className="space-y-1">
          {topItems.map((item, index) => (
            <motion.div
              key={`${item.name}-${item.portion}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-300 w-10">#{index + 1}</span>
                <p className="font-medium text-gray-900 text-sm">{item.name} <span className="text-gray-400">({item.portion})</span></p>
              </div>
              <div className="text-right">
                <span className="font-bold text-orange-600">{num(item.quantity)}x</span>
                <span className="block text-xs text-gray-400">{inr(item.revenue)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

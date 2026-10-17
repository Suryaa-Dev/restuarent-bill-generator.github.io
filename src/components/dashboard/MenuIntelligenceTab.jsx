import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, Search } from 'lucide-react';
import { inr, num, COLORS } from '../../lib/analytics';
import { formatDateKey, eachDateKey, weekdayOfKey, addDaysToKey, WEEKDAYS_MON_FIRST } from '../../lib/time';
import { ChartCard, InsightCard, LoadingBlock } from './shared';

const COLUMNS = [
  { key: 'name', label: 'Item', align: 'left' },
  { key: 'category', label: 'Category', align: 'left' },
  { key: 'quantity', label: 'Qty Sold', align: 'right' },
  { key: 'revenue', label: 'Revenue', align: 'right' },
  { key: 'share', label: '% of Sales', align: 'right' },
  { key: 'bills', label: 'In Bills', align: 'right' },
  { key: 'avgQty', label: 'Avg Qty/Bill', align: 'right' },
];

const DEFAULT_ROWS = 15;

export default function MenuIntelligenceTab({ bills, range, loading, menuItems }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState({ key: 'revenue', dir: 'desc' });
  const [showAll, setShowAll] = useState(false);

  // ---- every item sold in the period (grouped by name + category) ----
  const items = useMemo(() => {
    const m = {};
    bills.forEach(b => {
      const seenInBill = new Set();
      b.items.forEach(i => {
        const key = `${i.name}||${i.category}`;
        const row = (m[key] = m[key] || { key, name: i.name, category: i.category, quantity: 0, revenue: 0, bills: 0 });
        row.quantity += i.qty;
        row.revenue += i.price * i.qty;
        if (!seenInBill.has(key)) { row.bills += 1; seenInBill.add(key); }
      });
    });
    const list = Object.values(m);
    const total = list.reduce((s, r) => s + r.revenue, 0);
    return list.map(r => ({ ...r, share: total ? (r.revenue / total) * 100 : 0, avgQty: r.bills ? r.quantity / r.bills : 0 }));
  }, [bills]);

  const categories = useMemo(() => [...new Set(items.map(i => i.category))].sort(), [items]);

  const tableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = items.filter(i => (category === 'all' || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
    const dir = sort.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return cmp * dir || b.revenue - a.revenue;
    });
    return rows;
  }, [items, search, category, sort]);

  const visibleRows = showAll || search || category !== 'all' ? tableRows : tableRows.slice(0, DEFAULT_ROWS);

  // ---- items on the menu that did not sell at all ----
  const unsold = useMemo(() => {
    const sold = new Set(items.map(i => i.key));
    const seen = new Set();
    return (menuItems || [])
      .filter(m => !m.isHidden && !sold.has(`${m.name}||${m.category}`))
      .filter(m => { const k = `${m.name}||${m.category}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [items, menuItems]);

  // ---- items bought together (each pair counted once per bill) ----
  const pairings = useMemo(() => {
    const m = {};
    bills.forEach(b => {
      const names = [...new Set(b.items.map(i => i.name))];
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const pair = [names[i], names[j]].sort().join(' + ');
          m[pair] = (m[pair] || 0) + 1;
        }
      }
    });
    return Object.entries(m)
      .map(([pair, count]) => ({ pair, count, pct: bills.length ? (count / bills.length) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bills]);

  // ---- top-5 items over time (daily for up to ~5 weeks, weekly beyond that) ----
  const trend = useMemo(() => {
    if (!range || range.days === 1) return null;
    const top = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    if (top.length === 0) return null;
    const weekly = range.days > 35;
    const bucketOf = (dateKey) => (weekly ? addDaysToKey(dateKey, -WEEKDAYS_MON_FIRST.indexOf(weekdayOfKey(dateKey))) : dateKey);
    const buckets = {};
    eachDateKey(range.startKey, range.endKey).forEach(k => {
      const b = bucketOf(k);
      if (!buckets[b]) { buckets[b] = { key: b, label: weekly ? `Wk ${formatDateKey(b, false)}` : formatDateKey(b, false) }; top.forEach(t => { buckets[b][t.key] = 0; }); }
    });
    bills.forEach(b => b.items.forEach(i => {
      const t = top.find(x => x.key === `${i.name}||${i.category}`);
      const bucket = buckets[bucketOf(b.date_ist)];
      if (t && bucket) bucket[t.key] += i.qty;
    }));
    return { rows: Object.values(buckets), series: top.map(t => ({ key: t.key, name: t.name })), weekly };
  }, [items, bills, range]);

  if (loading) return <LoadingBlock label="Loading menu intelligence..." />;

  const hottest = [...items].sort((a, b) => b.quantity - a.quantity)[0];
  const champion = [...items].sort((a, b) => b.revenue - a.revenue)[0];

  const toggleSort = (key) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'category' ? 'asc' : 'desc' }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard icon="🔥" title="Most sold item" color="bg-red-500" value={hottest?.name || 'N/A'} subtitle={hottest ? `${num(hottest.quantity)} sold` : ''} />
        <InsightCard icon="💰" title="Highest revenue item" color="bg-green-500" value={champion?.name || 'N/A'} subtitle={champion ? `${inr(champion.revenue)} · ${champion.share.toFixed(0)}% of sales` : ''} />
        <InsightCard icon="🤝" title="Most common pairing" color="bg-blue-500" value={pairings[0]?.pair || 'Not enough multi-item bills'} subtitle={pairings[0] ? `together in ${pairings[0].count} bills (${pairings[0].pct.toFixed(0)}%)` : ''} />
      </div>

      {/* Complete item table */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">All items</h3>
            <p className="text-sm text-gray-500">{tableRows.length} of {items.length} items sold in this period</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item..."
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="all">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-500 w-8">#</th>
                {COLUMNS.map(c => (
                  <th key={c.key} className={`py-3 px-3 font-semibold text-gray-700 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-orange-600">
                      {c.label}
                      {sort.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((item, index) => (
                <tr key={item.key} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-2 text-gray-400">{index + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-900">{item.name}</td>
                  <td className="py-2.5 px-3 text-gray-500">{item.category}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{num(item.quantity)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-green-600">{inr(item.revenue)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-500">{item.share.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right text-blue-600">{num(item.bills)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{item.avgQty.toFixed(1)}</td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr><td colSpan={COLUMNS.length + 1} className="py-8 text-center text-gray-400">No items match.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!search && category === 'all' && tableRows.length > DEFAULT_ROWS && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="mt-4 w-full py-2.5 rounded-lg bg-orange-50 text-orange-700 font-semibold hover:bg-orange-100"
          >
            {showAll ? `Show top ${DEFAULT_ROWS} only` : `Show all ${tableRows.length} items`}
          </button>
        )}
      </div>

      {/* Not sold */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Not sold in this period</h3>
        <p className="text-sm text-gray-500 mb-4">Items that are on the menu but had zero sales. Candidates to promote, rework or remove.</p>
        {unsold.length === 0 ? (
          <p className="text-gray-500 text-sm">Every item on the menu sold at least once. 🎉</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unsold.map(m => (
              <span key={m.id} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm">
                {m.name} <span className="text-gray-400">· {m.category}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pairings */}
      <ChartCard title="Often ordered together" subtitle="Pairs of items that appear in the same bill. % = share of all bills in the period.">
        {pairings.length === 0 ? (
          <p className="text-gray-500 text-sm">Not enough multi-item bills yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, pairings.length * 34)}>
            <BarChart data={pairings} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="pair" type="category" width={210} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, n, p) => [`${v} bills (${p.payload.pct.toFixed(1)}%)`, 'Together']} />
              <Bar dataKey="count" name="Bills together" fill="#ff7e47" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Trend */}
      {trend && (
        <ChartCard title="Top 5 items over time" subtitle={`Quantity sold per ${trend.weekly ? 'week' : 'day'}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {trend.series.map((sr, idx) => (
                <Line key={sr.key} type="monotone" dataKey={sr.key} name={sr.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={trend.rows.length <= 31} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

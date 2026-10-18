import { summarize, billTotal } from './analytics';
import { formatHour, formatDateKey, eachDateKey, parseDbTimestamp } from './time';

// One place that turns (enriched) bills into everything the reports need,
// so the on-screen numbers, the PDFs and the CSVs can never disagree.
export function buildReportData(bills, range) {
    const stats = summarize(bills);
    const parcelBills = bills.filter(b => b.is_parcel);
    const dineBills = bills.filter(b => !b.is_parcel);
    const split = { parcel: summarize(parcelBills), dineIn: summarize(dineBills) };

    // ---- items (name + category; ALL of them, not just a top 10) ----
    const itemMap = {};
    bills.forEach(b => {
        const seen = new Set();
        b.items.forEach(i => {
            const key = `${i.name}||${i.category}`;
            const r = (itemMap[key] = itemMap[key] || { name: i.name, category: i.category, quantity: 0, revenue: 0, bills: 0, parcelQty: 0 });
            r.quantity += i.qty;
            r.revenue += i.price * i.qty;
            if (b.is_parcel) r.parcelQty += i.qty;
            if (!seen.has(key)) { r.bills += 1; seen.add(key); }
        });
    });
    const itemRevenue = Object.values(itemMap).reduce((s, r) => s + r.revenue, 0);
    const items = Object.values(itemMap)
        .map(r => ({ ...r, share: itemRevenue ? (r.revenue / itemRevenue) * 100 : 0, avgPrice: r.quantity ? r.revenue / r.quantity : 0 }))
        .sort((a, b) => b.revenue - a.revenue);
    const parcelItems = items.filter(r => r.parcelQty > 0).sort((a, b) => b.parcelQty - a.parcelQty);

    // ---- categories ----
    const catMap = {};
    bills.forEach(b => b.items.forEach(i => {
        const r = (catMap[i.category] = catMap[i.category] || { name: i.category, quantity: 0, revenue: 0 });
        r.quantity += i.qty;
        r.revenue += i.price * i.qty;
    }));
    const catTotal = Object.values(catMap).reduce((s, r) => s + r.revenue, 0);
    const categories = Object.values(catMap)
        .map(r => ({ ...r, share: catTotal ? (r.revenue / catTotal) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue);

    // ---- hours (IST) ----
    const hourRows = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: formatHour(h), orders: 0, sales: 0 }));
    bills.forEach(b => { const r = hourRows[b.hour_of_day]; r.orders += 1; r.sales += billTotal(b); });
    const hourly = hourRows
        .filter(h => h.orders > 0)
        .map(h => ({ ...h, avg: h.sales / h.orders, share: stats.sales ? (h.sales / stats.sales) * 100 : 0 }));

    // ---- days (zero-filled across the range so quiet days show up) ----
    const dayMap = {};
    const keys = range ? eachDateKey(range.startKey, range.endKey) : [...new Set(bills.map(b => b.date_ist))].sort();
    keys.forEach(k => { dayMap[k] = { key: k, label: formatDateKey(k, false), orders: 0, sales: 0 }; });
    bills.forEach(b => { const d = dayMap[b.date_ist]; if (d) { d.orders += 1; d.sales += billTotal(b); } });
    const daily = Object.values(dayMap);

    // ---- transactions, oldest first ----
    const transactions = [...bills].sort((a, b) => parseDbTimestamp(a.completed_at) - parseDbTimestamp(b.completed_at));

    return { stats, split, items, parcelItems, categories, hourly, daily, transactions };
}
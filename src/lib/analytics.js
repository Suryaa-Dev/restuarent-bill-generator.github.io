import { toISTParts } from './time';

export const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');

export const billQty = (bill) => (bill.items || []).reduce((s, i) => s + (i.qty || 0), 0);
export const billTotal = (bill) => parseFloat(bill.total) || 0;

// Percentage change current vs previous. null when there is nothing to compare against.
export function pctChange(current, previous) {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
}

export function summarize(bills) {
    const sales = bills.reduce((s, b) => s + billTotal(b), 0);
    const orders = bills.length;
    const items = bills.reduce((s, b) => s + billQty(b), 0);
    return { sales, orders, items, avg: orders ? sales / orders : 0 };
}

// Rows straight from Supabase -> rows every dashboard tab can rely on:
//   * hour_of_day / day_of_week / date_ist are recomputed from completed_at in IST, so they are
//     right for old rows too (older rows had these saved from the device clock / UTC date)
//   * every item carries a category (new bills store it; old bills are looked up from the menu by name)
//   * is_parcel is always a boolean
export function enrichBills(rows, categoryLookup = {}) {
    return rows.map(r => {
        const p = toISTParts(r.completed_at);
        return {
            ...r,
            hour_of_day: p.hour,
            day_of_week: p.weekday,
            date_ist: p.dateKey,
            is_parcel: !!r.is_parcel,
            items: (r.items || []).map(it => ({
                ...it,
                category: it.category || categoryLookup[it.name] || 'Other',
            })),
        };
    });
}

export const COLORS = ['#ff7e47', '#4ade80', '#60a5fa', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#a3a3a3'];

export function rangeLabel(dateRange, range) {
    if (dateRange === 'today') return 'yesterday';
    if (dateRange === 'yesterday') return 'the day before';
    if (!range) return 'previous period';
    return `previous ${range.days} days`;
}

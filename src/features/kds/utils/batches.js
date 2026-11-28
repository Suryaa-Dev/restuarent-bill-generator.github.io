import { ageColor, pendingLines } from './kds';
import { normalizeBatchWeights } from './batchWeights';

/* =====================================================================
   KDS "Batches" = a cooking-order RECOMMENDATION. Nothing is started, finished or stored:
   the list is calculated live from the dishes still waiting in the kitchen, so it can never go stale.

   One card per dish (name + category). The dishes are ranked by a weighted score of:
     - coverage   how many different tables / parcel orders are waiting for it
     - quantity   how many plates are waiting
     - avgWait    average waiting time of those tables / orders
     - maxWait    waiting time of the oldest one
     - urgency    any order already yellow / orange / red on the kitchen timer
   (weights: utils/batchWeights.js). The chef cooks from the top of the list and checks the
   quantities on the All tab.
   ===================================================================== */

const unitIdOf = (tableNumber, isParcel) => `${tableNumber}|${isParcel ? 'P' : 'D'}`;

const LEVEL = { none: 0, green: 0, yellow: 1 / 3, orange: 2 / 3, red: 1 };

export function buildRecommendations({ tokens, kitchenId, now, weights, timer }) {
    if (!kitchenId) return [];
    const w = normalizeBatchWeights(weights);

    // 1. plates still free to cook, per menu item
    const groups = new Map();
    pendingLines(tokens, kitchenId).forEach(l => {
        const free = l.qty;
        if (free <= 0) return;
        let g = groups.get(l.key);
        if (!g) {
            g = { key: l.key, name: l.item.name, category: l.item.category || '', qty: 0, portions: {}, units: new Map() };
            groups.set(l.key, g);
        }
        g.qty += free;
        g.portions[l.item.portion || ''] = (g.portions[l.item.portion || ''] || 0) + free;

        // 2. one "unit" per table (or per parcel order): several KOTs of one table count once
        const uid = unitIdOf(l.token.tableNumber, l.token.isParcel);
        let u = g.units.get(uid);
        if (!u) {
            u = { id: uid, tableNumber: l.token.tableNumber, isParcel: !!l.token.isParcel, qty: 0, since: Infinity };
            g.units.set(uid, u);
        }
        u.qty += free;
        u.since = Math.min(u.since, l.enteredAt);
    });

    // 3. raw factors
    const list = [...groups.values()].map(g => {
        const units = [...g.units.values()].sort((a, b) => a.since - b.since || (a.isParcel - b.isParcel) || a.tableNumber - b.tableNumber);
        const waits = units.map(u => Math.max(0, now - u.since));
        return {
            ...g,
            units,
            coverage: units.length,
            avgWait: waits.reduce((s, x) => s + x, 0) / waits.length,
            maxWait: Math.max(...waits),
            oldestSince: Math.min(...units.map(u => u.since)),
            urgency: Math.max(...units.map(u => LEVEL[ageColor(u.since, now, timer)] ?? 0)),
        };
    });

    // 4. normalise each factor to 0..1 against the other candidates, then weight
    const top = (k) => Math.max(0, ...list.map(x => x[k]));
    const mx = { coverage: top('coverage'), qty: top('qty'), avgWait: top('avgWait'), maxWait: top('maxWait') };
    const ratio = (v, m) => (m > 0 ? v / m : 0);
    list.forEach(x => {
        x.score = w.coverage * ratio(x.coverage, mx.coverage)
            + w.quantity * ratio(x.qty, mx.qty)
            + w.avgWait * ratio(x.avgWait, mx.avgWait)
            + w.maxWait * ratio(x.maxWait, mx.maxWait)
            + w.urgency * x.urgency;
    });

    // 5. deterministic order: score, then longest wait, more tables, more plates, name
    list.sort((a, b) =>
        b.score - a.score
        || b.maxWait - a.maxWait
        || b.coverage - a.coverage
        || b.qty - a.qty
        || a.name.localeCompare(b.name)
        || a.category.localeCompare(b.category));
    list.forEach((x, i) => { x.rank = i + 1; });
    return list;
}

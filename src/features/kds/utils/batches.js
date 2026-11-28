import { ageColor, pendingLines } from './kds';
import { normalizeBatchWeights } from './batchWeights';

/* =====================================================================
   KDS Batches.  A batch = one cooking operation of ONE menu item (name + category, the same key the
   rest of the KDS uses), covering plates of one or more tokens (tables / parcel orders).

   - "Recommended" batches are never stored. They are calculated live from the pending token items,
     so they can't go stale (buildRecommendations).
   - A batch exists in the database only once a chef STARTS it. Its plates are linked to the original
     token items (token_id + item_idx) in kds_batch_allocs, handed out atomically by kds_start_batch().
   - Cooking (batch Done) and serving are separate: serving keeps working on the token lines exactly
     as before; a Done batch stays Done whatever happens to its plates afterwards.
   ===================================================================== */

export const BATCH = { IN_PROGRESS: 'in_progress', DONE: 'done', VOIDED: 'voided' };

const HELD = new Set([BATCH.IN_PROGRESS, BATCH.DONE]); // statuses that hold plates

/* ---------- DB rows -> UI shape ---------- */

export function normalizeBatch(row) {
    return {
        id: row.id,
        batchNo: row.batch_no,
        branch: row.branch,
        kitchenId: row.kitchen_id,
        itemKey: row.item_key,
        name: row.item_name,
        category: row.category || '',
        status: row.status,
        startedAt: row.started_at,
        doneAt: row.done_at,
        allocs: (row.kds_batch_allocs || []).map(a => ({
            id: a.id,
            tokenId: a.token_id,
            idx: a.item_idx,
            qty: a.qty,
            portion: a.portion || '',
            tokenNo: a.token_no,
            tableNumber: a.table_number,
            isParcel: !!a.is_parcel,
            cancelledQty: a.cancelled_qty || 0,
            wastedQty: a.wasted_qty || 0,
        })),
    };
}

const lineKey = (tokenId, idx) => `${tokenId}:${idx}`;
const unitIdOf = (tableNumber, isParcel) => `${tableNumber}|${isParcel ? 'P' : 'D'}`;
const effective = (a) => Math.max(0, a.qty - a.cancelledQty);

/* ---------- how many plates of an order line may stay allocated? ---------- */
// null = unknown (token no longer in the live list, e.g. bill cleared): leave history untouched
export function lineAllowed(token, idx) {
    const line = token?.items?.[idx];
    if (!token || !line) return null;
    if (line.removed) return 0;
    if (token.status === 'cancelled' && !line.served) return 0; // whole token cancelled before serving
    return line.qty;
}

/* ---------- keep batches in step with the orders ----------
   Orders can shrink after a batch took their plates (a plate cancelled, a quantity reduced, a token
   cancelled). The surplus is taken off the batches, in-progress ones first (newest first), then Done
   ones (their plates were already cooked, so that part is recorded as WASTED).
   History is never erased: allocations only gain cancelledQty / wastedQty.
   Returns the batches as the screen should show them, plus the writes to persist (idempotent:
   it is a function of the current orders, so several screens may run it safely).             */
export function reconcileBatches(batches, tokens) {
    const tokenById = new Map(tokens.map(t => [t.id, t]));
    const views = batches.map(b => ({ ...b, allocs: b.allocs.map(a => ({ ...a })) }));

    const byLine = new Map();
    views.forEach(b => {
        if (!HELD.has(b.status)) return;
        b.allocs.forEach(a => {
            const k = lineKey(a.tokenId, a.idx);
            if (!byLine.has(k)) byLine.set(k, []);
            byLine.get(k).push({ a, b });
        });
    });

    byLine.forEach((entries, k) => {
        const sep = k.lastIndexOf(':');
        const allowed = lineAllowed(tokenById.get(k.slice(0, sep)), Number(k.slice(sep + 1)));
        if (allowed === null) return;
        let over = entries.reduce((s, { a }) => s + effective(a), 0) - allowed;
        if (over <= 0) return;
        entries.sort((x, y) =>
            (x.b.status === BATCH.IN_PROGRESS ? 0 : 1) - (y.b.status === BATCH.IN_PROGRESS ? 0 : 1)
            || (y.b.batchNo || 0) - (x.b.batchNo || 0));
        for (const { a, b } of entries) {
            if (over <= 0) break;
            const take = Math.min(over, effective(a));
            if (take <= 0) continue;
            a.cancelledQty += take;
            if (b.status === BATCH.DONE) a.wastedQty += take;
            over -= take;
        }
    });

    // writes to persist
    const before = new Map();
    batches.forEach(b => b.allocs.forEach(a => before.set(a.id, a)));
    const updates = [];
    views.forEach(b => b.allocs.forEach(a => {
        const o = before.get(a.id);
        if (o && (o.cancelledQty !== a.cancelledQty || o.wastedQty !== a.wastedQty)) {
            updates.push({ id: a.id, cancelledQty: a.cancelledQty, wastedQty: a.wastedQty });
        }
    }));

    // decorate for display
    const voidIds = [];
    views.forEach(b => {
        const units = new Map();
        const portions = {};
        let qty = 0, cancelled = 0, wasted = 0;
        b.allocs.forEach(a => {
            const eff = effective(a);
            cancelled += a.cancelledQty;
            wasted += a.wastedQty;
            if (eff <= 0) return;
            qty += eff;
            portions[a.portion] = (portions[a.portion] || 0) + eff;
            const uid = unitIdOf(a.tableNumber, a.isParcel);
            if (!units.has(uid)) units.set(uid, { id: uid, tableNumber: a.tableNumber, isParcel: a.isParcel, qty: 0, served: true, known: false });
            const u = units.get(uid);
            u.qty += eff;
            const line = tokenById.get(a.tokenId)?.items?.[a.idx];
            if (line) { u.known = true; if (!line.served) u.served = false; } else u.served = false;
        });
        b.qty = qty;
        b.cancelledQty = cancelled;
        b.wastedQty = wasted;
        b.portions = portions;
        b.units = [...units.values()]
            .map(u => ({ ...u, served: u.known && u.served }))
            .sort((x, y) => (x.isParcel - y.isParcel) || x.tableNumber - y.tableNumber);
        // an in-progress batch whose every plate was cancelled is pointless: retire it
        if (b.status === BATCH.IN_PROGRESS && qty === 0 && b.allocs.length > 0) {
            b.status = BATCH.VOIDED;
            voidIds.push(b.id);
        }
    });

    return { batches: views, updates, voidIds };
}

// plates held by batches on each token line (only in-progress / done batches hold plates)
export function allocatedByLine(batches) {
    const m = new Map();
    batches.forEach(b => {
        if (!HELD.has(b.status)) return;
        b.allocs.forEach(a => {
            const k = lineKey(a.tokenId, a.idx);
            m.set(k, (m.get(k) || 0) + effective(a));
        });
    });
    return m;
}

// a chef may take back an accidental start while nothing irreversible has happened
export const canUndoStart = (b) => b.status === BATCH.IN_PROGRESS && !(b.wastedQty > 0);

/* ---------- the recommendation ---------- */

const LEVEL = { none: 0, green: 0, yellow: 1 / 3, orange: 2 / 3, red: 1 };

export function buildRecommendations({ tokens, batches, kitchenId, now, weights, timer }) {
    if (!kitchenId) return [];
    const w = normalizeBatchWeights(weights);
    const held = allocatedByLine(batches);

    // 1. plates still free to cook, per menu item
    const groups = new Map();
    pendingLines(tokens, kitchenId).forEach(l => {
        const free = l.qty - (held.get(lineKey(l.token.id, l.idx)) || 0);
        if (free <= 0) return;
        let g = groups.get(l.key);
        if (!g) {
            g = { key: l.key, name: l.item.name, category: l.item.category || '', qty: 0, portions: {}, units: new Map(), allocs: [] };
            groups.set(l.key, g);
        }
        g.qty += free;
        g.portions[l.item.portion || ''] = (g.portions[l.item.portion || ''] || 0) + free;
        g.allocs.push({ tokenId: l.token.id, idx: l.idx, qty: free });

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

/* ---------- the three views of the same records ---------- */

export function splitBatches(views) {
    const inProgress = views.filter(b => b.status === BATCH.IN_PROGRESS)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || (a.batchNo || 0) - (b.batchNo || 0));
    const done = views.filter(b => b.status === BATCH.DONE)
        .sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '') || (b.batchNo || 0) - (a.batchNo || 0));
    return { inProgress, done };
}

// "Recommended Batch" view: every in-progress batch first (always), unstarted recommendations below
export function recommendedView(inProgress, recs) {
    return [
        ...inProgress.map(batch => ({ kind: 'batch', id: batch.id, batch })),
        ...recs.map(rec => ({ kind: 'rec', id: `rec:${rec.key}`, rec })),
    ];
}

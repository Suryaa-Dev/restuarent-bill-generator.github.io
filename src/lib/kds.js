/* =====================================================================
   KDS — pure logic. Everything on the display is DERIVED from the token
   records (never kept as separate counters), so serving, cancelling and
   bill-clearing can't double-subtract, and a refresh/reconnect simply
   recomputes the same numbers.

   A unit is "pending in kitchen K" when its token is active, the line is
   not removed, not served, and belongs to kitchen K.
   ===================================================================== */

export const MAX_FEATURED = 4;
export const MAX_GROUPS = 4;
export const DEFAULT_TIMER = { green: 5, yellow: 10, orange: 15 };
export const FLAG_TTL_MS = 60_000; // how long an up/down arrow stays on a box

// items are identified by name + menu category (tokens carry both)
export const itemKey = (i) => `${i.name}||${i.category || ''}`;

const cleanItem = (i) => ({ name: String(i?.name ?? ''), category: i?.category || '' });
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function normalizeConfig(cfg) {
    const c = cfg && typeof cfg === 'object' ? cfg : {};
    const featured = (Array.isArray(c.featured) ? c.featured : [])
        .filter(i => i && i.name).slice(0, MAX_FEATURED).map(cleanItem);
    const groups = (Array.isArray(c.groups) ? c.groups : []).slice(0, MAX_GROUPS).map((g, idx) => ({
        id: g?.id || `g${idx}`,
        name: g?.name || '',
        items: (Array.isArray(g?.items) ? g.items : []).filter(i => i && i.name).map(cleanItem),
    }));
    const tm = c.timer || {};
    let timer = { green: num(tm.green, 5), yellow: num(tm.yellow, 10), orange: num(tm.orange, 15) };
    if (!(timer.green < timer.yellow && timer.yellow < timer.orange)) timer = { ...DEFAULT_TIMER };
    return { featured, groups, timer };
}

/* ---------- pending lines + aggregation ---------- */

export function pendingLines(tokens, kitchenId) {
    const out = [];
    tokens.forEach(tk => {
        if (tk.status !== 'active') return;
        (tk.items || []).forEach((it, idx) => {
            if (it.removed || it.served || it.kitchenId !== kitchenId) return;
            out.push({
                token: tk,
                idx,
                item: it,
                key: itemKey(it),
                qty: it.qty,
                // age starts when the line entered the kitchen queue, not when the bill was made
                enteredAt: Date.parse(it.addedAt || tk.createdAt) || Date.now(),
            });
        });
    });
    return out;
}

export function aggregate(lines) {
    const m = new Map();
    lines.forEach(l => {
        let e = m.get(l.key);
        if (!e) {
            e = { key: l.key, name: l.item.name, category: l.item.category, portions: {}, total: 0, oldest: Infinity };
            m.set(l.key, e);
        }
        e.portions[l.item.portion] = (e.portions[l.item.portion] || 0) + l.qty;
        e.total += l.qty;
        if (l.enteredAt < e.oldest) e.oldest = l.enteredAt;
    });
    return m;
}

// [['Half', 6], ['Full', 2]] in the menu's portion order
export function portionList(portions, optionOrder, showZero) {
    const order = [...(optionOrder || [])];
    Object.keys(portions || {}).forEach(p => { if (!order.includes(p)) order.push(p); });
    return order.filter(p => showZero || (portions?.[p] || 0) > 0).map(p => [p, portions?.[p] || 0]);
}

/* ---------- timer colours ---------- */

export function ageColor(oldestMs, now, timer) {
    if (!Number.isFinite(oldestMs)) return 'none';
    const min = (now - oldestMs) / 60000;
    if (min <= timer.green) return 'green';
    if (min <= timer.yellow) return 'yellow';
    if (min <= timer.orange) return 'orange';
    return 'red';
}

export const BORDER = {
    none: 'border-gray-300',
    green: 'border-green-500',
    yellow: 'border-yellow-400',
    orange: 'border-orange-500',
    red: 'border-red-600',
};
export const DOT = { none: 'bg-gray-300', green: 'bg-green-500', yellow: 'bg-yellow-400', orange: 'bg-orange-500', red: 'bg-red-600' };

/* ---------- what changed between two snapshots? (drives arrows + sound) ----------
   up   = quantity newly added to the kitchen queue
   down = quantity CANCELLED (token cancelled, line removed, qty reduced)
   Serving and bill-clearing also lower the counters but are NOT "down" events. */

export function diffEvents(prevTokens, nextTokens, kitchenId) {
    const prevMap = new Map(prevTokens.map(t => [t.id, t]));
    const nextMap = new Map(nextTokens.map(t => [t.id, t]));
    const up = {};
    const down = {};
    const add = (obj, k, n) => { obj[k] = (obj[k] || 0) + n; };

    const pend = (tk, idx) => {
        if (!tk || tk.status !== 'active') return 0;
        const it = tk.items[idx];
        if (!it || it.removed || it.served || it.kitchenId !== kitchenId) return 0;
        return it.qty;
    };

    prevTokens.forEach(ptk => {
        const ntk = nextMap.get(ptk.id);
        ptk.items.forEach((pit, idx) => {
            if (pit.kitchenId !== kitchenId) return;
            const before = pend(ptk, idx);
            const after = pend(ntk, idx);
            const key = itemKey(pit);
            if (after < before) {
                const nit = ntk?.items?.[idx];
                const nowServed = ntk && ntk.status === 'active' && nit && !nit.removed && nit.served;
                const billCleared = !ntk; // archived tokens leave the list
                if (!nowServed && !billCleared) add(down, key, before - after);
            } else if (after > before) {
                const nit = ntk.items[idx];
                const wasServed = pit.served && !nit.served; // un-serve is not a new order
                if (!wasServed) add(up, key, after - before);
            }
        });
    });

    nextTokens.forEach(ntk => {
        const ptk = prevMap.get(ntk.id);
        ntk.items.forEach((it, idx) => {
            if (it.kitchenId !== kitchenId) return;
            if (ptk && idx < ptk.items.length) return; // handled above
            const after = pend(ntk, idx);
            if (after > 0) add(up, itemKey(it), after);
        });
    });

    return { up, down };
}

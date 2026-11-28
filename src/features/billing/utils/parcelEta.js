/* =====================================================================
   Parcel "Estimated Time": how long until a parcel order is ready, so staff can answer
   "how long will it take?".

   1. LEARNED COOKING TIME per dish (from the timing log, last few weeks)
      Every served dish has "token sent -> served". On a quiet kitchen that is close to the pure
      cooking time; on a busy one it also contains waiting. So the QUICKER end (25th percentile)
      is used as the dish's cooking time. Not enough data -> its category -> all dishes -> 10 min.

   2. THE KITCHEN QUEUE right now (live tokens of every table and parcel, per kitchen)
      Waiting plates are grouped per dish, oldest first. A group that has waited a while is assumed
      to be on the stove already.
        - parcel dish already waiting AND not started yet -> cooked together with it (bigger batch)
        - otherwise it joins the end of the queue
      Each kitchen cooks a few dishes at the same time (PARALLEL, default 2); different kitchens
      work side by side. A bigger batch takes somewhat longer than a single plate.

   3. PACKING time is added, then the whole estimate is CORRECTED with what really happened:
      for past parcels we stored the estimate, and "sent -> last dish served" is the real time.
      The typical real/estimate ratio of recent parcels scales the result (kept within 0.7–1.6).
   ===================================================================== */

export const DEFAULT_COOK_MIN = 10;
const MIN_COOK = 2;
const MAX_COOK = 40;
const PACK_MIN = 2;
const STARTED_SHARE = 0.35; // a dish group older than 35 % of its cooking time is assumed started
const DEFAULT_PARALLEL = 2;
const MIN_SAMPLES = 3;

const dishKey = (name, category) => `${name}||${category || ''}`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const percentile = (list, p) => {
    if (!list.length) return null;
    const v = [...list].sort((a, b) => a - b);
    const i = (v.length - 1) * p;
    const lo = Math.floor(i), hi = Math.ceil(i);
    return v[lo] + (v[hi] - v[lo]) * (i - lo);
};
const minutesBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 60000;

/* ---------- 1. learning from the timing log ----------
   rows: item_timeline rows { item_name, category, is_parcel, qty, sent_at, served_at, eta_minutes, token_no, bill_id } */
export function buildEtaStats(rows) {
    const byDish = new Map();
    const byCat = new Map();
    const all = [];
    const parcels = new Map(); // bill+token -> { eta, sent, served[] }

    (rows || []).forEach(r => {
        if (!r.sent_at || !r.served_at) return;
        const m = minutesBetween(r.sent_at, r.served_at);
        if (!(m > 0 && m <= 120)) return; // forgotten Serve taps are ignored
        const push = (map, k) => { if (!map.has(k)) map.set(k, []); map.get(k).push(m); };
        push(byDish, dishKey(r.item_name, r.category));
        push(byCat, r.category || '');
        all.push(m);

        if (r.is_parcel && r.eta_minutes > 0 && r.token_no) {
            const k = `${r.bill_id}|${r.token_no}`;
            if (!parcels.has(k)) parcels.set(k, { eta: r.eta_minutes, sent: r.sent_at, served: [] });
            const p = parcels.get(k);
            if (Date.parse(r.sent_at) < Date.parse(p.sent)) p.sent = r.sent_at;
            p.served.push(r.served_at);
        }
    });

    const cookOf = (map) => {
        const out = new Map();
        map.forEach((list, k) => { if (list.length >= MIN_SAMPLES) out.set(k, clamp(percentile(list, 0.25), MIN_COOK, MAX_COOK)); });
        return out;
    };

    // estimate vs reality of recent parcels (newest 30)
    const results = [...parcels.values()]
        .map(p => ({ sent: p.sent, eta: p.eta, actual: Math.max(...p.served.map(s => minutesBetween(p.sent, s))) }))
        .filter(p => p.actual > 0 && p.actual <= 180)
        .sort((a, b) => Date.parse(b.sent) - Date.parse(a.sent))
        .slice(0, 30);
    const ratio = results.length >= 5 ? percentile(results.map(p => p.actual / p.eta), 0.5) : 1;

    return {
        dish: cookOf(byDish),
        category: cookOf(byCat),
        global: all.length >= MIN_SAMPLES ? clamp(percentile(all, 0.25), MIN_COOK, MAX_COOK) : DEFAULT_COOK_MIN,
        calibration: clamp(ratio || 1, 0.7, 1.6),
        samples: all.length,
        parcelsCompared: results.length,
    };
}

export const EMPTY_ETA_STATS = { dish: new Map(), category: new Map(), global: DEFAULT_COOK_MIN, calibration: 1, samples: 0, parcelsCompared: 0 };

const cookMinutes = (stats, name, category) =>
    stats.dish.get(dishKey(name, category)) ?? stats.category.get(category || '') ?? stats.global ?? DEFAULT_COOK_MIN;

// a bigger batch takes a bit longer than one plate (each extra plate +15 %, at most 8 plates counted)
const batchMinutes = (cook, qty) => cook * (1 + 0.15 * (Math.min(qty, 8) - 1));

/* ---------- 2 + 3. the estimate ----------
   parcelLines : the parcel's dishes still to cook [{ name, category, qty, kitchenId }]
   tokens      : live tokens of the branch (every table / parcel)
   excludeTokenIds : tokens whose dishes ARE the parcel (already sent) — not counted twice
   parallel    : { [kitchenId]: dishes cooked at the same time }   (optional)
   -> { minutes, readyAt } or null when nothing needs cooking */
export function estimateParcel({ parcelLines, tokens, now = Date.now(), stats = EMPTY_ETA_STATS, excludeTokenIds = [], parallel = {} }) {
    const mine = (parcelLines || []).filter(l => l.kitchenId && l.qty > 0);
    if (!mine.length) return null;
    const skip = new Set(excludeTokenIds);

    // the live queue, per kitchen and dish
    const kitchens = new Map();
    const groupOf = (kid, key, name, category) => {
        if (!kitchens.has(kid)) kitchens.set(kid, new Map());
        const k = kitchens.get(kid);
        if (!k.has(key)) k.set(key, { key, name, category, qty: 0, since: Infinity, mine: false, cook: cookMinutes(stats, name, category) });
        return k.get(key);
    };
    (tokens || []).forEach(tk => {
        if (tk.status !== 'active' || skip.has(tk.id)) return;
        (tk.items || []).forEach(it => {
            if (it.removed || it.served || !it.kitchenId) return;
            const g = groupOf(it.kitchenId, dishKey(it.name, it.category), it.name, it.category);
            g.qty += it.qty;
            g.since = Math.min(g.since, Date.parse(it.addedAt || tk.createdAt) || now);
        });
    });

    // the parcel's dishes: join a waiting batch that has not started, else queue up at the end
    mine.forEach(l => {
        const key = dishKey(l.name, l.category);
        const g = kitchens.get(l.kitchenId)?.get(key);
        const started = g && g.qty > 0 && (now - g.since) / 60000 > g.cook * STARTED_SHARE;
        if (g && g.qty > 0 && !started) {
            g.qty += l.qty;
            g.mine = true;
        } else {
            const fresh = groupOf(l.kitchenId, `${key}||parcel`, l.name, l.category);
            fresh.qty += l.qty;
            fresh.since = Math.min(fresh.since, now + 1); // behind everything already waiting
            fresh.mine = true;
        }
    });

    // each kitchen: oldest first, a few dishes at a time
    let ready = 0;
    kitchens.forEach((groups, kid) => {
        const list = [...groups.values()].filter(g => g.qty > 0).sort((a, b) => a.since - b.since);
        if (!list.some(g => g.mine)) return;
        const slots = Array(Math.max(1, parallel[kid] || DEFAULT_PARALLEL)).fill(0);
        list.forEach(g => {
            const age = Math.max(0, (now - g.since) / 60000);
            const full = batchMinutes(g.cook, g.qty);
            const startedAlready = age > g.cook * STARTED_SHARE;
            const duration = startedAlready ? Math.max(full * 0.25, full - age) : full;
            const i = slots.indexOf(Math.min(...slots));
            slots[i] += duration;
            if (g.mine) ready = Math.max(ready, slots[i]);
        });
    });

    // the minutes told to the customer (rounded) are also what is saved and later compared
    const minutes = roundEtaMinutes(Math.max(3, Math.ceil((ready + PACK_MIN) * (stats.calibration || 1))));
    return { minutes, readyAt: now + minutes * 60000 };
}

// what staff tell the customer: exact under 10 min, then rounded up to 5 minutes
export const roundEtaMinutes = (m) => (m <= 10 ? Math.max(1, Math.ceil(m)) : Math.ceil(m / 5) * 5);

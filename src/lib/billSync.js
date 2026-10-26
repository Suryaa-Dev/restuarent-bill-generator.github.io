/* =====================================================================
   Rush-hour safe syncing for bills and tokens.

   THE PROBLEM these helpers solve
   --------------------------------
   The app keeps the order on screen (local state) and saves it to Supabase in the
   background. Supabase then broadcasts every saved change back through the realtime
   channel — including the changes THIS device just made. During fast tapping those
   "echoes" are old snapshots: the echo of save #1 (qty 1) arrives after you have already
   tapped up to 3, and the app used to put qty 1 back on screen. Result: 1 → 2 → 3 → 1 → 3…

   THE FIX (three parts)
   ---------------------
   1. createEchoFilter  — every save is stamped; when the same stamp comes back through
      realtime we know it is our own echo and ignore it. Only changes made on OTHER devices
      are applied.
   2. createKeyedQueue  — saves for the same table run one at a time AND are coalesced:
      six quick taps become two writes (the first, then one with the final result) instead
      of six, so there is no backlog, no late echoes and far less network traffic.
   3. While a table still has saves in flight, unknown incoming changes for it are held back
      — the screen is always the freshest truth until our own writes land.
   ===================================================================== */

// strictly increasing millisecond stamp (two saves can never share one)
let lastStamp = 0;
export const nextStamp = () => {
    lastStamp = Math.max(Date.now(), lastStamp + 1);
    return lastStamp;
};

/* ---------- 1. echo filter ---------- */

export function createEchoFilter(ttlMs = 30000) {
    const stamps = new Map(); // key -> [{ stamp, at }]
    const clears = new Map(); // key -> [at]
    const prune = (arr, now, at) => { while (arr.length && now - at(arr[0]) > ttlMs) arr.shift(); };

    return {
        // call just BEFORE sending a write
        remember(key, stamp) {
            if (!stamps.has(key)) stamps.set(key, []);
            stamps.get(key).push({ stamp, at: Date.now() });
        },
        // true => this realtime event is our own write coming back: ignore it.
        // Events arrive in order, so everything up to and including it has been delivered.
        isOwn(key, stamp) {
            const arr = stamps.get(key);
            if (!arr || stamp == null || Number.isNaN(stamp)) return false;
            prune(arr, Date.now(), e => e.at);
            const i = arr.findIndex(e => e.stamp === stamp);
            if (i < 0) return false;
            arr.splice(0, i + 1);
            return true;
        },
        // same idea for "bill cleared" events caused by this device's own Clear Bill
        rememberClear(key) {
            if (!clears.has(key)) clears.set(key, []);
            clears.get(key).push(Date.now());
        },
        consumeClear(key) {
            const arr = clears.get(key);
            if (!arr) return false;
            prune(arr, Date.now(), at => at);
            if (arr.length === 0) return false;
            arr.shift();
            return true;
        },
        reset() { stamps.clear(); clears.clear(); },
    };
}

/* ---------- 2. coalescing per-key save queue ---------- */

// save(key, payload) runs for one key at a time. If more requests for that key arrive while a
// save is running, they are merged (default: the newest replaces the older) and written ONCE.
// Every caller's promise settles with the result of the save that covered its request.
export function createKeyedQueue(save, merge = (_old, next) => next) {
    const pending = new Map();
    const running = new Set();
    const idleWaiters = new Map();

    async function drain(key) {
        running.add(key);
        try {
            while (pending.has(key)) {
                const job = pending.get(key);
                pending.delete(key);
                try {
                    const result = await save(key, job.payload);
                    job.waiters.forEach(w => w.resolve(result));
                } catch (err) {
                    job.waiters.forEach(w => w.reject(err));
                }
            }
        } finally {
            running.delete(key);
            (idleWaiters.get(key) || []).splice(0).forEach(resolve => resolve());
        }
    }

    return {
        enqueue(key, payload) {
            return new Promise((resolve, reject) => {
                const job = pending.get(key);
                if (job) {
                    job.payload = merge(job.payload, payload);
                    job.waiters.push({ resolve, reject });
                } else {
                    pending.set(key, { payload, waiters: [{ resolve, reject }] });
                }
                if (!running.has(key)) drain(key);
            });
        },
        // true while a save for this key is running or waiting
        busy: (key) => running.has(key) || pending.has(key),
        // resolves once every save for this key has finished
        whenIdle(key) {
            if (!running.has(key) && !pending.has(key)) return Promise.resolve();
            return new Promise(resolve => {
                if (!idleWaiters.has(key)) idleWaiters.set(key, []);
                idleWaiters.get(key).push(resolve);
            });
        },
    };
}

// shared by patchToken (lib/kitchen.js) and the token realtime handler (App.jsx)
export const tokenEcho = createEchoFilter();
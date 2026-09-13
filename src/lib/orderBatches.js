// "As Ordered" support.
//
// Each bill item can carry a `batches` array: [{ qty, timestamp }, ...],
// representing every time that item/portion was added, grouped so that
// repeat taps within REORDER_WINDOW_MS land in the same batch, while a
// genuine re-order later (e.g. the customer finishes a plate and orders more
// 15 minutes later) starts a new batch. This lives INSIDE the same `items`
// array that's already saved with the bill — there's no separate log to fall
// out of sync or go missing on reload, and it always sums to the item's qty.

export const REORDER_WINDOW_MS = 3 * 60 * 1000; // 3 minutes

// Adds `delta` units of an item to its batch history, merging into the last
// batch if it's recent enough, otherwise starting a new one. Works for both
// a brand new bill item and bumping the quantity of an existing one.
export function addToBatches(existingBatches, delta, now = Date.now()) {
    const batches = existingBatches && existingBatches.length > 0
        ? existingBatches.map(b => ({ ...b }))
        : [];

    const last = batches[batches.length - 1];
    if (last && now - last.timestamp <= REORDER_WINDOW_MS) {
        last.qty += delta;
    } else {
        batches.push({ qty: delta, timestamp: now });
    }
    return batches;
}

// Removes `amount` units from batch history, most-recent-first (LIFO) — used
// when quantity is decreased from the cart. We don't try to guess which
// specific past order a removal "belongs to"; trimming the most recent
// addition first is the simplest, least surprising behavior.
export function removeFromBatches(existingBatches, amount) {
    let toRemove = amount;
    const batches = existingBatches ? existingBatches.map(b => ({ ...b })) : [];

    for (let i = batches.length - 1; i >= 0 && toRemove > 0; i--) {
        if (batches[i].qty <= toRemove) {
            toRemove -= batches[i].qty;
            batches.splice(i, 1);
        } else {
            batches[i].qty -= toRemove;
            toRemove = 0;
        }
    }
    return batches;
}

// Expands every item's full batch history into flat rows and sorts them
// chronologically across the WHOLE bill — so "As Ordered" shows everything
// that's ever been added to this bill, not just the latest addition, with
// different items correctly interleaved in the order they actually happened.
// Items saved before this feature existed (no `batches` field) fall back to
// a single row using their current qty, so older/in-progress bills still work.
export function buildAsOrderedRows(billItems) {
    const rows = [];

    (billItems || []).forEach(item => {
        const batches = item.batches && item.batches.length > 0
            ? item.batches
            : [{ qty: item.qty, timestamp: 0 }];

        batches.forEach(b => {
            rows.push({
                name: item.name,
                portion: item.portion,
                price: item.price,
                qty: b.qty,
                timestamp: b.timestamp,
            });
        });
    });

    rows.sort((a, b) => a.timestamp - b.timestamp);
    return rows;
}
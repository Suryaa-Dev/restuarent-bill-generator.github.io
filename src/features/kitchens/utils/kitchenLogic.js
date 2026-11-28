/* =====================================================================
   Kitchen System (KOT) — pure helpers shared by billing, KDS and reports.
   Database access lives in services/kitchensService.js and services/tokensService.js.
   ===================================================================== */

// Identity of a bill/token line. Matches how the bill itself merges lines.
// In Kitchen mode a bill can hold the SAME dish twice — once as dine-in, once as parcel —
// so the parcel flag is part of the identity. Bill lines carry it themselves (isParcel);
// token lines get it from their token, passed in as the 2nd argument.
// Modifiers are part of the identity too: 2 Half Manchurian [Spicy] and 1 plain Half Manchurian are different lines.
export const lineKey = (i, parcel) => `${i.name}||${i.portion}||${i.category || ''}${(parcel ?? i.isParcel) ? '||P' : ''}${i.mods && i.mods.length ? `||M:${[...i.mods].sort().join('+')}` : ''}`;


// (name, category) -> kitchenId, from the loaded menu
export function buildKitchenLookup(menuItems) {
    const exact = {};
    const byName = {};
    (menuItems || []).forEach(i => {
        exact[`${i.name}||${i.category}`] = i.kitchenId || null;
        if (!(i.name in byName)) byName[i.name] = i.kitchenId || null;
    });
    return (name, category) => {
        const k = `${name}||${category}`;
        if (k in exact) return exact[k];
        return byName[name] ?? null;
    };
}

/* ---------------- Tokens ---------------- */


/* ---------------- Pure helpers: what has been sent already? ---------------- */

export function computeSentQty(tokens) {
    const sent = {};
    tokens.forEach(tk => {
        (tk.items || []).forEach(it => {
            if (it.removed) return;
            if (tk.status === 'cancelled' && !it.served) return;
            const k = lineKey(it, !!tk.isParcel);
            sent[k] = (sent[k] || 0) + it.qty;
        });
    });
    return sent;
}

// Per bill line: how much is already sent vs. still new.
export function analyzeBill(bill, tokens, kitchenOf) {
    const remaining = computeSentQty(tokens);
    const lines = bill.map(line => {
        const k = lineKey(line);
        const sent = Math.min(remaining[k] || 0, line.qty);
        remaining[k] = (remaining[k] || 0) - sent;
        return { sent, unsent: line.qty - sent };
    });

    // Items that aren't assigned to any kitchen never get a token (e.g. a water bottle the
    // waiter hands over straight away) — they're simply left out of "new" quantity.
    const items = [];
    bill.forEach((line, idx) => {
        const { unsent } = lines[idx];
        const kitchenId = kitchenOf ? kitchenOf(line.name, line.category) : null;
        if (unsent > 0 && kitchenId) {
            items.push({
                name: line.name,
                portion: line.portion,
                category: line.category,
                price: line.price,
                qty: unsent,
                kitchenId,
                served: false,
                cartAt: line.pendingSince || line.addedAt || null, // when it was added to the cart (timing log)
                ...(line.mods && line.mods.length ? { mods: line.mods } : {}), // preparation instructions travel with the KOT
                isParcel: !!line.isParcel, // decides which token (dine-in / parcel) this goes on
            });
        }
    });
    const count = items.reduce((s, i) => s + i.qty, 0);
    return { lines, items, count };
}

// The Parcel button decides how UNSENT quantities are treated (quantities already sent to the
// kitchen never change section). Turning it on moves every unsent dine-in quantity into the
// parcel section; turning it off moves unsent parcel quantities back to dine-in.
export function convertUnsent(bill, tokens, toParcel) {
    const sent = computeSentQty(tokens);
    const out = bill.map(l => ({ ...l }));
    const base = (l) => `${l.name}||${l.portion}||${l.category || ''}${l.mods && l.mods.length ? `||M:${[...l.mods].sort().join('+')}` : ''}`;

    const groups = new Map();
    out.forEach(l => {
        const k = base(l);
        if (!groups.has(k)) groups.set(k, {});
        groups.get(k)[l.isParcel ? 'p' : 'd'] = l;
    });

    groups.forEach((g) => {
        const from = toParcel ? g.d : g.p;
        if (!from) return;
        const move = Math.max(0, from.qty - (sent[lineKey(from)] || 0));
        if (move === 0) return;
        from.qty -= move;
        const to = toParcel ? g.p : g.d;
        if (to) {
            to.qty += move;
        } else {
            const fresh = { name: from.name, portion: from.portion, price: from.price, qty: move, category: from.category, ...(from.mods && from.mods.length ? { mods: from.mods } : {}) };
            if (toParcel) fresh.isParcel = true;
            out.push(fresh);
            g[toParcel ? 'p' : 'd'] = fresh;
        }
    });

    return out.filter(l => l.qty > 0);
}

// items still waiting to be served across live tokens
export function countPendingServe(tokens) {
    let n = 0;
    tokens.forEach(tk => {
        if (tk.status !== 'active') return;
        (tk.items || []).forEach(it => { if (!it.removed && !it.served) n += it.qty; });
    });
    return n;
}
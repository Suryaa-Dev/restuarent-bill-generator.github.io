import { computeSentQty, lineKey } from './kitchen';

/* Live "proof of service" timeline for ONE table's open order.
   Every token is kept separate (even if the same dish was sent in several tokens, each token
   has its own times), followed by dishes that are still waiting in the cart.            */

const iso = (v) => (v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

export function buildLiveTimeline(bill, tokens) {
    const groups = [...(tokens || [])]
        .sort((a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0))
        .map(tk => {
            const sentFallback = iso(tk.createdAt);
            const items = (tk.items || [])
                .filter(it => !it.removed && it.qty > 0)
                .map(it => {
                    const sentAt = iso(it.addedAt) || sentFallback;
                    return {
                        name: it.name,
                        portion: it.portion,
                        qty: it.qty,
                        cartAt: iso(it.cartAt) || sentAt,
                        sentAt,
                        servedAt: it.served ? iso(it.servedAt) : null,
                        served: !!it.served,
                    };
                });
            return { id: tk.id, tokenNo: tk.tokenNo, isParcel: !!tk.isParcel, cancelled: tk.status === 'cancelled', sentAt: sentFallback, items };
        })
        .filter(g => g.items.length > 0);

    // quantities still sitting in the cart (not part of any token yet)
    const sent = computeSentQty((tokens || []).filter(tk => tk.status === 'active'));
    const waiting = [];
    (bill || []).forEach(line => {
        const k = lineKey(line);
        const used = Math.min(sent[k] || 0, line.qty);
        sent[k] = (sent[k] || 0) - used;
        const left = line.qty - used;
        if (left > 0) {
            waiting.push({ name: line.name, portion: line.portion, qty: left, isParcel: !!line.isParcel, cartAt: iso(line.pendingSince) || iso(line.addedAt) });
        }
    });

    const starts = [
        ...(bill || []).map(l => Date.parse(l.addedAt)),
        ...groups.flatMap(g => g.items.map(i => Date.parse(i.cartAt))),
    ].filter(n => !isNaN(n));

    return { groups, waiting, orderStart: starts.length ? new Date(Math.min(...starts)).toISOString() : null };
}

// "Proof of service" for a bill that is already CLEARED, built from its item_timeline rows
// (one row per dish line; rows of the same token form one card, so each token keeps its own times).
export function buildHistoryTimeline(rows) {
    const list = rows || [];
    const byToken = new Map();
    const waiting = [];
    list.forEach(r => {
        if (r.token_no && r.sent_at) {
            if (!byToken.has(r.token_no)) byToken.set(r.token_no, []);
            byToken.get(r.token_no).push(r);
        } else {
            waiting.push({ name: r.item_name, portion: r.portion, qty: r.qty, isParcel: !!r.is_parcel, cartAt: iso(r.cart_at) });
        }
    });

    const groups = [...byToken.entries()].map(([tokenNo, items]) => {
        const sent = items.map(r => Date.parse(r.sent_at)).sort((a, b) => a - b)[0];
        return {
            id: tokenNo,
            tokenNo,
            isParcel: items.every(r => r.is_parcel),
            cancelled: false,
            sentAt: new Date(sent).toISOString(),
            items: items.map(r => ({
                name: r.item_name,
                portion: r.portion,
                qty: r.qty,
                cartAt: iso(r.cart_at) || iso(r.sent_at),
                sentAt: iso(r.sent_at),
                servedAt: iso(r.served_at),
                served: !!r.served_at,
            })),
        };
    }).sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));

    const starts = [
        ...list.map(r => Date.parse(r.order_started_at)),
        ...list.map(r => Date.parse(r.cart_at)),
    ].filter(n => !isNaN(n));

    return {
        groups,
        waiting,
        orderStart: starts.length ? new Date(Math.min(...starts)).toISOString() : null,
        clearedAt: iso(list[0]?.cleared_at),
    };
}
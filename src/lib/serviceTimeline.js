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

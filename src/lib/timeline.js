import { supabase } from '../config/supabase';
import { computeSentQty, lineKey } from './kitchen';
import { toISTParts } from './time';

/* Per-dish timing log.

   Four moments are tracked for every dish:
     1. added to cart    bill line  .addedAt / .pendingSince     (stamped by stampCartTimes)
     2. token sent       token item .addedAt  (+ token.createdAt)
     3. served           token item .servedAt                    (stamped when Serve is tapped)
     4. bill cleared     completed_bills.completed_at
   When a bill is cleared, everything is written as ONE row per dish into `item_timeline`
   (see item_timeline.sql), which the "Service Speed" dashboard tab reads.              */

const rand = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});
export const newUuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : rand());

// After the bill of a table changed (item added / quantity increased), stamp the cart times.
//  addedAt      first time this dish line was added
//  pendingSince when the quantity that is still waiting to be sent started waiting
export function stampCartTimes(oldBill, newBill, tableTokens) {
    const now = new Date().toISOString();
    const sent = computeSentQty(tableTokens || []);
    const oldByKey = new Map((oldBill || []).map(l => [lineKey(l), l]));
    return newBill.map(line => {
        const old = oldByKey.get(lineKey(line));
        if (!old) return { ...line, addedAt: line.addedAt || now, pendingSince: line.pendingSince || now };
        if (line.qty > old.qty) {
            const hadWaiting = old.qty > (sent[lineKey(line)] || 0);
            return {
                ...line,
                addedAt: line.addedAt || old.addedAt || now,
                pendingSince: hadWaiting ? (old.pendingSince || old.addedAt || now) : now,
            };
        }
        return line;
    });
}

const validIso = (v) => (v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

export function buildTimelineRows({ billId, branch, table, bill, tokens, clearedAt }) {
    const cleared = clearedAt.toISOString();
    const ist = toISTParts(clearedAt);
    const live = (tokens || []).filter(tk => tk.status === 'active');

    const starts = (bill || []).map(l => Date.parse(l.addedAt)).filter(n => !isNaN(n));
    const rows = [];
    const base = { bill_id: billId, branch, table_number: table, cleared_at: cleared, date: ist.dateKey, hour_of_day: ist.hour };

    live.forEach(tk => {
        (tk.items || []).forEach(it => {
            if (it.removed || !(it.qty > 0)) return;
            const sentAt = validIso(it.addedAt) || validIso(tk.createdAt);
            const cartAt = validIso(it.cartAt) || sentAt;
            if (cartAt) starts.push(Date.parse(cartAt));
            rows.push({
                ...base,
                token_no: tk.tokenNo || null,
                is_parcel: !!tk.isParcel,
                item_name: it.name,
                portion: it.portion || null,
                category: it.category || null,
                qty: it.qty,
                kitchen_id: it.kitchenId || null,
                cart_at: cartAt,
                sent_at: sentAt,
                served_at: it.served ? validIso(it.servedAt) : null,
            });
        });
    });

    // dishes that never went to a kitchen (no kitchen assigned, or Normal mode)
    const sent = computeSentQty(live);
    (bill || []).forEach(line => {
        const left = line.qty - Math.min(sent[lineKey(line)] || 0, line.qty);
        sent[lineKey(line)] = Math.max(0, (sent[lineKey(line)] || 0) - line.qty);
        if (left <= 0) return;
        rows.push({
            ...base,
            token_no: null,
            is_parcel: !!line.isParcel,
            item_name: line.name,
            portion: line.portion || null,
            category: line.category || null,
            qty: left,
            kitchen_id: null,
            cart_at: validIso(line.addedAt),
            sent_at: null,
            served_at: null,
        });
    });

    const orderStart = starts.length ? new Date(Math.min(...starts)).toISOString() : null;
    return rows.map(r => ({ ...r, order_started_at: orderStart }));
}

// Never blocks clearing a bill: a logging problem is only reported in the console.
export async function saveTimelineRows(rows) {
    if (!rows.length) return;
    try {
        for (let i = 0; i < rows.length; i += 200) {
            const { error } = await supabase.from('item_timeline').insert(rows.slice(i, i + 200));
            if (error) throw error;
        }
    } catch (err) {
        console.error('Could not save item timeline (run item_timeline.sql?):', err);
    }
}

import { supabase } from '../lib/supabaseClient';
import { fetchAllRows, run } from './db';

// Read-only reporting queries (Dashboard, Order History) + deleting completed bills.
// Every range query is paginated, so long ranges are never cut off at Supabase's 1000-row cap.

// range = { start, endExclusive } (ISO strings) or null for "all time"; branch 'all' = every branch
export function fetchCompletedBills({ range, branch, columns = '*' }) {
    return fetchAllRows(() => {
        let q = supabase
            .from('completed_bills')
            .select(columns, { count: 'exact' })
            .order('completed_at', { ascending: false }) // most recently completed first
            .order('id', { ascending: true });            // tie-breaker so pages never overlap
        if (range) q = q.gte('completed_at', range.start).lt('completed_at', range.endExclusive);
        if (branch && branch !== 'all') q = q.eq('branch', branch);
        return q;
    });
}

// Deletes the given completed bills (in small batches). -> Set of ids actually deleted.
export async function deleteCompletedBills(ids, branch) {
    const deleted = new Set();
    for (let i = 0; i < ids.length; i += 50) {
        const data = await run(supabase
            .from('completed_bills')
            .delete()
            .in('id', ids.slice(i, i + 50))
            .eq('branch', branch)
            .select('id'));
        (data || []).forEach(r => deleted.add(r.id));
    }
    return deleted;
}

// service times of one cleared bill
export async function fetchBillTimeline(billId) {
    const data = await run(supabase
        .from('item_timeline')
        .select('token_no, is_parcel, item_name, portion, qty, cart_at, sent_at, served_at, cleared_at, order_started_at')
        .eq('bill_id', billId)
        .order('sent_at', { ascending: true }));
    return data || [];
}

// every dish timing row cleared within the range
export function fetchTimelineRows({ range, branch, columns }) {
    return fetchAllRows(() => {
        let q = supabase.from('item_timeline').select(columns, { count: 'exact' })
            .gte('cleared_at', range.start).lt('cleared_at', range.endExclusive)
            .order('cleared_at', { ascending: false }).order('id', { ascending: true });
        if (branch && branch !== 'all') q = q.eq('branch', branch);
        return q;
    });
}

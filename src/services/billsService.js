import { supabase } from '../lib/supabaseClient';
import { fetchAllRows, run } from './db';

// Open bills (one active `bills` row per table) and completed bills.

export async function fetchActiveBills(branch) {
    const data = await run(supabase.from('bills').select('*').eq('status', 'active').eq('branch', branch));
    return data || [];
}

// Updates a known active bill row. -> true if the row was still active (and is now updated).
export async function updateActiveBillById(id, payload) {
    const data = await run(supabase.from('bills').update(payload).eq('id', id).eq('status', 'active').select('id'));
    return !!(data && data.length > 0);
}

export async function findActiveBillId(branch, table) {
    // limit(1) handles a duplicate row gracefully
    const rows = await run(supabase
        .from('bills')
        .select('id')
        .eq('table_number', table)
        .eq('status', 'active')
        .eq('branch', branch)
        .limit(1));
    return rows && rows.length > 0 ? rows[0].id : null;
}

export async function updateBillById(id, payload) {
    await run(supabase.from('bills').update(payload).eq('id', id));
}

// -> id of the new row (or null)
export async function insertActiveBill(branch, table, payload) {
    const data = await run(supabase
        .from('bills')
        .insert({ ...payload, table_number: table, status: 'active', branch })
        .select('id'));
    return data && data[0] ? data[0].id : null;
}

// "Clear bill": the table's active row is closed
export async function markBillCleared(branch, table) {
    await run(supabase
        .from('bills')
        .update({ status: 'cleared' })
        .eq('table_number', table)
        .eq('status', 'active')
        .eq('branch', branch));
}

export async function insertCompletedBill(row) {
    await run(supabase.from('completed_bills').insert(row));
}

// ---- Item order frequency (for the "Fav" tab) ----
// Aggregates quantities from recently completed bills so the menu can surface
// the items actually ordered most often at this branch.
export async function fetchItemFrequency(branch, days = 30) {
    if (!branch) return {};
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        // paginated: a busy month can easily be more than Supabase's 1000-row cap
        const rows = await fetchAllRows(() =>
            supabase
                .from('completed_bills')
                .select('id, items', { count: 'exact' })
                .eq('branch', branch)
                .gte('completed_at', since.toISOString())
                .order('id', { ascending: true })
        );

        const counts = {};
        rows.forEach(row => {
            (row.items || []).forEach(item => {
                counts[item.name] = (counts[item.name] || 0) + (item.qty || 1);
            });
        });
        return counts;
    } catch (err) {
        console.error('Error fetching item frequency:', err);
        return {};
    }
}



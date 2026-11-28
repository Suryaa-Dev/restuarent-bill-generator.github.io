import { supabase } from '../lib/supabaseClient';

// Service-time log (item_timeline): one row per dish when a bill is cleared.

const isMissingColumn = (error) => error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(error.message || ''));

// Never blocks clearing a bill: a logging problem is only reported in the console.
export async function saveTimelineRows(rows) {
    if (!rows.length) return;
    try {
        for (let i = 0; i < rows.length; i += 200) {
            let chunk = rows.slice(i, i + 200);
            let { error } = await supabase.from('item_timeline').insert(chunk);
            if (error && isMissingColumn(error)) {
                // the parcel-estimate column is not in the database yet: save the rest
                chunk = chunk.map(({ eta_minutes, ...rest }) => rest); // eslint-disable-line no-unused-vars
                ({ error } = await supabase.from('item_timeline').insert(chunk));
            }
            if (error) throw error;
        }
    } catch (err) {
        console.error('Could not save item timeline:', err);
    }
}

const ETA_COLUMNS = 'item_name, category, kitchen_id, is_parcel, qty, sent_at, served_at, token_no, bill_id, cleared_at';

// recent dish timings of a branch, to learn cooking times + how good parcel estimates were
export async function fetchRecentTimings(branch, days = 21) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const query = (cols) => supabase.from('item_timeline').select(cols)
        .eq('branch', branch).gte('cleared_at', since).not('sent_at', 'is', null)
        .order('cleared_at', { ascending: false }).limit(1000); // newest 1000 dishes are plenty
    let { data, error } = await query(`${ETA_COLUMNS}, eta_minutes`);
    if (error && isMissingColumn(error)) ({ data, error } = await query(ETA_COLUMNS));
    if (error) throw error;
    return data || [];
}

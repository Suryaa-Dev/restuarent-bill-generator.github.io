import { supabase } from '../lib/supabaseClient';

// Service-time log (item_timeline): one row per dish when a bill is cleared.

// Never blocks clearing a bill: a logging problem is only reported in the console.
export async function saveTimelineRows(rows) {
    if (!rows.length) return;
    try {
        for (let i = 0; i < rows.length; i += 200) {
            const { error } = await supabase.from('item_timeline').insert(rows.slice(i, i + 200));
            if (error) throw error;
        }
    } catch (err) {
        console.error('Could not save item timeline:', err);
    }
}

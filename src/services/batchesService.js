import { supabase } from '../lib/supabaseClient';
import { BATCH, normalizeBatch } from '../features/kds/utils/batches';

// KDS cooking batches (kds_batches + kds_batch_allocs).

export async function fetchBatches(branch, kitchenId) {
    try {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data, error } = await supabase
            .from('kds_batches')
            .select('*, kds_batch_allocs(*)')
            .eq('branch', branch)
            .eq('kitchen_id', kitchenId)
            .neq('status', BATCH.VOIDED)
            .or(`status.eq.${BATCH.IN_PROGRESS},started_at.gte.${since}`)
            .order('batch_no', { ascending: true });
        if (error) throw error;
        return { batches: (data || []).map(normalizeBatch), error: null };
    } catch (error) {
        console.error('Could not load batches:', error);
        return { batches: [], error };
    }
}

// -> { ok, granted, requested, batchNo } | { ok:false, reason: 'taken' | 'failed' }
export async function startBatch({ branch, kitchenId, rec }) {
    const { data, error } = await supabase.rpc('kds_start_batch', {
        p_branch: branch,
        p_kitchen: kitchenId,
        p_item_key: rec.key,
        p_item_name: rec.name,
        p_category: rec.category || '',
        p_allocs: rec.allocs.map(a => ({ token_id: a.tokenId, item_idx: a.idx, qty: a.qty })),
    });
    if (error) {
        const taken = `${error.message || ''}`.includes('nothing_to_allocate');
        if (!taken) console.error('Start batch failed:', error);
        return { ok: false, reason: taken ? 'taken' : 'failed' };
    }
    return { ok: true, granted: data.granted, requested: data.requested, batchNo: data.batch_no };
}

export async function finishBatch(id) {
    const { error } = await supabase.from('kds_batches')
        .update({ status: BATCH.DONE, done_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id).eq('status', BATCH.IN_PROGRESS);
    return !error;
}

export async function undoBatchStart(id) {
    const { error } = await supabase.from('kds_batches')
        .update({ status: BATCH.VOIDED, voided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id).eq('status', BATCH.IN_PROGRESS);
    return !error;
}

export async function persistReconcile({ updates, voidIds }) {
    const now = new Date().toISOString();
    await Promise.all(updates.map(u =>
        supabase.from('kds_batch_allocs')
            .update({ cancelled_qty: u.cancelledQty, wasted_qty: u.wastedQty, updated_at: now })
            .eq('id', u.id)));
    if (voidIds.length) {
        await supabase.from('kds_batches')
            .update({ status: BATCH.VOIDED, voided_at: now, updated_at: now })
            .in('id', voidIds).eq('status', BATCH.IN_PROGRESS);
    }
}

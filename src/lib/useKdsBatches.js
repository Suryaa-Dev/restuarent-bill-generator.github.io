import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import {
    buildRecommendations,
    fetchBatches,
    finishBatch,
    persistReconcile,
    reconcileBatches,
    splitBatches,
    startBatch,
    undoBatchStart,
} from './batches';
import { normalizeBatchWeights } from './batchWeights';

const CLOCK_MS = 15_000; // the recommendation re-ranks at most this often, so cards don't jump around

/* Live batch data for the KDS of ONE kitchen:
     - stored batches (started / done) kept in step between every chef's screen (realtime)
     - batches reconciled with the orders (cancellations)
     - the live recommendations
     - actions: start / done / undo
   Everything shown is derived; a refresh or reconnect simply recomputes the same picture. */
export function useKdsBatches({ branch, kitchenId, tokens, timer, weights: rawWeights }) {
    const [raw, setRaw] = useState([]);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null); // { text, id }
    const aliveRef = useRef(true);
    const loadTimer = useRef(null);

    const weights = useMemo(() => normalizeBatchWeights(rawWeights), [JSON.stringify(rawWeights || null)]); // eslint-disable-line react-hooks/exhaustive-deps

    const [now, setNow] = useState(() => Math.floor(Date.now() / CLOCK_MS) * CLOCK_MS);
    useEffect(() => {
        const id = setInterval(() => setNow(Math.floor(Date.now() / CLOCK_MS) * CLOCK_MS), CLOCK_MS);
        return () => clearInterval(id);
    }, []);

    const load = useCallback(async () => {
        if (!branch || !kitchenId) { setRaw([]); return; }
        const { batches, error: err } = await fetchBatches(branch, kitchenId);
        if (!aliveRef.current) return;
        setError(err);
        if (!err) setRaw(batches);
    }, [branch, kitchenId]);

    const scheduleLoad = useCallback(() => {
        clearTimeout(loadTimer.current);
        loadTimer.current = setTimeout(load, 250);
    }, [load]);

    useEffect(() => {
        aliveRef.current = true;
        if (!branch || !kitchenId) return undefined;
        load();

        const channel = supabase
            .channel(`kds-batches-${branch}-${kitchenId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kds_batches', filter: `branch=eq.${branch}` }, scheduleLoad)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kds_batch_allocs', filter: `branch=eq.${branch}` }, scheduleLoad)
            .subscribe((status) => { if (status === 'SUBSCRIBED') load(); });
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        const safety = setInterval(load, 60_000);

        return () => {
            aliveRef.current = false;
            clearTimeout(loadTimer.current);
            clearInterval(safety);
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(channel);
        };
    }, [branch, kitchenId, load, scheduleLoad]);

    // stored batches, adjusted to the current orders (cancellations etc.)
    const reconciled = useMemo(() => reconcileBatches(raw, tokens), [raw, tokens]);

    // write those adjustments back once (history), without ever repeating the same write
    const sentRef = useRef(new Set());
    useEffect(() => {
        const { updates, voidIds } = reconciled;
        const sig = (u) => `${u.id}:${u.cancelledQty}:${u.wastedQty}`;
        const freshUpdates = updates.filter(u => !sentRef.current.has(sig(u)));
        const freshVoids = voidIds.filter(id => !sentRef.current.has(`void:${id}`));
        if (!freshUpdates.length && !freshVoids.length) return;
        freshUpdates.forEach(u => sentRef.current.add(sig(u)));
        freshVoids.forEach(id => sentRef.current.add(`void:${id}`));
        persistReconcile({ updates: freshUpdates, voidIds: freshVoids }).catch(() => {
            freshUpdates.forEach(u => sentRef.current.delete(sig(u)));
            freshVoids.forEach(id => sentRef.current.delete(`void:${id}`));
        });
    }, [reconciled]);

    const { inProgress, done } = useMemo(() => splitBatches(reconciled.batches), [reconciled]);

    const recs = useMemo(
        () => buildRecommendations({ tokens, batches: reconciled.batches, kitchenId, now, weights, timer }),
        [tokens, reconciled, kitchenId, now, weights, timer]
    );

    const say = (key, vars) => setNotice({ key, vars, id: Date.now() });

    const start = useCallback(async (rec) => {
        setBusyId(`rec:${rec.key}`);
        try {
            const res = await startBatch({ branch, kitchenId, rec });
            if (!res.ok) say(res.reason === 'taken' ? 'takenAll' : 'failed');
            else if (res.granted < res.requested) say('takenSome', { n: res.granted, m: res.requested });
        } finally {
            await load();
            if (aliveRef.current) setBusyId(null);
        }
    }, [branch, kitchenId, load]);

    const finish = useCallback(async (batch) => {
        setBusyId(batch.id);
        try { if (!(await finishBatch(batch.id))) say('failed'); }
        finally { await load(); if (aliveRef.current) setBusyId(null); }
    }, [load]);

    const undo = useCallback(async (batch) => {
        setBusyId(batch.id);
        try { if (!(await undoBatchStart(batch.id))) say('failed'); }
        finally { await load(); if (aliveRef.current) setBusyId(null); }
    }, [load]);

    return { inProgress, done, recs, error, busyId, notice, clearNotice: () => setNotice(null), start, finish, undo, now, refresh: load };
}

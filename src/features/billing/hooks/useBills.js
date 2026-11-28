import { useEffect, useRef, useState } from 'react';
import {
    fetchActiveBills,
    findActiveBillId,
    insertActiveBill,
    updateActiveBillById,
    updateBillById,
} from '../../../services/billsService';
import { subscribeToChanges } from '../../../services/realtime';
import { createEchoFilter, createKeyedQueue, nextStamp } from '../../../shared/utils/syncQueue';
import { lineKey } from '../../kitchens/utils/kitchenLogic';
import { billTotal } from '../utils/billMath';

/* The open bill of every table of a branch, kept in sync with the database and every other device.

   Rush-hour safe saving (see shared/utils/syncQueue.js for the full story):
   1. saves for one table run one at a time AND coalesce: 6 quick taps = 2 writes, not 6
   2. each save is stamped (`version`); when that stamp comes back through realtime it is
      our own echo and is ignored, so old snapshots can never overwrite newer taps

   `billsRef` is an always-fresh mirror of `bills`. React state updates from rapid, back-to-back
   taps can still be "in flight" when the next tap fires, so every change goes through
   commitBills() / setBillsNow(): they update the ref SYNCHRONOUSLY and then the screen. */
export function useBills({ branch, tables }) {
    const [bills, setBills] = useState({});
    const billsRef = useRef({});
    const commitBills = (next) => {
        const value = typeof next === 'function' ? next(billsRef.current) : next;
        billsRef.current = value;
        setBills(value);
    };

    // which tables are marked "Parcel" ({ tableNo: true }), mirrored in a ref for the same reason
    const [parcels, setParcels] = useState({});
    const parcelsRef = useRef({});
    const setParcelsBoth = (next) => { parcelsRef.current = next; setParcels(next); };

    const [loading, setLoading] = useState(true);
    const [pendingSaves, setPendingSaves] = useState([]);   // saves that failed while offline
    const pendingSavesRef = useRef([]);
    pendingSavesRef.current = pendingSaves;
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const billEchoRef = useRef(createEchoFilter());
    const billRowIdRef = useRef({});        // table -> id of its active bill row (skips a lookup per save)
    const saveBillRef = useRef(null);       // always the latest saveBill (branch etc. never stale)
    const refreshBillsRef = useRef(null);   // re-reads all bills from the server without a spinner
    const saveQueueRef = useRef(null);
    if (!saveQueueRef.current) {
        saveQueueRef.current = createKeyedQueue((table, p) => saveBillRef.current(Number(table), p.items, p.addToQueue));
    }
    const enqueueSave = (tableNumber, items, addToQueue = true) =>
        saveQueueRef.current.enqueue(String(tableNumber), { items, addToQueue });

    /* ---------- loading ---------- */

    const loadBills = async () => {
        try {
            setLoading(true);
            const data = await fetchActiveBills(branch);
            const loadedBills = {};
            const loadedParcels = {};
            tables.forEach(num => {
                const tableBill = data.find(b => b.table_number === num);
                loadedBills[num] = tableBill ? tableBill.items : [];
                loadedParcels[num] = !!(tableBill && tableBill.is_parcel);
            });
            commitBills(loadedBills);
            setParcelsBoth(loadedParcels);
        } catch (error) {
            console.error('Error loading bills:', error);
            const initialBills = {};
            tables.forEach(num => { initialBills[num] = []; });
            commitBills(initialBills);
        } finally {
            setLoading(false);
        }
    };

    // Same as loadBills but silent, and it never overwrites a table this device is still
    // saving, or anything while offline edits are waiting to be sent.
    refreshBillsRef.current = async () => {
        if (!branch || !navigator.onLine || pendingSavesRef.current.length > 0) return;
        try {
            const data = await fetchActiveBills(branch);
            const nextParcels = { ...parcelsRef.current };
            let parcelsChanged = false;
            commitBills(prev => {
                const next = { ...prev };
                let changed = false;
                tables.forEach(num => {
                    if (saveQueueRef.current.busy(String(num))) return; // our newer edit is on its way
                    const row = data.find(b => b.table_number === num);
                    const items = row ? row.items : [];
                    if (JSON.stringify(prev[num] || []) !== JSON.stringify(items)) { next[num] = items; changed = true; }
                    const isParcel = !!(row && row.is_parcel);
                    if (!!nextParcels[num] !== isParcel) { nextParcels[num] = isParcel; parcelsChanged = true; }
                });
                return changed ? next : prev; // nothing new: no re-render
            });
            if (parcelsChanged) setParcelsBoth(nextParcels);
        } catch (err) {
            console.error('Quiet bill refresh failed:', err);
        }
    };

    /* ---------- saving ---------- */

    saveBillRef.current = async (tableNumber, items) => {
        try {
            // Stamp this write BEFORE sending it; when the stamp shows up again through realtime
            // we know it is our own echo.
            const version = nextStamp();
            billEchoRef.current.remember(String(tableNumber), version);

            const payload = {
                items,
                total: billTotal(items),
                is_parcel: !!parcelsRef.current[tableNumber],
                updated_at: new Date().toISOString(),
                version,
            };

            // Fast path: we already know this table's active bill row — one request, no lookup.
            let saved = false;
            const knownId = billRowIdRef.current[tableNumber];
            if (knownId) {
                saved = await updateActiveBillById(knownId, payload);
                if (!saved) delete billRowIdRef.current[tableNumber]; // it was cleared meanwhile: look again
            }

            if (!saved) {
                const existingId = await findActiveBillId(branch, tableNumber);
                if (existingId) {
                    await updateBillById(existingId, payload);
                    billRowIdRef.current[tableNumber] = existingId;
                } else {
                    const id = await insertActiveBill(branch, tableNumber, payload);
                    if (id) billRowIdRef.current[tableNumber] = id;
                }
            }
        } catch (error) {
            console.error('❌ Save failed:', error);

            // Likely a service-worker update / temporary offline: keep it and send it later
            if (!navigator.onLine || (error.message || '').includes('Failed to fetch')) {
                setPendingSaves(prev => [...prev, { tableNumber, items }]);
                return;
            }

            alert('Failed to save bill. Please try again.');
        }
    };

    // Retry failed saves when back online
    const retryPendingSaves = async () => {
        const list = pendingSavesRef.current;
        if (list.length === 0) return;
        for (const save of list) {
            await enqueueSave(save.tableNumber, save.items, false);
        }
        setPendingSaves([]);
        alert('✅ Synced offline changes!');
    };
    const retryRef = useRef(retryPendingSaves);
    retryRef.current = retryPendingSaves;

    /* ---------- effects ---------- */

    useEffect(() => {
        if (!branch) return;
        loadBills();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); retryRef.current(); };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // live bill changes from every device of this branch
    useEffect(() => {
        if (!branch) return undefined;
        let billsSubscribedOnce = false;

        const stop = subscribeToChanges(`bills-realtime-${branch}`, [{
            table: 'bills',
            filter: `branch=eq.${branch}`,
            onChange: (payload) => {
                const row = payload.new || payload.old;
                if (!row || !row.table_number) return;
                const table = row.table_number;

                // A bill going to any non-active status (cleared, etc.) means the table is
                // now empty — reflect that on every device. Our own Clear Bill coming back
                // is ignored (the screen is already empty, and a late echo must not wipe a
                // brand-new order started on that table straight afterwards).
                if (row.status && row.status !== 'active') {
                    if (billEchoRef.current.consumeClear(String(table))) return;
                    commitBills(prev => ({ ...prev, [table]: [] }));
                    setParcelsBoth({ ...parcelsRef.current, [table]: false });
                    return;
                }

                // our own save echoing back (older than what is on screen): ignore it
                if (billEchoRef.current.isOwn(String(table), Number(row.version))) return;
                // another device changed this table while we still have saves in flight:
                // our newer edits win; they are written right after, so nothing is lost
                if (saveQueueRef.current.busy(String(table))) return;

                commitBills(prev => ({ ...prev, [table]: row.items || [] }));
                setParcelsBoth({ ...parcelsRef.current, [table]: !!row.is_parcel });
            },
        }], (status) => {
            // the live connection drops while the app sleeps in the background and anything
            // that happened meanwhile is never replayed: read the bills again on reconnect
            if (status === 'SUBSCRIBED') {
                if (billsSubscribedOnce) refreshBillsRef.current?.();
                billsSubscribedOnce = true;
            }
        });

        // coming back to the app / the network returning / a slow safety net: re-sync quietly
        const resync = () => { if (document.visibilityState === 'visible') refreshBillsRef.current?.(); };
        document.addEventListener('visibilitychange', resync);
        window.addEventListener('focus', resync);
        window.addEventListener('online', resync);
        const safety = setInterval(resync, 30000);

        return () => {
            document.removeEventListener('visibilitychange', resync);
            window.removeEventListener('focus', resync);
            window.removeEventListener('online', resync);
            clearInterval(safety);
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    /* ---------- helpers for the bill actions ---------- */

    // replaces one table's bill on screen right away (ref first, then state)
    const setTableBill = (table, items) => {
        const next = { ...billsRef.current, [table]: items };
        billsRef.current = next;
        setBills(next);
    };

    // Adjusts the bill by +/- quantities (used when a token is edited or cancelled so the
    // bill and the tokens never disagree). Lines that reach 0 disappear from the bill.
    const applyBillDelta = async (table, deltas) => {
        const bill = [...(billsRef.current[table] || [])];
        deltas.forEach(d => {
            const idx = bill.findIndex(b => lineKey(b) === lineKey(d));
            if (idx >= 0) {
                const q = bill[idx].qty + d.delta;
                if (q <= 0) bill.splice(idx, 1);
                else bill[idx] = { ...bill[idx], qty: q };
            } else if (d.delta > 0) {
                bill.push({ name: d.name, portion: d.portion, price: d.price, qty: d.delta, category: d.category, addedAt: new Date().toISOString(), ...(d.mods && d.mods.length ? { mods: d.mods } : {}), ...(d.isParcel ? { isParcel: true } : {}) });
            }
        });

        setTableBill(table, bill);
        if (bill.length === 0 && parcelsRef.current[table]) {
            setParcelsBoth({ ...parcelsRef.current, [table]: false });
        }
        await enqueueSave(table, bill);
    };

    // switching branch: forget everything that belongs to the old one
    const resetForBranch = () => {
        commitBills({});
        billRowIdRef.current = {};
        billEchoRef.current.reset();
        setParcelsBoth({});
    };

    return {
        bills,
        billsRef,
        commitBills,
        setTableBill,
        parcels,
        parcelsRef,
        setParcelsBoth,
        loading,
        isOnline,
        enqueueSave,
        saveQueueRef,
        billEchoRef,
        billRowIdRef,
        applyBillDelta,
        resetForBranch,
    };
}

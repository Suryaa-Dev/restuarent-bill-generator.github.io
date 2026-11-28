import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToChanges } from '../../../services/realtime';
import { acquireTableLock, listTableLocks, releaseTableLock, releaseTableLockOnExit } from '../../../services/tableLocksService';

/* One device at a time per table cart. Locks live in the `table_locks` table 
   and are taken by an ATOMIC database function, so two people tapping the same table at the
   same instant can never both get in: the database lets exactly one of them win.

   - acquireLock(table): call BEFORE opening a table's cart. true = you may open it.
   - while the cart is open, a heartbeat keeps the lock alive (every 15 s)
   - closing the cart (or the app) releases it; a lock with no heartbeat for 45 s is free again,
     so a crashed / sleeping phone never blocks a table for long
   - if this device loses its lock (e.g. the phone slept and somebody else took the table),
     onLost(table) is called so the drawer can close

   Returns { lockedTables: { [table]: true } for tables held by OTHER devices, acquireLock }.  */

const HEARTBEAT_MS = 15000;
const POLL_MS = 5000;

const rand = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const CLIENT_ID = (() => {
    try {
        let id = sessionStorage.getItem('table_lock_client');
        if (!id) { id = rand(); sessionStorage.setItem('table_lock_client', id); }
        return id;
    } catch {
        return rand();
    }
})();

export function useTableLocks(branch, openTable, onLost) {
    const [lockedTables, setLockedTables] = useState({});
    const heldRef = useRef(null);          // table this device currently holds
    const overrideRef = useRef(null);      // table opened with "Continue anyway" (nobody holds a lock for it here)
    const lostRef = useRef(onLost);
    lostRef.current = onLost;
    const branchRef = useRef(branch);
    branchRef.current = branch;

    const refresh = useCallback(async () => {
        const b = branchRef.current;
        if (!b) return;
        let data;
        try { data = await listTableLocks(b); } catch (error) { console.error('Could not read table locks:', error); return; }
        const map = {};
        data.forEach(r => { if (r.client_id !== CLIENT_ID) map[r.table_number] = true; });
        setLockedTables(map);
    }, []);

    // opts.override: the person chose "Continue anyway" for a table another device has open. The cart opens
    // without taking the lock (so the other device is NOT thrown out) and without keeping a heartbeat.
    const acquireLock = useCallback(async (table, opts = {}) => {
        const b = branchRef.current;
        if (!b || table == null) return true;
        if (opts.override) { overrideRef.current = table; return true; }
        let ok;
        try {
            ok = await acquireTableLock(b, table, CLIENT_ID);
        } catch (error) {
            // never stop the restaurant because the lock service is unreachable
            console.error('Could not take the table lock:', error);
            return true;
        }
        if (ok) heldRef.current = table;
        refresh();
        return ok;
    }, [refresh]);

    const release = useCallback((table) => {
        const b = branchRef.current;
        if (!b || table == null) return;
        if (heldRef.current === table) heldRef.current = null;
        releaseTableLock(b, table, CLIENT_ID).then(refresh, () => {});
    }, [refresh]);

    // who has what: poll + instant refresh when the table changes (realtime is only a bonus)
    useEffect(() => {
        if (!branch) return undefined;
        refresh();
        const poll = setInterval(refresh, POLL_MS);
        const stop = subscribeToChanges(`table-locks-${branch}`, [
            { table: 'table_locks', filter: `branch=eq.${branch}`, onChange: refresh },
        ]);
        return () => { clearInterval(poll); stop(); };
    }, [branch, refresh]);

    // hold the lock while this table's cart is open; let go when it closes
    useEffect(() => {
        if (openTable == null) {
            overrideRef.current = null;
            if (heldRef.current != null) release(heldRef.current);
            return undefined;
        }
        if (overrideRef.current === openTable) return undefined; // opened anyway: no lock to keep alive
        let stopped = false;
        const keep = async () => {
            const ok = await acquireLock(openTable); // also re-checks that the lock is still ours
            if (!stopped && !ok) lostRef.current?.(openTable);
        };
        if (heldRef.current !== openTable) {
            if (heldRef.current != null) release(heldRef.current); // e.g. table was shifted
            keep();
        }
        const beat = setInterval(keep, HEARTBEAT_MS);
        return () => { stopped = true; clearInterval(beat); };
    }, [openTable, acquireLock, release]);

    // closing the app / tab: free the lock right away (best effort; the 45 s timeout covers the rest)
    useEffect(() => {
        const onHide = () => {
            const table = heldRef.current;
            const b = branchRef.current;
            if (table == null || !b) return;
            releaseTableLockOnExit(b, table, CLIENT_ID);
        };
        window.addEventListener('pagehide', onHide);
        return () => window.removeEventListener('pagehide', onHide);
    }, []);

    return { lockedTables, acquireLock };
}
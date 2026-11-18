import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';

/* One device at a time per table cart. Locks live in the `table_locks` table (table_locks.sql)
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
    const lostRef = useRef(onLost);
    lostRef.current = onLost;
    const branchRef = useRef(branch);
    branchRef.current = branch;

    const refresh = useCallback(async () => {
        const b = branchRef.current;
        if (!b) return;
        const { data, error } = await supabase.rpc('list_table_locks', { p_branch: b });
        if (error) { console.error('list_table_locks failed (run table_locks.sql?):', error); return; }
        const map = {};
        (data || []).forEach(r => { if (r.client_id !== CLIENT_ID) map[r.table_number] = true; });
        setLockedTables(map);
    }, []);

    const acquireLock = useCallback(async (table) => {
        const b = branchRef.current;
        if (!b || table == null) return true;
        const { data, error } = await supabase.rpc('acquire_table_lock', { p_branch: b, p_table: table, p_client: CLIENT_ID });
        if (error) {
            // never stop the restaurant because the lock service is unreachable
            console.error('acquire_table_lock failed (run table_locks.sql?):', error);
            return true;
        }
        if (data === true) heldRef.current = table;
        refresh();
        return data === true;
    }, [refresh]);

    const release = useCallback((table) => {
        const b = branchRef.current;
        if (!b || table == null) return;
        if (heldRef.current === table) heldRef.current = null;
        supabase.rpc('release_table_lock', { p_branch: b, p_table: table, p_client: CLIENT_ID }).then(refresh, () => {});
    }, [refresh]);

    // who has what: poll + instant refresh when the table changes (realtime is only a bonus)
    useEffect(() => {
        if (!branch) return undefined;
        refresh();
        const poll = setInterval(refresh, POLL_MS);
        const channel = supabase
            .channel(`table-locks-${branch}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'table_locks', filter: `branch=eq.${branch}` }, refresh)
            .subscribe();
        return () => { clearInterval(poll); supabase.removeChannel(channel); };
    }, [branch, refresh]);

    // hold the lock while this table's cart is open; let go when it closes
    useEffect(() => {
        if (openTable == null) {
            if (heldRef.current != null) release(heldRef.current);
            return undefined;
        }
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
            try {
                fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/release_table_lock`, {
                    method: 'POST',
                    keepalive: true,
                    headers: {
                        'Content-Type': 'application/json',
                        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ p_branch: b, p_table: table, p_client: CLIENT_ID }),
                });
            } catch { /* ignore */ }
        };
        window.addEventListener('pagehide', onHide);
        return () => window.removeEventListener('pagehide', onHide);
    }, []);

    return { lockedTables, acquireLock };
}
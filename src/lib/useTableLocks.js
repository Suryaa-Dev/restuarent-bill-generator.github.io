import { useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';

/* Who has which table's cart open right now (Supabase Realtime PRESENCE, no table needed).

   - While a cart drawer is open on a device, that device announces { table, since }.
   - Presence is removed automatically the moment the device closes the drawer, closes the
     app or loses its connection, so a lock can never stay stuck for long.
   - Two people tapping the same table in the same instant: the one who opened it FIRST keeps
     it, the other one is told via onConflict(table) and the drawer closes.
   - A lock older than LOCK_MAX_AGE_MS is ignored, so a phone left open on a table can't block
     it forever.

   Returns { [tableNumber]: { key, since } } for tables opened by OTHER devices.            */

const LOCK_MAX_AGE_MS = 15 * 60 * 1000;

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

export function useTableLocks(branch, openTable, onConflict) {
    const [others, setOthers] = useState({});
    const channelRef = useRef(null);
    const readyRef = useRef(false);
    const mineRef = useRef({ table: null, since: 0 });
    const conflictRef = useRef(onConflict);
    conflictRef.current = onConflict;

    useEffect(() => {
        if (!branch) return undefined;
        const channel = supabase.channel(`table-locks-${branch}`, { config: { presence: { key: CLIENT_ID } } });

        const sync = () => {
            const map = {};
            Object.entries(channel.presenceState()).forEach(([key, metas]) => {
                if (key === CLIENT_ID) return;
                (metas || []).forEach(m => {
                    if (m?.table == null || Date.now() - m.since > LOCK_MAX_AGE_MS) return;
                    const cur = map[m.table];
                    if (!cur || m.since < cur.since) map[m.table] = { key, since: m.since };
                });
            });
            setOthers(map);

            // simultaneous open of the same table: the earlier opener wins
            const mine = mineRef.current;
            const o = mine.table != null ? map[mine.table] : null;
            if (o && (o.since < mine.since || (o.since === mine.since && o.key < CLIENT_ID))) {
                conflictRef.current?.(mine.table);
            }
        };

        channel.on('presence', { event: 'sync' }, sync).subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') return;
            readyRef.current = true;
            const mine = mineRef.current;
            if (mine.table != null) await channel.track({ table: mine.table, since: mine.since });
        });
        channelRef.current = channel;

        return () => {
            readyRef.current = false;
            channelRef.current = null;
            supabase.removeChannel(channel);
            setOthers({});
        };
    }, [branch]);

    useEffect(() => {
        const channel = channelRef.current;
        if (openTable != null) {
            if (mineRef.current.table !== openTable) mineRef.current = { table: openTable, since: Date.now() };
            if (readyRef.current && channel) channel.track({ table: openTable, since: mineRef.current.since });
        } else {
            mineRef.current = { table: null, since: 0 };
            if (readyRef.current && channel) channel.untrack();
        }
    }, [openTable]);

    return others;
}

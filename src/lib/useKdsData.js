import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { getSavedBranch } from './branchMenu';
import { createKeyedQueue, tokenEcho } from './billSync';
import { fetchKitchens, fetchActiveTokens, normalizeToken, patchToken } from './kitchen';
import { fetchMenuItems } from './menu';

// Live data for the KDS: kitchens, menu and every active token of this branch.
// Realtime keeps it current; a full re-read on reconnect, on returning to the tab and
// once a minute means the counters always recover to the truth in the token records.
//
// The KDS can also mark items served on behalf of the waiter (serveItem). Those writes use the
// same echo-filter + coalescing queue as the billing screen, so rapid taps never flicker.
export function useKdsData() {
    const branch = getSavedBranch();
    const [kitchens, setKitchens] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    const aliveRef = useRef(true);

    // mirror of `tokens` so async handlers always read the latest list
    const tokensRef = useRef([]);
    const commitTokens = useCallback((fn) => {
        const next = fn(tokensRef.current);
        tokensRef.current = next;
        setTokens(next);
    }, []);

    // serve / un-serve writes: one at a time per token, quick taps merged into one write
    const queueRef = useRef(null);
    if (!queueRef.current) {
        queueRef.current = createKeyedQueue((id, patch) => patchToken(id, patch), (a, b) => ({ ...a, ...b }));
    }

    const loadTokens = useCallback(async () => {
        if (!branch) return;
        try {
            const tks = await fetchActiveTokens(branch);
            if (!aliveRef.current) return;
            // a token we are still saving keeps its (newer) local version
            commitTokens(() => tks.map(srv => (
                queueRef.current.busy(srv.id) ? (tokensRef.current.find(x => x.id === srv.id) || srv) : srv
            )));
            setError(false);
        } catch (e) {
            console.error('KDS: could not load tokens', e);
            if (aliveRef.current) setError(true);
        }
    }, [branch, commitTokens]);

    const loadKitchens = useCallback(async () => {
        try {
            const ks = await fetchKitchens();
            if (aliveRef.current) setKitchens(ks);
        } catch (e) { console.error('KDS: could not load kitchens', e); }
    }, []);

    const loadStatic = useCallback(async () => {
        try {
            const [ks, menu] = await Promise.all([fetchKitchens(), fetchMenuItems()]);
            if (!aliveRef.current) return;
            setKitchens(ks);
            setMenuItems(menu.items || []);
        } catch (e) { console.error('KDS: could not load kitchens/menu', e); }
    }, []);

    useEffect(() => {
        aliveRef.current = true;
        if (!branch) return undefined;

        (async () => {
            await Promise.all([loadStatic(), loadTokens()]);
            if (aliveRef.current) setReady(true);
        })();

        let firstSubscribe = true;
        const tokenChannel = supabase
            .channel(`kds-tokens-${branch}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kot_tokens', filter: `branch=eq.${branch}` }, (payload) => {
                if (payload.eventType === 'DELETE') {
                    const id = payload.old?.id;
                    if (id) commitTokens(list => list.filter(x => x.id !== id));
                    return;
                }
                if (!payload.new) return;
                const tk = normalizeToken(payload.new);
                if (tokenEcho.isOwn(tk.id, Date.parse(tk.updatedAt))) return; // our own serve coming back
                if (queueRef.current.busy(tk.id)) return;                     // our newer local edit wins
                commitTokens(list => {
                    const rest = list.filter(x => x.id !== tk.id);
                    return tk.archived ? rest : [...rest, tk];
                });
            })
            .subscribe((status) => {
                if (status !== 'SUBSCRIBED') return;
                if (firstSubscribe) { firstSubscribe = false; return; }
                loadTokens(); // reconnected: re-read the truth
            });

        const kitchenChannel = supabase
            .channel(`kds-kitchens-${branch}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchens' }, () => loadKitchens())
            .subscribe();

        const onVisible = () => {
            if (document.visibilityState === 'visible') { loadTokens(); loadStatic(); }
        };
        document.addEventListener('visibilitychange', onVisible);
        const safety = setInterval(loadTokens, 60_000);

        return () => {
            aliveRef.current = false;
            clearInterval(safety);
            document.removeEventListener('visibilitychange', onVisible);
            supabase.removeChannel(tokenChannel);
            supabase.removeChannel(kitchenChannel);
        };
    }, [branch, loadStatic, loadTokens, loadKitchens, commitTokens]);

    // Mark one line of a token served (served = true) or take it back (served = false).
    // Optimistic: the card updates instantly, rolls back if the save fails.
    // Resolves true when saved (or nothing to do), false when it failed.
    const serveItem = useCallback(async (tokenId, idx, served = true) => {
        const tk = tokensRef.current.find(x => x.id === tokenId);
        const it = tk?.items?.[idx];
        if (!tk || tk.status !== 'active' || !it || it.removed) return false;
        if (!!it.served === !!served) return true;

        const prevItems = tk.items;
        const nextItems = prevItems.map((x, i) => {
            if (i !== idx) return x;
            return served
                ? { ...x, served: true, servedAt: new Date().toISOString(), servedBy: 'kitchen' }
                : { ...x, served: false, servedAt: null, servedBy: null };
        });

        commitTokens(list => list.map(x => (x.id === tokenId ? { ...x, items: nextItems } : x)));
        try {
            await queueRef.current.enqueue(tokenId, { items: nextItems });
            return true;
        } catch (e) {
            console.error('KDS: serve failed', e);
            commitTokens(list => list.map(x => (x.id === tokenId ? { ...x, items: prevItems } : x)));
            return false;
        }
    }, [commitTokens]);

    return { branch, kitchens, tokens, menuItems, ready, error, serveItem };
}
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { getSavedBranch } from './branchMenu';
import { fetchKitchens, fetchActiveTokens, normalizeToken } from './kitchen';
import { fetchMenuItems } from './menu';

// Live data for the KDS: kitchens, menu and every active token of this branch.
// Realtime keeps it current; a full re-read on reconnect, on returning to the tab and
// once a minute means the counters always recover to the truth in the token records.
export function useKdsData() {
    const branch = getSavedBranch();
    const [kitchens, setKitchens] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    const aliveRef = useRef(true);

    const loadTokens = useCallback(async () => {
        if (!branch) return;
        try {
            const tks = await fetchActiveTokens(branch);
            if (aliveRef.current) { setTokens(tks); setError(false); }
        } catch (e) {
            console.error('KDS: could not load tokens', e);
            if (aliveRef.current) setError(true);
        }
    }, [branch]);

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
                    if (id) setTokens(list => list.filter(x => x.id !== id));
                    return;
                }
                if (!payload.new) return;
                const tk = normalizeToken(payload.new);
                setTokens(list => {
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
    }, [branch, loadStatic, loadTokens, loadKitchens]);

    return { branch, kitchens, tokens, menuItems, ready, error };
}

import { useEffect, useRef, useState } from 'react';
import { fetchKitchens } from '../../../services/kitchensService';
import { archiveTokens, fetchActiveTokens, normalizeToken, patchToken } from '../../../services/tokensService';
import { subscribeToChanges } from '../../../services/realtime';
import { createKeyedQueue, tokenEcho } from '../../../shared/utils/syncQueue';

/* Kitchen System (KOT) data for the billing screen: the kitchens and every live (not yet archived)
   token of this branch. Only loaded while Kitchen mode is on.

   `tokensRef` mirrors `tokens` so async handlers always see the latest list (same trick as billsRef).
   Token edits (Serve / Cancel / Update) go through a per-token queue: rapid Serve taps are merged. */
export function useKitchenTokens({ branch, enabled }) {
    const [kitchens, setKitchens] = useState([]);
    const [kitchenLoadError, setKitchenLoadError] = useState(false);

    const [tokens, setTokens] = useState([]);
    const tokensRef = useRef([]);
    const updateTokens = (fn) => {
        const next = fn(tokensRef.current);
        tokensRef.current = next;
        setTokens(next);
    };
    const upsertToken = (tk) => updateTokens(list => {
        const rest = list.filter(x => x.id !== tk.id);
        return tk.archived ? rest : [...rest, tk];
    });

    const tokenQueueRef = useRef(null);
    if (!tokenQueueRef.current) {
        tokenQueueRef.current = createKeyedQueue((id, patch) => patchToken(id, patch), (a, b) => ({ ...a, ...b }));
    }

    // pending 'archive tokens' database calls, run in order
    const archiveChainRef = useRef(Promise.resolve());

    // load kitchens + tokens; refresh whenever the app comes back to the foreground
    useEffect(() => {
        if (!branch || !enabled) return undefined;
        let cancelled = false;

        const load = async () => {
            try {
                const [ks, tks] = await Promise.all([fetchKitchens(), fetchActiveTokens(branch)]);
                if (cancelled) return;
                setKitchens(ks);
                updateTokens(() => tks);
                setKitchenLoadError(false);
            } catch (err) {
                console.error('Error loading kitchen data:', err);
                if (!cancelled) setKitchenLoadError(true);
            }
        };

        load();
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [branch, enabled]);

    // live token changes from any device (billing phones and the KDS)
    useEffect(() => {
        if (!branch || !enabled) return undefined;
        let tokensSubscribedOnce = false;

        return subscribeToChanges(`kot-realtime-${branch}`, [{
            table: 'kot_tokens',
            filter: `branch=eq.${branch}`,
            onChange: (payload) => {
                if (payload.eventType === 'DELETE') {
                    const id = payload.old?.id;
                    if (id) updateTokens(list => list.filter(x => x.id !== id));
                    return;
                }
                if (!payload.new) return;
                const tk = normalizeToken(payload.new);
                if (tokenEcho.isOwn(tk.id, Date.parse(tk.updatedAt))) return; // our own write coming back
                if (tokenQueueRef.current.busy(tk.id)) return;                // our newer local edit wins
                upsertToken(tk);
            },
        }], (status) => {
            // missed events are never replayed after a dropped connection: read the tokens again
            if (status === 'SUBSCRIBED') {
                if (tokensSubscribedOnce) fetchActiveTokens(branch).then(tks => updateTokens(() => tks)).catch(() => {});
                tokensSubscribedOnce = true;
            }
        });
    }, [branch, enabled]);

    const tokensOfTable = (table) => tokensRef.current.filter(tk => tk.tableNumber === table);

    // Bill cleared (or table emptied) -> its tokens are done; next order restarts at _01
    const resetTokensForTable = (table) => {
        updateTokens(list => list.filter(tk => tk.tableNumber !== table));
        archiveChainRef.current = archiveChainRef.current
            .then(() => archiveTokens(branch, table))
            .catch(err => console.error('Could not archive tokens:', err));
        return archiveChainRef.current;
    };

    return {
        kitchens,
        setKitchens,
        kitchenLoadError,
        tokens,
        tokensRef,
        tokensOfTable,
        updateTokens,
        upsertToken,
        tokenQueueRef,
        archiveChainRef,
        resetTokensForTable,
    };
}

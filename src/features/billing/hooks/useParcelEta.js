import { useCallback, useEffect, useState } from 'react';
import { fetchRecentTimings } from '../../../services/timelineService';
import { buildEtaStats, EMPTY_ETA_STATS, estimateParcel } from '../utils/parcelEta';

const RELOAD_MS = 10 * 60 * 1000; // learned cooking times are refreshed every 10 minutes
const TICK_MS = 30 * 1000;        // the countdown on screen moves every 30 seconds

/* Parcel "Estimated Time" for the billing screen (Kitchen mode only).
   - learns cooking times from the branch's recent timing log
   - estimate(lines, tokens)       a fresh estimate for parcel dishes not sent yet
   - forTable(bill, tableTokens, unsentParcelLines, allTokens)
         minutes left for this table's parcel order: the time promised when a parcel token was sent
         (counting down), or a fresh estimate for parcel dishes still in the cart — whichever is later */
export function useParcelEta({ branch, enabled, kitchens }) {
    const [stats, setStats] = useState(EMPTY_ETA_STATS);
    const [, setNow] = useState(Date.now()); // re-render every 30 s for the countdown

    useEffect(() => {
        if (!branch || !enabled) return undefined;
        let alive = true;
        const load = () => fetchRecentTimings(branch)
            .then(rows => { if (alive) setStats(buildEtaStats(rows)); })
            .catch(err => console.warn('Parcel estimate: could not read past timings', err?.message));
        load();
        const reload = setInterval(load, RELOAD_MS);
        const tick = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => { alive = false; clearInterval(reload); clearInterval(tick); };
    }, [branch, enabled]);

    // dishes cooked at the same time, per kitchen (optional "etaParallel" in a kitchen's kds_config)
    const parallel = Object.fromEntries((kitchens || []).map(k => [k.id, Number(k.kdsConfig?.etaParallel) || undefined]));

    const estimate = useCallback(
        (parcelLines, tokens, excludeTokenIds = []) =>
            estimateParcel({ parcelLines, tokens, now: Date.now(), stats, excludeTokenIds, parallel }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [stats, JSON.stringify(parallel)]
    );

    const forTable = (tableTokens, unsentParcelLines, allTokens) => {
        if (!enabled) return null;
        let readyAt = null;
        const openParcels = tableTokens.filter(tk => tk.isParcel && tk.status === 'active'
            && (tk.items || []).some(it => !it.removed && !it.served && it.kitchenId));
        const withoutPromise = [];
        openParcels.forEach(tk => {
            const at = Date.parse(tk.etaAt);
            if (Number.isFinite(at)) readyAt = Math.max(readyAt ?? 0, at);
            else withoutPromise.push(tk); // sent before estimates existed
        });
        const lines = [
            ...unsentParcelLines,
            ...withoutPromise.flatMap(tk => tk.items.filter(it => !it.removed && !it.served && it.kitchenId)),
        ];
        if (lines.length) {
            const fresh = estimate(lines, allTokens, withoutPromise.map(tk => tk.id));
            if (fresh) readyAt = Math.max(readyAt ?? 0, fresh.readyAt);
        }
        if (readyAt === null) return null;
        // `now` only makes the screen refresh every 30 s; the clock itself is read fresh
        return { minutesLeft: Math.ceil((readyAt - Date.now()) / 60000 - 0.05), readyAt };
    };

    return { estimate, forTable, stats };
}

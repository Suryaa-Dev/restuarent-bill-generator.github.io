import { useEffect, useMemo, useState } from 'react';
import { buildRecommendations } from '../utils/batches';
import { normalizeBatchWeights } from '../utils/batchWeights';

const CLOCK_MS = 15_000; // the list re-ranks at most this often, so cards don't jump around

/* The "Batches" tab: which dish to cook first, for ONE kitchen.
   Pure recommendation calculated from the live tokens — no buttons, nothing saved. */
export function useKdsBatches({ kitchenId, tokens, timer, weights: rawWeights }) {
    const weights = useMemo(() => normalizeBatchWeights(rawWeights), [JSON.stringify(rawWeights || null)]); // eslint-disable-line react-hooks/exhaustive-deps

    const [now, setNow] = useState(() => Math.floor(Date.now() / CLOCK_MS) * CLOCK_MS);
    useEffect(() => {
        const id = setInterval(() => setNow(Math.floor(Date.now() / CLOCK_MS) * CLOCK_MS), CLOCK_MS);
        return () => clearInterval(id);
    }, []);

    const recs = useMemo(
        () => buildRecommendations({ tokens, kitchenId, now, weights, timer }),
        [tokens, kitchenId, now, weights, timer]
    );

    return { recs, now };
}

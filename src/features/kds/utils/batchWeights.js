/* Weights of the batch recommendation score. They always add up to 1 (they are normalised).
   Change them here, or per kitchen without touching code: put a "batchWeights" object into that
   kitchen's kds_config in Supabase, e.g.
     update kitchens set kds_config = kds_config || '{"batchWeights":{"coverage":0.5,"quantity":0.2,"avgWait":0.1,"maxWait":0.1,"urgency":0.1}}' where name = 'Main';
   Missing keys keep their default.                                                            */
export const DEFAULT_BATCH_WEIGHTS = {
    coverage: 0.35, // how many different tables / parcel orders are waiting for the dish
    quantity: 0.25, // total plates waiting
    avgWait: 0.15,  // average waiting time over those tables / orders
    maxWait: 0.15,  // waiting time of the oldest of them
    urgency: 0.10,  // any order already orange / red on the kitchen timer
};

export function normalizeBatchWeights(raw) {
    const w = { ...DEFAULT_BATCH_WEIGHTS };
    if (raw && typeof raw === 'object') {
        Object.keys(w).forEach(k => {
            const v = Number(raw[k]);
            if (Number.isFinite(v) && v >= 0) w[k] = v;
        });
    }
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    if (sum <= 0) return { ...DEFAULT_BATCH_WEIGHTS };
    Object.keys(w).forEach(k => { w[k] /= sum; });
    return w;
}

// Supabase/PostgREST caps every response at 1000 rows (the project's `max_rows`),
// so a plain `.select()` silently truncates big result sets. This helper walks the
// result with `.range()` until everything has been read.
//
// Usage:
//   const rows = await fetchAllRows(() =>
//       supabase.from('completed_bills').select('*', { count: 'exact' }).gte(...).order('id'));
//
// `buildQuery` must return a fresh query each call and MUST include a deterministic
// order (we add `id` as a tie-breaker where needed) so pages never overlap or skip.
const PAGE_SIZE = 1000;

export async function fetchAllRows(buildQuery) {
    const rows = [];
    const seen = new Set();
    let from = 0;
    let total = null;

    // hard stop so a misbehaving server can never spin forever
    for (let guard = 0; guard < 1000; guard++) {
        const { data, error, count } = await buildQuery().range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (total === null && typeof count === 'number') total = count;

        const page = data || [];
        for (const row of page) {
            const key = row.id ?? `${from}-${rows.length}`;
            if (seen.has(key)) continue; // guard against overlap if rows shifted mid-fetch
            seen.add(key);
            rows.push(row);
        }

        if (page.length === 0) break;
        from += page.length;
        if (total !== null && from >= total) break;
        if (total === null && page.length < PAGE_SIZE) break;
    }
    return rows;
}

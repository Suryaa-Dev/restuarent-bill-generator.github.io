import { supabase } from '../lib/supabaseClient';
import { nextStamp, tokenEcho } from '../shared/utils/syncQueue';

// Kitchen order tokens (KOT): one row per "Send token" from a table.

const TOKENS = 'kot_tokens';

export const formatTokenNo = (table, seq) => `T${table}_${String(seq).padStart(2, '0')}`;

export function normalizeToken(row) {
    return {
        id: row.id,
        branch: row.branch,
        tableNumber: row.table_number,
        seq: row.seq,
        tokenNo: row.token_no,
        items: Array.isArray(row.items) ? row.items : [],
        isParcel: !!row.is_parcel,
        status: row.status || 'active',
        revision: row.revision ?? 0,
        archived: !!row.archived,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        etaMinutes: row.eta_minutes ?? null, // parcel: estimated minutes told to the customer
        etaAt: row.eta_at ?? null,           // parcel: estimated ready time
    };
}

// column not in the database yet (the parcel-estimate SQL has not been run): retry without it
const isMissingColumn = (error) => error && (error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(error.message || ''));

export async function fetchActiveTokens(branch) {
    const { data, error } = await supabase
        .from(TOKENS)
        .select('*')
        .eq('branch', branch)
        .eq('archived', false)
        .order('seq', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeToken);
}

// Fires a new token. Picks the next number for the table; if another device grabbed the
// same number a moment ago (unique index), re-reads the table's latest number and retries.
// eta = { minutes, readyAt } for parcel tokens (optional)
export async function createToken({ branch, table, items, isParcel, existing, eta }) {
    let withEta = !!eta;
    let seq = Math.max(0, ...existing.map(t => t.seq)) + 1;
    for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase
            .from(TOKENS)
            .insert({
                branch,
                table_number: table,
                seq,
                token_no: formatTokenNo(table, seq),
                items,
                is_parcel: !!isParcel,
                ...(withEta ? { eta_minutes: eta.minutes, eta_at: new Date(eta.readyAt).toISOString() } : {}),
            })
            .select()
            .single();
        if (!error) return normalizeToken(data);
        if (withEta && isMissingColumn(error)) { withEta = false; attempt -= 1; continue; }
        if (error.code !== '23505') throw error;

        const { data: rows, error: readErr } = await supabase
            .from(TOKENS)
            .select('seq')
            .eq('branch', branch)
            .eq('table_number', table)
            .eq('archived', false);
        if (readErr) throw readErr;
        seq = Math.max(seq, ...(rows || []).map(r => r.seq)) + 1;
    }
    throw new Error('Could not allocate a token number');
}

// patch uses DB column names, e.g. { items, status, revision, is_parcel }
export async function patchToken(id, patch) {
    // stamp the write so its realtime echo can be recognised and ignored (lib/billSync.js)
    const stamp = nextStamp();
    tokenEcho.remember(id, stamp);
    const { data, error } = await supabase
        .from(TOKENS)
        .update({ ...patch, updated_at: new Date(stamp).toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normalizeToken(data);
}

export async function setParcelOnTokens(branch, table, isParcel) {
    const { error } = await supabase
        .from(TOKENS)
        .update({ is_parcel: !!isParcel, updated_at: new Date().toISOString() })
        .eq('branch', branch)
        .eq('table_number', table)
        .eq('archived', false);
    if (error) throw error;
}

// Bill cleared -> this table's tokens are finished; the next order starts again at _01
export async function archiveTokens(branch, table) {
    const { error } = await supabase
        .from(TOKENS)
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('branch', branch)
        .eq('table_number', table)
        .eq('archived', false);
    if (error) throw error;
}

// Shift table: tokens follow the order and are renumbered (#T7_01 -> #T9_01).
// Any leftover tokens on the (empty) destination are archived first.
export async function moveTokens(branch, fromTable, toTable, tokens) {
    await archiveTokens(branch, toTable);
    for (const tk of tokens) {
        const { error } = await supabase
            .from(TOKENS)
            .update({
                table_number: toTable,
                token_no: formatTokenNo(toTable, tk.seq),
                updated_at: new Date().toISOString(),
            })
            .eq('id', tk.id);
        if (error) throw error;
    }
}

/* ---------------- Pure helpers: what has been sent already? ---------------- */

// Quantity per line that the kitchen already has.
//  - removed token lines don't count

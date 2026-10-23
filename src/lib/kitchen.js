import { supabase } from '../config/supabase';

/* =====================================================================
   Kitchen System (KOT) — data layer + pure helpers
   ===================================================================== */

// ---- App mode (per device, like branch + language) ----
const MODE_KEY = 'restaurant_app_mode';
const USED_KEY = 'restaurant_kot_used';

export function getSavedMode() {
    return localStorage.getItem(MODE_KEY) === 'kitchen' ? 'kitchen' : 'normal';
}
export function saveMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
    if (mode === 'kitchen') localStorage.setItem(USED_KEY, '1');
}
// true if Kitchen mode was ever switched on here — so clearing a bill in Normal
// mode can still tidy up tokens that were fired earlier.
export function hasUsedKitchenMode() {
    return localStorage.getItem(USED_KEY) === '1';
}

// Identity of a bill/token line. Matches how the bill itself merges lines.
// In Kitchen mode a bill can hold the SAME dish twice — once as dine-in, once as parcel —
// so the parcel flag is part of the identity. Bill lines carry it themselves (isParcel);
// token lines get it from their token, passed in as the 2nd argument.
export const lineKey = (i, parcel) => `${i.name}||${i.portion}||${i.category || ''}${(parcel ?? i.isParcel) ? '||P' : ''}`;

/* ---------------- Kitchens ---------------- */

const normalizeKitchen = (r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order ?? 0, kdsConfig: r.kds_config || {} });

export async function fetchKitchens() {
    const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeKitchen);
}

export async function createKitchen(name, sortOrder) {
    const { data, error } = await supabase
        .from('kitchens')
        .insert({ name: name.trim(), sort_order: sortOrder })
        .select()
        .single();
    if (error) throw error;
    return normalizeKitchen(data);
}

export async function renameKitchen(id, name) {
    const { data, error } = await supabase
        .from('kitchens')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normalizeKitchen(data);
}

// Saves this kitchen's KDS layout (main boxes, categories, timer limits)
export async function updateKitchenConfig(id, config) {
    const { data, error } = await supabase
        .from('kitchens')
        .update({ kds_config: config, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normalizeKitchen(data);
}

// menu_items.kitchen_id is `on delete set null`, so its items become unassigned.
export async function deleteKitchen(id) {
    const { error } = await supabase.from('kitchens').delete().eq('id', id);
    if (error) throw error;
}

// Only items that currently have NO kitchen are touched (".is(kitchen_id, null)"), so the
// "an item can't be in two kitchens" rule holds even if two devices add at once.
// Returns the ids that were actually assigned.
export async function assignItemsToKitchen(kitchenId, itemIds) {
    if (!itemIds.length) return [];
    const { data, error } = await supabase
        .from('menu_items')
        .update({ kitchen_id: kitchenId, updated_at: new Date().toISOString() })
        .in('id', itemIds)
        .is('kitchen_id', null)
        .select('id');
    if (error) throw error;
    return (data || []).map(r => r.id);
}

export async function unassignItem(itemId) {
    const { error } = await supabase
        .from('menu_items')
        .update({ kitchen_id: null, updated_at: new Date().toISOString() })
        .eq('id', itemId);
    if (error) throw error;
}

// (name, category) -> kitchenId, from the loaded menu
export function buildKitchenLookup(menuItems) {
    const exact = {};
    const byName = {};
    (menuItems || []).forEach(i => {
        exact[`${i.name}||${i.category}`] = i.kitchenId || null;
        if (!(i.name in byName)) byName[i.name] = i.kitchenId || null;
    });
    return (name, category) => {
        const k = `${name}||${category}`;
        if (k in exact) return exact[k];
        return byName[name] ?? null;
    };
}

/* ---------------- Tokens ---------------- */

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
    };
}

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
export async function createToken({ branch, table, items, isParcel, existing }) {
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
            })
            .select()
            .single();
        if (!error) return normalizeToken(data);
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
    const { data, error } = await supabase
        .from(TOKENS)
        .update({ ...patch, updated_at: new Date().toISOString() })
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
//  - a cancelled token only counts what was already served (that food really left the kitchen)
export function computeSentQty(tokens) {
    const sent = {};
    tokens.forEach(tk => {
        (tk.items || []).forEach(it => {
            if (it.removed) return;
            if (tk.status === 'cancelled' && !it.served) return;
            const k = lineKey(it, !!tk.isParcel);
            sent[k] = (sent[k] || 0) + it.qty;
        });
    });
    return sent;
}

// Per bill line: how much is already sent vs. still new.
export function analyzeBill(bill, tokens, kitchenOf) {
    const remaining = computeSentQty(tokens);
    const lines = bill.map(line => {
        const k = lineKey(line);
        const sent = Math.min(remaining[k] || 0, line.qty);
        remaining[k] = (remaining[k] || 0) - sent;
        return { sent, unsent: line.qty - sent };
    });

    // Items that aren't assigned to any kitchen never get a token (e.g. a water bottle the
    // waiter hands over straight away) — they're simply left out of "new" quantity.
    const items = [];
    bill.forEach((line, idx) => {
        const { unsent } = lines[idx];
        const kitchenId = kitchenOf ? kitchenOf(line.name, line.category) : null;
        if (unsent > 0 && kitchenId) {
            items.push({
                name: line.name,
                portion: line.portion,
                category: line.category,
                price: line.price,
                qty: unsent,
                kitchenId,
                served: false,
                isParcel: !!line.isParcel, // decides which token (dine-in / parcel) this goes on
            });
        }
    });
    const count = items.reduce((s, i) => s + i.qty, 0);
    return { lines, items, count };
}

// The Parcel button decides how UNSENT quantities are treated (quantities already sent to the
// kitchen never change section). Turning it on moves every unsent dine-in quantity into the
// parcel section; turning it off moves unsent parcel quantities back to dine-in.
export function convertUnsent(bill, tokens, toParcel) {
    const sent = computeSentQty(tokens);
    const out = bill.map(l => ({ ...l }));
    const base = (l) => `${l.name}||${l.portion}||${l.category || ''}`;

    const groups = new Map();
    out.forEach(l => {
        const k = base(l);
        if (!groups.has(k)) groups.set(k, {});
        groups.get(k)[l.isParcel ? 'p' : 'd'] = l;
    });

    groups.forEach((g) => {
        const from = toParcel ? g.d : g.p;
        if (!from) return;
        const move = Math.max(0, from.qty - (sent[lineKey(from)] || 0));
        if (move === 0) return;
        from.qty -= move;
        const to = toParcel ? g.p : g.d;
        if (to) {
            to.qty += move;
        } else {
            const fresh = { name: from.name, portion: from.portion, price: from.price, qty: move, category: from.category };
            if (toParcel) fresh.isParcel = true;
            out.push(fresh);
            g[toParcel ? 'p' : 'd'] = fresh;
        }
    });

    return out.filter(l => l.qty > 0);
}

// items still waiting to be served across live tokens
export function countPendingServe(tokens) {
    let n = 0;
    tokens.forEach(tk => {
        if (tk.status !== 'active') return;
        (tk.items || []).forEach(it => { if (!it.removed && !it.served) n += it.qty; });
    });
    return n;
}
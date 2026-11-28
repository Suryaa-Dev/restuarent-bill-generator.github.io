import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient';
import { getCachedAccessToken } from './authService';

// Table cart locks (only one device at a time can have a table's cart open).
// The lock functions are atomic database functions: see supabase/schema for table_locks.

// -> [{ table_number, client_id }]   (throws on error)
export async function listTableLocks(branch) {
    const { data, error } = await supabase.rpc('list_table_locks', { p_branch: branch });
    if (error) throw error;
    return data || [];
}

// -> true when this client now holds the lock   (throws on error)
export async function acquireTableLock(branch, table, clientId) {
    const { data, error } = await supabase.rpc('acquire_table_lock', { p_branch: branch, p_table: table, p_client: clientId });
    if (error) throw error;
    return data === true;
}

export function releaseTableLock(branch, table, clientId) {
    return supabase.rpc('release_table_lock', { p_branch: branch, p_table: table, p_client: clientId });
}

// The app / tab is closing: a normal request may be cut off, so send a keep-alive request.
export function releaseTableLockOnExit(branch, table, clientId) {
    try {
        fetch(`${SUPABASE_URL}/rest/v1/rpc/release_table_lock`, {
            method: 'POST',
            keepalive: true,
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${getCachedAccessToken() || SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ p_branch: branch, p_table: table, p_client: clientId }),
        });
    } catch { /* best effort; the 45 s timeout frees it anyway */ }
}

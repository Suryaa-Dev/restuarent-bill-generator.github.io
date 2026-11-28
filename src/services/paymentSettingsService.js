import { supabase } from '../lib/supabaseClient';
import { run } from './db';

// UPI details shown in the "Show QR" window, one row per branch (table payment_settings).

const CACHE_KEY = (branch) => `restaurant_upi_${branch}`;
const EMPTY = { upiId: '', payeeName: '' };

function readCache(branch) {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY(branch))) || null; } catch { return null; }
}
function writeCache(branch, value) {
    try { localStorage.setItem(CACHE_KEY(branch), JSON.stringify(value)); } catch { /* storage full / disabled */ }
}

// -> { upiId, payeeName }. Falls back to this device's last copy when offline.
export async function fetchPaymentSettings(branch) {
    if (!branch) return EMPTY;
    try {
        const row = await run(supabase.from('payment_settings').select('upi_id, payee_name').eq('branch', branch).maybeSingle());
        const value = { upiId: row?.upi_id || '', payeeName: row?.payee_name || '' };
        writeCache(branch, value);
        return value;
    } catch (err) {
        console.error('Could not load UPI settings:', err);
        return readCache(branch) || EMPTY;
    }
}

export function getCachedPaymentSettings(branch) {
    return readCache(branch) || EMPTY;
}

export async function savePaymentSettings(branch, { upiId, payeeName }) {
    const value = { upiId: upiId.trim(), payeeName: payeeName.trim() };
    await run(supabase.from('payment_settings').upsert(
        { branch, upi_id: value.upiId, payee_name: value.payeeName, updated_at: new Date().toISOString() },
        { onConflict: 'branch' }
    ));
    writeCache(branch, value);
    return value;
}

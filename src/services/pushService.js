import { supabase } from '../lib/supabaseClient';

// Background push for KDS phones: subscriptions table + the `kds-push` edge function.

export async function savePushSubscription({ endpoint, p256dh, auth, branch, kitchenId, lang, userAgent }) {
    const { error } = await supabase.from('push_subscriptions').upsert({
        endpoint,
        p256dh,
        auth,
        branch,
        kitchen_id: kitchenId || null,
        lang: lang || 'en',
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) throw error;
}

export async function deletePushSubscription(endpoint) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    if (error) throw error;
}

// -> { data, error }   asks the server to push a test notification to one device
export function requestTestPush(endpoint) {
    return supabase.functions.invoke('kds-push', { body: { test: true, endpoint } });
}

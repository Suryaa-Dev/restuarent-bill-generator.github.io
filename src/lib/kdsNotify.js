/* =====================================================================
   KDS notifications — everything about alerting the chef when the app is
   NOT on screen (he switched to Instagram, locked the phone, …).

   Two layers, both optional, both safe to run together:

   1. LOCAL  — while the page is still alive in the background, a realtime event
               shows a system notification through the service worker.
               (Instant, needs no server. Phones may freeze a backgrounded page
               after a while — that is what layer 2 is for.)

   2. PUSH   — Web Push. A Supabase Edge Function (supabase/functions/kds-push) sends
               the notification from the server, so it arrives even when the app is
               closed. Needs: VITE_VAPID_PUBLIC_KEY + the SQL + the function.
               Without it the app simply runs on layer 1.

   Both layers use the same notification `tag`, so if both fire for the same
   order the phone shows ONE notification, not two.
   ===================================================================== */
import { supabase } from '../config/supabase';
import { tx } from '../i18n/kdsExtra';
import { translateItemName, translatePortion } from '../i18n/translations';

const PREF_KEY = 'restaurant_kds_notify';            // 'on' | 'off' (this device)
const BANNER_KEY = 'restaurant_kds_notify_banner';   // '1' = chef dismissed the banner
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

// Change if your app icon lives somewhere else (public/ folder)
const ICON = '/icon-192.png';

export const hasPushConfig = () => !!VAPID_PUBLIC_KEY;

/* ---------- capability + permission ---------- */

export function getSupport() {
    const ua = navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
    const worker = 'serviceWorker' in navigator;
    return {
        isIos,
        standalone,
        notifications: 'Notification' in window,
        push: worker && 'PushManager' in window,
        // iOS only exposes notifications to apps added to the Home Screen
        needsInstall: isIos && !standalone,
    };
}

export const getPermission = () => ('Notification' in window ? Notification.permission : 'unsupported');
export const getPref = () => localStorage.getItem(PREF_KEY) || 'on';
export const isBannerDismissed = () => localStorage.getItem(BANNER_KEY) === '1';
export const dismissBanner = () => localStorage.setItem(BANNER_KEY, '1');

export async function getRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise(resolve => setTimeout(() => resolve(null), 5000)),
        ]);
    } catch {
        return null;
    }
}

/* ---------- Web Push subscription ---------- */

function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function saveSubscription(sub, { branch, kitchenId, lang }) {
    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        branch,
        kitchen_id: kitchenId || null,
        lang: lang || 'en',
        user_agent: (navigator.userAgent || '').slice(0, 200),
        updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) throw error;
}

// Makes sure this device has a push subscription and that the server knows which
// branch + kitchen it belongs to (re-run whenever the chef switches kitchen).
export async function syncPush(ctx) {
    try {
        const sup = getSupport();
        if (!VAPID_PUBLIC_KEY || !sup.push || getPermission() !== 'granted' || !ctx.branch) return false;
        const reg = await getRegistration();
        if (!reg || !reg.pushManager) return false;
        const sub = (await reg.pushManager.getSubscription())
            || (await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            }));
        await saveSubscription(sub, ctx);
        return true;
    } catch (e) {
        console.error('KDS push: could not subscribe', e);
        return false;
    }
}

/* ---------- turn on / off (call from a tap — browsers require a gesture) ---------- */

export async function enableNotifications(ctx) {
    const sup = getSupport();
    if (!sup.notifications) return { ok: false, reason: sup.needsInstall ? 'install' : 'unsupported' };

    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'denied' };

    localStorage.setItem(PREF_KEY, 'on');
    const push = await syncPush(ctx);
    return { ok: true, push };
}

export async function disableNotifications() {
    localStorage.setItem(PREF_KEY, 'off');
    try {
        const reg = await getRegistration();
        const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null;
        if (sub) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            await sub.unsubscribe();
        }
    } catch (e) {
        console.error('KDS push: could not unsubscribe', e);
    }
}

/* ---------- showing a notification from the page ---------- */

export async function showLocal({ title, body, tag }) {
    const options = {
        body,
        tag,
        renotify: true,           // same tag again => buzz again
        requireInteraction: true, // stays until the chef taps it (Android / desktop)
        vibrate: [300, 120, 300, 120, 300],
        icon: ICON,
        badge: ICON,
        data: { url: '/kds' },
        timestamp: Date.now(),
    };
    try {
        const reg = await getRegistration();
        if (reg) { await reg.showNotification(title, options); return; }
        new Notification(title, options); // eslint-disable-line no-new
    } catch (e) {
        console.error('KDS notify: could not show notification', e);
    }
}

// Close notifications that are already handled once the chef is back in the app
export async function clearShown() {
    try {
        const reg = await getRegistration();
        const list = reg ? await reg.getNotifications() : [];
        list.forEach(n => n.close());
    } catch { /* not supported */ }
}

/* ---------- message text (the edge function builds the same text server-side) ---------- */

const KIND = {
    new: ['evNew', '🔔'],
    update: ['evUpdate', '✏️'],
    renew: ['evRenew', '🔁'],
    cancel: ['evCancel', '❌'],
};

export function formatEvent(ev, lang) {
    const [key, icon] = KIND[ev.kind] || KIND.new;
    const tk = ev.token;
    return {
        title: `${icon} ${tx(key, lang)} · #${tk.tokenNo}${tk.isParcel ? ` · ${tx('parcel', lang)}` : ''}`,
        body: ev.lines
            .map(l => `${l.qty}× ${translateItemName(l.name, lang)}${l.portion ? ` (${translatePortion(l.portion, lang)})` : ''}`)
            .join(', '),
        tag: `${ev.kind}-${tk.id}-${tk.revision ?? 0}`, // must match the edge function
    };
}
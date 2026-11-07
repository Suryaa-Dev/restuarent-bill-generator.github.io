import { useCallback, useEffect, useRef, useState } from 'react';
import { tx } from '../i18n/kdsExtra';
import {
    clearShown,
    disableNotifications,
    dismissBanner,
    enableNotifications,
    formatEvent,
    getPermission,
    getPref,
    getRegistration,
    getSupport,
    isBannerDismissed,
    showLocal,
    syncPush,
} from './kdsNotify';

const MAX_SEPARATE = 3; // more events than this in one go => one summary notification

// All notification state for the KDS screen in one place.
//   status.perm      'granted' | 'denied' | 'default' | 'unsupported'
//   status.enabled   permission granted AND the chef has not switched it off
//   status.push      this device is subscribed to server push (works with the app closed)
export function useKdsNotify({ branch, kitchenId, lang }) {
    const [status, setStatus] = useState(() => ({
        sup: getSupport(), perm: getPermission(), enabled: false, push: false,
    }));
    const [busy, setBusy] = useState(false);
    const [bannerHidden, setBannerHidden] = useState(isBannerDismissed());
    const statusRef = useRef(status);
    statusRef.current = status;

    const ctx = { branch, kitchenId, lang };
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    const refresh = useCallback(async () => {
        const sup = getSupport();
        const perm = getPermission();
        let push = false;
        if (sup.push && perm === 'granted') {
            try {
                const reg = await getRegistration();
                push = !!(reg?.pushManager && await reg.pushManager.getSubscription());
            } catch { /* ignore */ }
        }
        setStatus({ sup, perm, enabled: perm === 'granted' && getPref() !== 'off', push });
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    // keep the server's idea of "which kitchen is this phone watching" current
    useEffect(() => {
        if (!status.enabled || !branch || !kitchenId) return;
        let alive = true;
        syncPush({ branch, kitchenId, lang }).then(ok => { if (alive && ok !== statusRef.current.push) refresh(); });
        return () => { alive = false; };
    }, [status.enabled, branch, kitchenId, lang, refresh]);

    // unseen counter in the tab title + app-icon badge; reset when the chef comes back
    const unseenRef = useRef(0);
    const baseTitleRef = useRef(typeof document !== 'undefined' ? document.title : '');
    useEffect(() => {
        const base = baseTitleRef.current;
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            unseenRef.current = 0;
            document.title = base;
            try { navigator.clearAppBadge?.(); } catch { /* not supported */ }
            clearShown();
            refresh(); // permission may have been changed in the browser settings
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            document.title = base;
        };
    }, [refresh]);

    // called by the KDS screen with describeEvents(...) whenever something changed
    const notifyEvents = useCallback((events) => {
        if (!events?.length) return;
        if (document.visibilityState !== 'hidden') return; // chef is looking at the app: sound + arrows are enough
        if (!statusRef.current.enabled) return;
        const l = ctxRef.current.lang;

        if (events.length > MAX_SEPARATE) {
            const first = formatEvent(events[0], l);
            showLocal({
                title: `🔔 ${events.length} ${tx('evMany', l)}`,
                body: events.map(e => formatEvent(e, l).title.replace(/^\S+\s/, '')).join('\n'),
                tag: `kds-summary-${first.tag}`,
            });
        } else {
            events.forEach(e => showLocal(formatEvent(e, l)));
        }

        unseenRef.current += events.length;
        document.title = `(${unseenRef.current}) ${tx('evNew', l)} · ${baseTitleRef.current}`;
        try { navigator.setAppBadge?.(unseenRef.current); } catch { /* not supported */ }
    }, []);

    const enable = useCallback(async () => {
        setBusy(true);
        try {
            const res = await enableNotifications(ctxRef.current);
            await refresh();
            return res;
        } finally { setBusy(false); }
    }, [refresh]);

    const disable = useCallback(async () => {
        setBusy(true);
        try { await disableNotifications(); await refresh(); } finally { setBusy(false); }
    }, [refresh]);

    const test = useCallback(() => {
        const l = ctxRef.current.lang;
        return showLocal({ title: `🔔 ${tx('evNew', l)} · #T0_01`, body: tx('notifTestBody', l), tag: 'kds-test' });
    }, []);

    const hideBanner = useCallback(() => { dismissBanner(); setBannerHidden(true); }, []);

    const showBanner = !bannerHidden
        && !status.enabled
        && status.perm !== 'denied'
        && (status.sup.notifications || status.sup.needsInstall)
        && getPref() !== 'off';

    return { status, busy, enable, disable, test, notifyEvents, showBanner, hideBanner };
}

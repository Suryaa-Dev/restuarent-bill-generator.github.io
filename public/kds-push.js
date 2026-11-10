/* =====================================================================
   KDS push handler — loaded INTO your existing service worker with one line:

       importScripts('/kds-push.js');

   (put it at the very top of public/sw.js).  Handles:
     - 'push'              a notification sent by the Supabase edge function
                           (works even when the app is closed)
     - 'notificationclick' tapping it opens / focuses the KDS screen
   ===================================================================== */

var KDS_ICON = '/icon-192.png';   // change if your icon has another name / location

// the app pings the worker to find out whether this file is really loaded (Settings -> Check)
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'kds-ping' && event.source) {
        event.source.postMessage({ type: 'kds-pong' });
    }
});

self.addEventListener('push', function (event) {
    var data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }

    var tag = data.tag || 'kds';
    var base = {
        body: data.body || '',
        tag: tag,
        renotify: true,
        icon: KDS_ICON,
        badge: KDS_ICON,
        data: { url: data.url || '/kds' },
        timestamp: Date.now(),
    };
    var loud = Object.assign({}, base, {
        requireInteraction: true,
        vibrate: [300, 120, 300, 120, 300],
    });
    var quiet = Object.assign({}, base, { silent: true });

    event.waitUntil((async function () {
        var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        var watching = wins.some(function (c) { return c.visibilityState === 'visible' && c.focused; });

        // The chef is already looking at the app (it plays its own sound). Browsers still
        // require a notification for every push, so show it silently and drop it again.
        await self.registration.showNotification(data.title || 'Kitchen', watching ? quiet : loud);
        if (watching) {
            await new Promise(function (r) { setTimeout(r, 2500); });
            var shown = await self.registration.getNotifications({ tag: tag });
            shown.forEach(function (n) { n.close(); });
        }
    })());
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var url = (event.notification.data && event.notification.data.url) || '/kds';

    event.waitUntil((async function () {
        var wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

        // 1. a window is already on the KDS: just bring it forward
        for (var i = 0; i < wins.length; i++) {
            if (new URL(wins[i].url).pathname.indexOf('/kds') === 0 && 'focus' in wins[i]) return wins[i].focus();
        }

        // 2. the app is open on another screen (e.g. billing): bring it forward and send it to the KDS
        if (wins.length) {
            var c = wins[0];
            try { c = (await c.focus()) || c; } catch (e) { /* ignore */ }
            try {
                await c.navigate(url);
            } catch (e) {
                c.postMessage({ type: 'kds-open', url: url }); // the app (useKdsLaunch) handles this
            }
            return;
        }

        // 3. the app is closed: open it straight on the KDS
        return self.clients.openWindow(url);
    })());
});
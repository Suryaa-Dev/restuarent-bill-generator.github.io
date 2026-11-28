import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/* Keeps a kitchen phone on the KDS.

   - The app remembers the last main screen. If the chef leaves while the KDS is open (swipes the
     app away, the OS closes it, he taps the app icon later), the next fresh start opens the KDS
     instead of the billing screen. Leaving with the KDS "back" arrow switches this off again,
     so billing phones are never pulled into the KDS.
   - Tapping a notification while the app is open on another screen: the service worker sends a
     'kds-open' message and we jump to the KDS.

   Use once, inside <BrowserRouter> (see main.jsx). */

const KEY = 'restaurant_last_screen'; // 'kds' | 'billing'

export function useKdsLaunch() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;
            // fresh start of the app on the billing route, but the KDS was the last screen
            if (pathname === '/' && localStorage.getItem(KEY) === 'kds') {
                navigate('/kds', { replace: true });
                return;
            }
        }
        if (pathname === '/kds') localStorage.setItem(KEY, 'kds');
        else if (pathname === '/') localStorage.setItem(KEY, 'billing');
    }, [pathname, navigate]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return undefined;
        const onMessage = (e) => {
            if (e.data?.type === 'kds-open') navigate(e.data.url || '/kds');
        };
        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, [navigate]);
}

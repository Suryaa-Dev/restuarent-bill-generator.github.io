import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    fetchMyAccount,
    fetchSetupStatus,
    getCurrentSession,
    onAuthStateChange,
    signIn as signInRequest,
    signOut as signOutRequest,
} from '../../services/authService';
import { allowedBranches, hasAllBranches, hasPermission, ROLES } from './permissions';

/* Who is logged in, and what they may do.

   status: 'loading'  -> checking the saved session
           'setup'    -> no owner account exists yet (first start)
           'signedOut'
           'signedIn' -> `account` is set
           'error'    -> the server could not be reached and there is no saved account to fall back to

   The account (role + permissions) is re-read whenever the app comes back to the foreground,
   so changes made by the owner apply without logging out. A deactivated account is logged out.
   Offline: the last account seen on this device is used, so billing keeps working. */

const AuthContext = createContext(null);
const ACCOUNT_CACHE_KEY = 'restaurant_account';

const readCachedAccount = (userId) => {
    try {
        const a = JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY));
        return a && a.id === userId ? a : null;
    } catch { return null; }
};
const writeCachedAccount = (a) => {
    try {
        if (a) localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(a));
        else localStorage.removeItem(ACCOUNT_CACHE_KEY);
    } catch { /* storage full / disabled */ }
};
const isNetworkError = (e) => /fetch|network|load failed/i.test(`${e?.message || e}`);

export function AuthProvider({ children }) {
    const [status, setStatus] = useState('loading');
    const [account, setAccount] = useState(null);
    const [notice, setNotice] = useState(''); // 'inactive' | 'noAccount' — shown on the login screen
    const userIdRef = useRef(null);

    const showSignedOut = useCallback(async () => {
        userIdRef.current = null;
        setAccount(null);
        try {
            const s = await fetchSetupStatus();
            setStatus(s?.has_admin ? 'signedOut' : 'setup');
        } catch {
            setStatus('signedOut');
        }
    }, []);

    // reads the account of the current session; `quiet` = keep showing the app while it loads
    const loadAccount = useCallback(async (session, { quiet = false } = {}) => {
        if (!session) { await showSignedOut(); return; }
        const userId = session.user?.id;
        userIdRef.current = userId;
        if (!quiet) setStatus('loading');
        try {
            const a = await fetchMyAccount();
            if (userIdRef.current !== userId) return; // someone else logged in meanwhile
            if (!a || !a.is_active) {
                setNotice(a ? 'inactive' : 'noAccount');
                writeCachedAccount(null);
                await signOutRequest();
                await showSignedOut();
                return;
            }
            writeCachedAccount(a);
            setAccount(a);
            setStatus('signedIn');
        } catch (err) {
            console.error('Could not load the account:', err);
            const cached = readCachedAccount(userId);
            if (cached && isNetworkError(err)) { setAccount(cached); setStatus('signedIn'); return; }
            if (quiet) return; // keep the current account; we try again next time
            if (cached) { setAccount(cached); setStatus('signedIn'); return; }
            setStatus('error');
        }
    }, [showSignedOut]);

    useEffect(() => {
        let alive = true;
        getCurrentSession().then(session => { if (alive) loadAccount(session); });

        // never await Supabase calls inside this callback (supabase-js runs it while holding a lock)
        const stop = onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setTimeout(() => { if (alive) { writeCachedAccount(null); showSignedOut(); } }, 0);
            } else if (event === 'SIGNED_IN' && session?.user?.id !== userIdRef.current) {
                setTimeout(() => { if (alive) loadAccount(session); }, 0);
            }
        });

        const onVisible = () => {
            if (document.visibilityState !== 'visible' || !userIdRef.current) return;
            getCurrentSession().then(session => { if (alive && session) loadAccount(session, { quiet: true }); });
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => { alive = false; stop(); document.removeEventListener('visibilitychange', onVisible); };
    }, [loadAccount, showSignedOut]);

    const signIn = useCallback(async (username, password) => {
        setNotice('');
        const session = await signInRequest(username, password);
        await loadAccount(session);
    }, [loadAccount]);

    const signOut = useCallback(async () => {
        writeCachedAccount(null);
        userIdRef.current = null;
        try { await signOutRequest(); } finally { await showSignedOut(); }
    }, [showSignedOut]);

    const refreshAccount = useCallback(async () => {
        const session = await getCurrentSession();
        await loadAccount(session, { quiet: true });
    }, [loadAccount]);

    const value = useMemo(() => {
        const can = (key) => hasPermission(account, key);
        return {
            status,
            account,
            notice,
            isAdmin: !!account && account.is_active && account.role === ROLES.ADMIN,
            can,
            canAny: (keys) => keys.some(can),
            branches: allowedBranches(account),      // branch ids this account may work in
            allBranches: hasAllBranches(account),
            signIn,
            signOut,
            refreshAccount,
            retry: () => getCurrentSession().then(s => loadAccount(s)),
            finishSetup: showSignedOut,
        };
    }, [status, account, notice, signIn, signOut, refreshAccount, loadAccount, showSignedOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

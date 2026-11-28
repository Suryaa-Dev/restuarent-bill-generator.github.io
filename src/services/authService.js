import { supabase } from '../lib/supabaseClient';
import { run } from './db';

/* Login / logout and the logged-in user's own account.
   People log in with a USERNAME. Supabase Auth needs an e-mail, so the username is mapped to an
   internal address "<username>@staff.local" (the same rule is used in supabase/05_users_and_permissions.sql).
   No e-mail is ever sent to it. */

const LOGIN_EMAIL_DOMAIN = 'staff.local';
export const usernameToLoginEmail = (username) => `${String(username || '').trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;

// kept in step with the session so code that cannot wait (closing the app) can still use it
let cachedAccessToken = null;
supabase.auth.onAuthStateChange((_event, session) => { cachedAccessToken = session?.access_token || null; });
export const getCachedAccessToken = () => cachedAccessToken;

export async function getCurrentSession() {
    const { data } = await supabase.auth.getSession();
    cachedAccessToken = data.session?.access_token || null;
    return data.session || null;
}

// callback(event, session); returns an unsubscribe function
export function onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return () => data.subscription.unsubscribe();
}

export async function signIn(username, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToLoginEmail(username), password });
    if (error) throw error;
    return data.session;
}

export async function signOut() {
    // 'local' = this device only; never fails because of a network problem
    await supabase.auth.signOut({ scope: 'local' });
}

// -> { id, username, display_name, role, permissions, is_active } | null
export function fetchMyAccount() {
    return run(supabase.rpc('app_current_user'));
}

export async function changeMyPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

// -> { has_admin: boolean }
export function fetchSetupStatus() {
    return run(supabase.rpc('app_setup_status'));
}

export function createFirstAdmin({ username, password, displayName }) {
    return run(supabase.rpc('create_first_admin', { p_username: username, p_password: password, p_display_name: displayName }));
}

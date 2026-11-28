import { supabase } from '../lib/supabaseClient';
import { run } from './db';

// User management (admins only). Every function is a database function that checks the
// caller is an active admin, see supabase/05_users_and_permissions.sql.

const normalizeUser = (u) => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name || u.username,
    role: u.role,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    branches: Array.isArray(u.branches) ? u.branches : [], // empty = all branches
    isActive: u.is_active !== false,
    createdAt: u.created_at || null,
    lastSignInAt: u.last_sign_in_at || null,
});

export async function listUsers() {
    const rows = await run(supabase.rpc('admin_list_users'));
    return (rows || []).map(normalizeUser);
}

export function createUser({ username, password, displayName, role, permissions, branches }) {
    return run(supabase.rpc('admin_create_user', {
        p_username: username,
        p_password: password,
        p_display_name: displayName,
        p_role: role,
        p_permissions: permissions,
        p_branches: branches || [],
    }));
}

export function updateUser(id, { username, displayName, role, permissions, isActive, branches }) {
    return run(supabase.rpc('admin_update_user', {
        p_id: id,
        p_username: username,
        p_display_name: displayName,
        p_role: role,
        p_permissions: permissions,
        p_is_active: isActive,
        p_branches: branches || [],
    }));
}

export function setUserPassword(id, password) {
    return run(supabase.rpc('admin_set_password', { p_id: id, p_password: password }));
}

export function deleteUser(id) {
    return run(supabase.rpc('admin_delete_user', { p_id: id }));
}

// database error -> short code the UI can translate
export function userErrorCode(err) {
    const msg = `${err?.message || ''}`;
    for (const code of ['username_taken', 'invalid_username', 'weak_password', 'last_admin', 'cannot_change_self', 'not_allowed', 'user_not_found']) {
        if (msg.includes(code)) return code;
    }
    if (/fetch|network/i.test(msg)) return 'network';
    return 'unknown';
}

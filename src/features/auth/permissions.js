/* =====================================================================
   Permission catalogue — the single list of everything an account can be allowed to do.

   - Admins (role 'admin') can do everything, including managing users.
   - Staff (role 'staff') can do only what is in their `permissions` list.
   - A permission with `requires` only works when that permission is also given
     (e.g. "Clear bill" needs "Billing screen"). The user editor keeps this consistent.

   The same keys are checked by the database (supabase/06_lock_down_tables.sql),
   so a permission cannot be bypassed by calling the database directly.
   Labels / descriptions live in i18n/adminExtra.js under `perm.<key>` and `perm.<key>.desc`.
   ===================================================================== */

import { BRANCH_OPTIONS } from '../../shared/utils/devicePrefs';

export const ROLES = { ADMIN: 'admin', STAFF: 'staff' };

export const PERMISSIONS = {
    // screens
    BILLING_VIEW: 'billing.view',
    SERVE_VIEW: 'serve.view',
    KDS_VIEW: 'kds.view',
    HISTORY_VIEW: 'history.view',
    DASHBOARD_VIEW: 'dashboard.view',

    // billing actions
    BILLING_ADD_ITEMS: 'billing.addItems',
    BILLING_REDUCE_ITEMS: 'billing.reduceItems',
    BILLING_CUSTOMIZE: 'billing.customize',
    BILLING_SHIFT_TABLE: 'billing.shiftTable',
    BILLING_PRINT: 'billing.printBill',
    BILLING_SHOW_QR: 'billing.showQr',
    BILLING_CLEAR: 'billing.clearBill',

    // kitchen order tokens (from the billing screen)
    TOKENS_SEND: 'tokens.send',
    TOKENS_SERVE: 'tokens.serve',
    TOKENS_CANCEL: 'tokens.cancel',
    TOKENS_EDIT: 'tokens.edit',

    // kitchen display
    KDS_SERVE: 'kds.serve',

    // history
    HISTORY_DELETE: 'history.deleteBills',

    // settings
    SETTINGS_BRANCH: 'settings.branch',
    SETTINGS_MODE: 'settings.appMode',
    SETTINGS_MENU: 'settings.menu',
    SETTINGS_MODIFIERS: 'settings.modifiers',
    SETTINGS_FAVORITES: 'settings.favorites',
    SETTINGS_KITCHENS: 'settings.kitchens',
    SETTINGS_PAYMENTS: 'settings.payments',
};

const P = PERMISSIONS;

// grouped exactly as shown in Settings -> Users -> (user) -> Permissions
export const PERMISSION_GROUPS = [
    {
        id: 'screens',
        items: [
            { key: P.BILLING_VIEW },
            { key: P.SERVE_VIEW },
            { key: P.KDS_VIEW },
            { key: P.HISTORY_VIEW },
            { key: P.DASHBOARD_VIEW },
        ],
    },
    {
        id: 'billing',
        items: [
            { key: P.BILLING_ADD_ITEMS, requires: P.BILLING_VIEW },
            { key: P.BILLING_REDUCE_ITEMS, requires: P.BILLING_VIEW },
            { key: P.BILLING_CUSTOMIZE, requires: P.BILLING_VIEW },
            { key: P.BILLING_SHIFT_TABLE, requires: P.BILLING_VIEW },
            { key: P.BILLING_PRINT, requires: P.BILLING_VIEW },
            { key: P.BILLING_SHOW_QR, requires: P.BILLING_VIEW },
            { key: P.BILLING_CLEAR, requires: P.BILLING_VIEW },
        ],
    },
    {
        id: 'tokens',
        items: [
            { key: P.TOKENS_SEND, requires: P.BILLING_VIEW },
            { key: P.TOKENS_SERVE },
            { key: P.TOKENS_CANCEL, requires: P.BILLING_VIEW },
            { key: P.TOKENS_EDIT, requires: P.BILLING_VIEW },
        ],
    },
    {
        id: 'kds',
        items: [
            { key: P.KDS_SERVE, requires: P.KDS_VIEW },
        ],
    },
    {
        id: 'history',
        items: [
            { key: P.HISTORY_DELETE, requires: P.HISTORY_VIEW },
        ],
    },
    {
        id: 'settings',
        items: [
            { key: P.SETTINGS_BRANCH },
            { key: P.SETTINGS_MODE },
            { key: P.SETTINGS_MENU },
            { key: P.SETTINGS_MODIFIERS },
            { key: P.SETTINGS_FAVORITES },
            { key: P.SETTINGS_KITCHENS },
            { key: P.SETTINGS_PAYMENTS },
        ],
    },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));
const REQUIRES = Object.fromEntries(PERMISSION_GROUPS.flatMap(g => g.items.filter(i => i.requires).map(i => [i.key, i.requires])));

// ready-made starting points in the user editor (the admin can still tick / untick anything)
export const PERMISSION_PRESETS = [
    {
        id: 'waiter',
        permissions: [P.BILLING_VIEW, P.SERVE_VIEW, P.BILLING_ADD_ITEMS, P.BILLING_REDUCE_ITEMS, P.BILLING_CUSTOMIZE,
            P.BILLING_SHIFT_TABLE, P.BILLING_PRINT, P.BILLING_SHOW_QR, P.TOKENS_SEND, P.TOKENS_SERVE],
    },
    {
        id: 'cashier',
        permissions: [P.BILLING_VIEW, P.SERVE_VIEW, P.BILLING_ADD_ITEMS, P.BILLING_REDUCE_ITEMS, P.BILLING_CUSTOMIZE,
            P.BILLING_SHIFT_TABLE, P.BILLING_PRINT, P.BILLING_SHOW_QR, P.BILLING_CLEAR, P.TOKENS_SEND, P.TOKENS_SERVE,
            P.TOKENS_CANCEL, P.TOKENS_EDIT, P.HISTORY_VIEW],
    },
    {
        id: 'kitchen',
        permissions: [P.KDS_VIEW, P.KDS_SERVE],
    },
    {
        id: 'manager',
        permissions: ALL_PERMISSION_KEYS,
    },
];

// Drops unknown keys and anything whose required permission is missing.
export function normalizePermissions(list) {
    const set = new Set((list || []).filter(k => ALL_PERMISSION_KEYS.includes(k)));
    for (const k of [...set]) if (REQUIRES[k] && !set.has(REQUIRES[k])) set.delete(k);
    return ALL_PERMISSION_KEYS.filter(k => set.has(k));
}

// Turning one permission on / off inside the editor. Turning a screen off also turns off
// the actions that depend on it; turning an action on also turns its screen on.
export function togglePermission(list, key, on) {
    const set = new Set(list);
    if (on) {
        set.add(key);
        if (REQUIRES[key]) set.add(REQUIRES[key]);
    } else {
        set.delete(key);
        Object.entries(REQUIRES).forEach(([k, req]) => { if (req === key) set.delete(k); });
    }
    return ALL_PERMISSION_KEYS.filter(k => set.has(k));
}

// What a given account may do.
export function hasPermission(account, key) {
    if (!account || !account.is_active) return false;
    if (account.role === ROLES.ADMIN) return true;
    if (REQUIRES[key] && !(account.permissions || []).includes(REQUIRES[key])) return false;
    return (account.permissions || []).includes(key);
}

/* Branches: admins work in every branch. A staff account has a list of branch ids; an EMPTY list
   means "all branches" (also true for accounts created before branches could be chosen).
   The database checks the same rule (app_branch_ok in the SQL). */
export const ALL_BRANCH_IDS = BRANCH_OPTIONS.map(b => b.id);

export function hasAllBranches(account) {
    if (!account) return false;
    return account.role === ROLES.ADMIN || !(account.branches || []).length;
}

export function allowedBranches(account) {
    if (!account) return [];
    if (hasAllBranches(account)) return ALL_BRANCH_IDS;
    return ALL_BRANCH_IDS.filter(id => account.branches.includes(id));
}

// Where to send someone after login (or when they open a page they may not use).
export function landingPath(can) {
    if (can(P.BILLING_VIEW) || can(P.SERVE_VIEW)) return '/';
    if (can(P.KDS_VIEW)) return '/kds';
    if (can(P.DASHBOARD_VIEW)) return '/dashboard';
    if (can(P.HISTORY_VIEW)) return '/history';
    return null;
}

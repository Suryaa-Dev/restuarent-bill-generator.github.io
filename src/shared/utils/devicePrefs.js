// Per-device preferences kept in localStorage: branch, language and app mode.
// ---- Branches ----
// Add/rename branches here. `id` is what gets stored in Supabase rows (bills.branch, menu_settings.branch),
// so avoid changing an existing id once you have live data using it.
// (The menu itself is NOT per-branch: it lives in the shared `menu_items` table.)
export const BRANCH_OPTIONS = [
    { id: 'branch1', label: { en: 'Branch 1', mr: 'शाखा १' } },
    { id: 'branch2', label: { en: 'Branch 2', mr: 'शाखा २' } },
];

const BRANCH_STORAGE_KEY = 'restaurant_branch';
const LANG_STORAGE_KEY = 'restaurant_language';

export function getSavedBranch() {
    return localStorage.getItem(BRANCH_STORAGE_KEY);
}

export function saveBranch(branchId) {
    localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
}

export function clearSavedBranch() {
    localStorage.removeItem(BRANCH_STORAGE_KEY);
}

export function branchLabel(branchId, lang) {
    const b = BRANCH_OPTIONS.find(b => b.id === branchId);
    if (!b) return branchId || '';
    return b.label[lang] || b.label.en;
}

export function getSavedLanguage() {
    return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
}

export function saveLanguage(lang) {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
}

// ---- App mode (per device, like branch + language) ----
const MODE_KEY = 'restaurant_app_mode';
const USED_KEY = 'restaurant_kot_used';

export function getSavedMode() {
    return localStorage.getItem(MODE_KEY) === 'kitchen' ? 'kitchen' : 'normal';
}
export function saveMode(mode) {
    localStorage.setItem(MODE_KEY, mode);
    if (mode === 'kitchen') localStorage.setItem(USED_KEY, '1');
}
// true if Kitchen mode was ever switched on here — so clearing a bill in Normal
// mode can still tidy up tokens that were fired earlier.
export function hasUsedKitchenMode() {
    return localStorage.getItem(USED_KEY) === '1';
}

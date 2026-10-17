import { supabase } from '../config/supabase';
import { fetchAllRows } from './fetchAll';

// ---- Branches ----
// Add/rename branches here. `id` is what gets stored in Supabase rows (bills.branch, menu_settings.branch),
// so avoid changing an existing id once you have live data using it.
// (The menu itself is NOT per-branch any more: it lives in the shared `menu_items` table, see lib/menu.js.)
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

// ---- Item order frequency (for the "Fav" tab) ----
// Aggregates quantities from recently completed bills so the menu can surface
// the items actually ordered most often at this branch.
export async function fetchItemFrequency(branch, days = 30) {
    if (!branch) return {};
    try {
        const since = new Date();
        since.setDate(since.getDate() - days);

        // paginated: a busy month can easily be more than Supabase's 1000-row cap
        const rows = await fetchAllRows(() =>
            supabase
                .from('completed_bills')
                .select('id, items', { count: 'exact' })
                .eq('branch', branch)
                .gte('completed_at', since.toISOString())
                .order('id', { ascending: true })
        );

        const counts = {};
        rows.forEach(row => {
            (row.items || []).forEach(item => {
                counts[item.name] = (counts[item.name] || 0) + (item.qty || 1);
            });
        });
        return counts;
    } catch (err) {
        console.error('Error fetching item frequency:', err);
        return {};
    }
}

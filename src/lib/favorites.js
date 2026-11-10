import { supabase } from '../config/supabase';

/* Custom "Fav" tab: an ordered list of menu item ids, kept per branch.
   Saved in Supabase (table branch_favorites, shared by every device of the branch) and mirrored
   in localStorage so it also shows instantly / offline. */

const TABLE = 'branch_favorites';
const localKey = (branch) => `restaurant_favs_${branch}`;

export function readLocalFavorites(branch) {
    try {
        const v = JSON.parse(localStorage.getItem(localKey(branch)));
        return Array.isArray(v) ? v : null;
    } catch { return null; }
}

export function writeLocalFavorites(branch, ids) {
    try { localStorage.setItem(localKey(branch), JSON.stringify(ids)); } catch { /* storage full / disabled */ }
}

// -> { ids: string[] | null, error }   (ids null = nothing saved on the server yet)
export async function fetchFavorites(branch) {
    try {
        const { data, error } = await supabase.from(TABLE).select('items').eq('branch', branch).maybeSingle();
        if (error) throw error;
        if (!data) return { ids: null, error: null };
        const ids = Array.isArray(data.items) ? data.items : [];
        writeLocalFavorites(branch, ids);
        return { ids, error: null };
    } catch (error) {
        console.error('Could not load favourites:', error);
        return { ids: null, error };
    }
}

// -> error | null
export async function saveFavorites(branch, ids) {
    writeLocalFavorites(branch, ids);
    const { error } = await supabase
        .from(TABLE)
        .upsert({ branch, items: ids, updated_at: new Date().toISOString() }, { onConflict: 'branch' });
    if (error) console.error('Could not save favourites:', error);
    return error || null;
}

// Items the Fav tab can show: visible, and not the bare price buttons (rate-picker / ice-cream)
export const isFavEligible = (item) => !item.isHidden && !item.ratePicker;

// ids -> menu items, in the saved order. Deleted / hidden dishes are skipped, duplicates ignored.
export function resolveFavorites(ids, menuItems) {
    const byId = new Map(menuItems.filter(isFavEligible).map(i => [i.id, i]));
    const seen = new Set();
    const out = [];
    (ids || []).forEach(id => {
        const item = byId.get(id);
        if (item && !seen.has(id)) { seen.add(id); out.push(item); }
    });
    return out;
}

// move the entry at `from` to position `to` (clamped)
export function moveItem(list, from, to) {
    if (from < 0 || from >= list.length) return list;
    const target = Math.max(0, Math.min(list.length - 1, to));
    if (target === from) return list;
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(target, 0, x);
    return next;
}

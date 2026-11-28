import { supabase } from '../lib/supabaseClient';
import { writeLocalFavorites } from '../features/menu/utils/favorites';

// Custom "Fav" tab list per branch (table branch_favorites).

const TABLE = 'branch_favorites';

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

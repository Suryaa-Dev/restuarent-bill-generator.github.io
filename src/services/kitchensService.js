import { supabase } from '../lib/supabaseClient';

// Kitchens (KDS stations) and which menu items each one prepares.

const normalizeKitchen = (r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order ?? 0, kdsConfig: r.kds_config || {} });

export async function fetchKitchens() {
    const { data, error } = await supabase
        .from('kitchens')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeKitchen);
}

export async function createKitchen(name, sortOrder) {
    const { data, error } = await supabase
        .from('kitchens')
        .insert({ name: name.trim(), sort_order: sortOrder })
        .select()
        .single();
    if (error) throw error;
    return normalizeKitchen(data);
}

export async function renameKitchen(id, name) {
    const { data, error } = await supabase
        .from('kitchens')
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normalizeKitchen(data);
}

// Saves this kitchen's KDS layout (main boxes, categories, timer limits)
export async function updateKitchenConfig(id, config) {
    const { data, error } = await supabase
        .from('kitchens')
        .update({ kds_config: config, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normalizeKitchen(data);
}

// menu_items.kitchen_id is `on delete set null`, so its items become unassigned.
export async function deleteKitchen(id) {
    const { error } = await supabase.from('kitchens').delete().eq('id', id);
    if (error) throw error;
}

// Only items that currently have NO kitchen are touched (".is(kitchen_id, null)"), so the
// "an item can't be in two kitchens" rule holds even if two devices add at once.
// Returns the ids that were actually assigned.
export async function assignItemsToKitchen(kitchenId, itemIds) {
    if (!itemIds.length) return [];
    const { data, error } = await supabase
        .from('menu_items')
        .update({ kitchen_id: kitchenId, updated_at: new Date().toISOString() })
        .in('id', itemIds)
        .is('kitchen_id', null)
        .select('id');
    if (error) throw error;
    return (data || []).map(r => r.id);
}

export async function unassignItem(itemId) {
    const { error } = await supabase
        .from('menu_items')
        .update({ kitchen_id: null, updated_at: new Date().toISOString() })
        .eq('id', itemId);
    if (error) throw error;
}


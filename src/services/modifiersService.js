import { supabase } from '../lib/supabaseClient';
import { normalizeModifier, byOrder } from '../features/menu/utils/modifiers';

// Modifiers (preparation instructions) table access.

const TABLE = 'modifiers';

export async function fetchModifiers() {
    const { data, error } = await supabase.from(TABLE).select('*').order('sort_order', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeModifier).sort(byOrder);
}

// Creates or updates one modifier and keeps every conflict two-way.
// draft = { id?, name, categories: [..], conflicts: [modifier ids] }; all = current list.
export async function saveModifier(draft, all) {
    const row = {
        name: draft.name.trim(),
        categories: draft.categories,
        conflicts: draft.conflicts,
        updated_at: new Date().toISOString(),
    };
    let id = draft.id;
    if (id) {
        const { error } = await supabase.from(TABLE).update(row).eq('id', id);
        if (error) throw error;
    } else {
        const nextOrder = all.reduce((m, x) => Math.max(m, x.sortOrder), 0) + 10;
        const { data, error } = await supabase.from(TABLE).insert({ ...row, sort_order: nextOrder }).select().single();
        if (error) throw error;
        id = data.id;
    }

    // the other side of every conflict: add / remove this modifier from their lists
    const fixes = all
        .filter(m => m.id !== id)
        .map(m => {
            const has = m.conflicts.includes(id);
            const want = draft.conflicts.includes(m.id);
            if (has === want) return null;
            return { id: m.id, conflicts: want ? [...m.conflicts, id] : m.conflicts.filter(x => x !== id) };
        })
        .filter(Boolean);
    const results = await Promise.all(fixes.map(f => supabase.from(TABLE).update({ conflicts: f.conflicts }).eq('id', f.id)));
    const failed = results.find(r => r.error);
    if (failed) throw failed.error;
    return id;
}

export async function deleteModifier(id, all) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    const fixes = all.filter(m => m.id !== id && m.conflicts.includes(id));
    await Promise.all(fixes.map(m => supabase.from(TABLE).update({ conflicts: m.conflicts.filter(x => x !== id) }).eq('id', m.id)));
}

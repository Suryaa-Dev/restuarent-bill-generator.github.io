/* =====================================================================
   Modifiers: reusable preparation instructions (Spicy, Crispy, Extra Gravy ...)

   - managed in Settings -> Modifiers, stored in the `modifiers` table (modifiers.sql)
   - an order line stores the modifier NAMES it was customised with (line.mods = ['Crispy','Spicy']),
     so old orders stay readable even if a modifier is renamed or deleted later
   - they never change a bill amount
   - conflicts are two-way: if Spicy conflicts with Not Spicy, Not Spicy conflicts with Spicy
   ===================================================================== */

export const normalizeModifier = (r) => ({
    id: r.id,
    name: r.name,
    categories: Array.isArray(r.categories) ? r.categories : [],
    conflicts: Array.isArray(r.conflicts) ? r.conflicts : [],
    sortOrder: r.sort_order ?? 0,
    isActive: r.is_active !== false,
});

export const byOrder = (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/* ---------------- pure helpers ---------------- */

// active modifiers that apply to a menu category, in menu order
export const modifiersForCategory = (modifiers, category) =>
    (modifiers || []).filter(m => m.isActive && m.categories.includes(category || '')).sort(byOrder);

// name -> Set of names it can't be combined with (two-way, whichever side was configured)
export function buildConflictMap(modifiers) {
    const byId = new Map((modifiers || []).map(m => [m.id, m]));
    const map = new Map((modifiers || []).map(m => [m.name, new Set()]));
    (modifiers || []).forEach(m => {
        m.conflicts.forEach(id => {
            const other = byId.get(id);
            if (!other) return;
            map.get(m.name).add(other.name);
            map.get(other.name).add(m.name);
        });
    });
    return map;
}

// true if `name` can't be chosen because something already selected conflicts with it
export const isBlocked = (selected, name, conflictMap) =>
    !selected.includes(name) && selected.some(s => conflictMap.get(s)?.has(name) || conflictMap.get(name)?.has(s));

// tap on a pill: select / unselect (a blocked pill does nothing, whichever was picked first)
export const toggleMod = (selected, name, conflictMap) => {
    if (selected.includes(name)) return selected.filter(n => n !== name);
    if (isBlocked(selected, name, conflictMap)) return selected;
    return [...selected, name];
};

// a stable text for a set of modifiers, used to tell "plain" from "Spicy + Crispy" lines
export const modsSig = (mods) => (mods && mods.length ? [...mods].sort().join('+') : '');

// show / store modifiers in the order they are set up in settings
export const sortModNames = (names, modifiers) => {
    const order = new Map((modifiers || []).map((m, i) => [m.name, i]));
    return [...names].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b));
};

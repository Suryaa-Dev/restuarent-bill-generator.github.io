// Pure helpers for the menu list (no database access).

export function sortMenu(items) {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function getCategories(items) {
    const seen = [];
    sortMenu(items).forEach(i => { if (!seen.includes(i.category)) seen.push(i.category); });
    return seen;
}

// item name -> category, for old bills that were saved before items carried a category.
export function buildCategoryLookup(items) {
    const map = {};
    sortMenu(items).forEach(i => { if (!(i.name in map)) map[i.name] = i.category; });
    return map;
}
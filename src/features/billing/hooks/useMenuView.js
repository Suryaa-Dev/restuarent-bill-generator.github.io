import { useMemo } from 'react';
import { getCategories } from '../../menu/utils/menuUtils';
import { resolveFavorites } from '../../menu/utils/favorites';
import { flattenRatePickerItems } from '../../menu/components/MenuCards';

/* What the menu area shows: visible items, categories and the "Fav" tab.
   "Fav" = the custom list from Settings -> Favourites (in that order); until one is set, the items
   ordered most often at this branch; until there is enough history, the first few menu items.
   Rate-picker items (ice-cream) are left out of the automatic list — they display as bare price
   buttons with no name/photo, which looks out of place among regular item cards. */
export function useMenuView({ menuItems, favoriteIds, itemFrequency, selectedCategory }) {
    // items switched off in Update Menu are not shown
    const visibleItems = useMemo(() => menuItems.filter(item => !item.isHidden), [menuItems]);
    const categories = useMemo(() => getCategories(visibleItems), [visibleItems]);

    const favoriteItems = useMemo(() => {
        const custom = resolveFavorites(favoriteIds, visibleItems);
        if (custom.length > 0) return custom;

        const favEligible = visibleItems.filter(it => !it.ratePicker);
        const byName = {};
        favEligible.forEach(it => { byName[it.name] = it; });

        const rankedNames = Object.entries(itemFrequency)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name)
            .filter(name => byName[name]);

        if (rankedNames.length === 0) return favEligible.slice(0, 8);
        return rankedNames.slice(0, 12).map(name => byName[name]);
    }, [itemFrequency, visibleItems, favoriteIds]);

    const shownItems = useMemo(() => {
        const base = selectedCategory
            ? visibleItems.filter(i => i.category === selectedCategory)
            : favoriteItems;
        return flattenRatePickerItems(base);
    }, [selectedCategory, visibleItems, favoriteItems]);

    // ice-cream (and anything else flagged ratePicker) uses a tighter 3-per-row grid
    const isRatePickerOnly = shownItems.length > 0 && shownItems.every(i => i.ratePicker);

    return { visibleItems, categories, favoriteItems, shownItems, isRatePickerOnly };
}

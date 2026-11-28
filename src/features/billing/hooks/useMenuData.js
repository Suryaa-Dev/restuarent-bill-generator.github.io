import { useEffect, useState } from 'react';
import { fetchMenuItems } from '../../../services/menuService';
import { fetchModifiers } from '../../../services/modifiersService';

// The shared menu (same for every branch) and the modifiers (preparation instructions).
// Both are re-read whenever the app comes back to the foreground, to pick up edits made on another device.
export function useMenuData() {
    const [menuItems, setMenuItems] = useState([]);
    const [menuWarning, setMenuWarning] = useState(false); // showing this device's saved copy (offline)
    const [modifiers, setModifiers] = useState([]);

    const loadMenu = async () => {
        const { items, fromCache, error } = await fetchMenuItems();
        setMenuItems(items);
        setMenuWarning(!!error && fromCache);
    };

    // if the modifiers table does not exist yet the list is simply empty
    const loadModifiers = async () => {
        try { setModifiers(await fetchModifiers()); } catch (err) { console.warn('Modifiers not available:', err?.message); }
    };

    useEffect(() => {
        loadMenu();
        loadModifiers();
        const onVisible = () => {
            if (document.visibilityState === 'visible') { loadMenu(); loadModifiers(); }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    return { menuItems, setMenuItems, menuWarning, loadMenu, modifiers, loadModifiers };
}

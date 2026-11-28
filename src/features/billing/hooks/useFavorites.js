import { useEffect, useRef, useState } from 'react';
import { fetchFavorites, saveFavorites } from '../../../services/favoritesService';
import { fetchItemFrequency } from '../../../services/billsService';
import { readLocalFavorites, writeLocalFavorites } from '../../menu/utils/favorites';
import { getSavedBranch } from '../../../shared/utils/devicePrefs';

/* "Fav" tab data of a branch:
   - favoriteIds: the custom list from Settings -> Favourites (saved in Supabase + on this device)
   - itemFrequency: how often each item was actually ordered (fallback ranking) */
export function useFavorites(branch) {
    const [favoriteIds, setFavoriteIds] = useState(() => readLocalFavorites(getSavedBranch()) || []);
    const [favSyncError, setFavSyncError] = useState(false);
    const favSaveTimer = useRef(null);
    const [itemFrequency, setItemFrequency] = useState({});

    const refreshItemFrequency = () => {
        if (!branch) return;
        fetchItemFrequency(branch).then(setItemFrequency);
    };

    // show this device's copy at once, then take the server's (and re-check on return)
    useEffect(() => {
        if (!branch) return undefined;
        setFavoriteIds(readLocalFavorites(branch) || []);
        let alive = true;
        const load = async () => {
            const { ids, error } = await fetchFavorites(branch);
            if (!alive) return;
            setFavSyncError(!!error);
            if (ids && !favSaveTimer.current) setFavoriteIds(ids); // never overwrite an edit that is still being saved
        };
        load();
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
    }, [branch]);

    useEffect(() => {
        refreshItemFrequency();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    // every change in Settings -> Favourites: show it now, save a moment later (quick taps = one save)
    const changeFavorites = (ids) => {
        setFavoriteIds(ids);
        writeLocalFavorites(branch, ids);
        clearTimeout(favSaveTimer.current);
        favSaveTimer.current = setTimeout(async () => {
            favSaveTimer.current = null;
            const err = await saveFavorites(branch, ids);
            setFavSyncError(!!err);
        }, 500);
    };

    return { favoriteIds, favSyncError, changeFavorites, itemFrequency, refreshItemFrequency };
}

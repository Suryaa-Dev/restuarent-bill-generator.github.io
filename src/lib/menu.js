import { supabase } from '../config/supabase';
import { registerItemNamesMr } from '../i18n/translations';

// The menu lives in the `menu_items` table and is SHARED by every branch
// (see supabase/01_schema.sql). Photos live in the public `menu-images` storage bucket.

const TABLE = 'menu_items';
const BUCKET = 'menu-images';
const CACHE_KEY = 'restaurant_menu_cache_v1';

// DB row -> shape the UI uses
export function normalizeMenuRow(row) {
    return {
        id: row.id,
        name: row.name,
        nameMr: row.name_mr || '',
        category: row.category,
        img: row.image_url || null,
        options: Array.isArray(row.options) ? row.options : [],
        ratePicker: !!row.rate_picker,
        isHidden: !!row.is_hidden,
        sortOrder: row.sort_order ?? 0,
    };
}

function sortMenu(items) {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeCache(items) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch { /* storage full / disabled */ }
}

// Loads the whole menu. If the network/DB is unreachable we fall back to the last
// menu this device saw, so billing keeps working offline.
export async function fetchMenuItems() {
    try {
        const { data, error } = await supabase.from(TABLE).select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        const items = sortMenu((data || []).map(normalizeMenuRow));
        writeCache(items);
        registerItemNamesMr(items);
        return { items, fromCache: false, error: null };
    } catch (err) {
        console.error('Error loading menu:', err);
        const cached = readCache();
        if (cached) registerItemNamesMr(cached);
        return { items: cached || [], fromCache: true, error: err };
    }
}

const toRow = (item) => ({
    name: item.name.trim(),
    name_mr: item.nameMr?.trim() || null,
    category: item.category.trim(),
    image_url: item.img || null,
    options: item.options.map(o => ({ portion: String(o.portion).trim(), price: Number(o.price) })),
    rate_picker: !!item.ratePicker,
    is_hidden: !!item.isHidden,
    updated_at: new Date().toISOString(),
});

export async function createMenuItem(item, nextSortOrder) {
    const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...toRow(item), sort_order: nextSortOrder })
        .select()
        .single();
    if (error) throw error;
    return normalizeMenuRow(data);
}

export async function updateMenuItem(id, item) {
    const { data, error } = await supabase
        .from(TABLE)
        .update(toRow(item))
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normalizeMenuRow(data);
}

export async function setMenuItemHidden(id, isHidden) {
    const { error } = await supabase
        .from(TABLE)
        .update({ is_hidden: isHidden, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
}

export async function deleteMenuItem(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
}

// ---- Images ----

// Phone photos are several MB; shrink to a menu-card-sized JPEG before uploading.
async function shrinkImage(file, maxSide = 900, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality);
    });
}

// Returns the public URL of the uploaded photo.
export async function uploadMenuImage(file) {
    const blob = await shrinkImage(file);
    const path = `items/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
    });
    if (error) throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Best-effort cleanup of a replaced/removed photo (only touches files in our bucket).
export async function deleteMenuImageByUrl(url) {
    if (!url) return;
    const marker = `/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
    try { await supabase.storage.from(BUCKET).remove([path]); } catch { /* ignore */ }
}

// ---- Helpers used by the UI / analytics ----
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

import { supabase } from '../config/supabase';

// ---- Branches ----
// Add/rename branches here. `id` is what gets stored in Supabase rows (bills.branch, menu_settings.branch),
// so avoid changing an existing id once you have live data using it.
export const BRANCH_OPTIONS = [
    { id: 'branch1', label: { en: 'Branch 1', mr: 'शाखा १' } },
    { id: 'branch2', label: { en: 'Branch 2', mr: 'शाखा २' } },
];

const BRANCH_STORAGE_KEY = 'restaurant_branch';
const LANG_STORAGE_KEY = 'restaurant_language';

export function getSavedBranch() {
    return localStorage.getItem(BRANCH_STORAGE_KEY);
}

export function saveBranch(branchId) {
    localStorage.setItem(BRANCH_STORAGE_KEY, branchId);
}

export function clearSavedBranch() {
    localStorage.removeItem(BRANCH_STORAGE_KEY);
}

export function branchLabel(branchId, lang) {
    const b = BRANCH_OPTIONS.find(b => b.id === branchId);
    if (!b) return branchId || '';
    return b.label[lang] || b.label.en;
}

export function getSavedLanguage() {
    return localStorage.getItem(LANG_STORAGE_KEY) || 'en';
}

export function saveLanguage(lang) {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
}

// ---- Menu settings (per-branch overrides + custom items) ----
// Backed by a single-row-per-branch table so it mirrors how `bills` already works in this app.
//
// Run this once in the Supabase SQL editor before using "Update Menu" / branches:
//
// create table if not exists menu_settings (
//   id uuid primary key default gen_random_uuid(),
//   branch text unique not null,
//   custom_items jsonb not null default '[]',
//   price_overrides jsonb not null default '{}',
//   hidden_items jsonb not null default '[]',
//   updated_at timestamptz default now()
// );
//
// alter table bills add column if not exists branch text not null default 'branch1';
// alter table completed_bills add column if not exists branch text not null default 'branch1';

export const emptyMenuSettings = () => ({
    custom_items: [],
    price_overrides: {},
    hidden_items: [],
});

export async function fetchMenuSettings(branch) {
    if (!branch) return emptyMenuSettings();
    try {
        const { data, error } = await supabase
            .from('menu_settings')
            .select('*')
            .eq('branch', branch)
            .maybeSingle();

        if (error) throw error;
        if (!data) return emptyMenuSettings();

        return {
            custom_items: data.custom_items || [],
            price_overrides: data.price_overrides || {},
            hidden_items: data.hidden_items || [],
        };
    } catch (err) {
        console.error('Error loading menu settings:', err);
        return emptyMenuSettings();
    }
}

export async function saveMenuSettings(branch, settings) {
    if (!branch) return;
    const { error } = await supabase
        .from('menu_settings')
        .upsert(
            {
                branch,
                custom_items: settings.custom_items,
                price_overrides: settings.price_overrides,
                hidden_items: settings.hidden_items,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'branch' }
        );

    if (error) throw error;
}

export function priceKey(name, portion) {
    return `${name}||${portion}`;
}

// Merges base (static) menu items with per-branch price overrides / hidden items / custom items.
export function mergeMenu(baseItems, settings) {
    const s = settings || emptyMenuSettings();
    const hidden = new Set(s.hidden_items || []);
    const overrides = s.price_overrides || {};

    const merged = baseItems
        .filter(item => !hidden.has(item.name))
        .map(item => ({
            ...item,
            options: item.options.map(opt => {
                const key = priceKey(item.name, opt.portion);
                return overrides[key] !== undefined ? { ...opt, price: overrides[key] } : opt;
            }),
        }));

    const customItems = (s.custom_items || [])
        .filter(item => !hidden.has(item.name))
        .map(item => ({
            ...item,
            isCustom: true,
            options: item.options.map(opt => {
                const key = priceKey(item.name, opt.portion);
                return overrides[key] !== undefined ? { ...opt, price: overrides[key] } : opt;
            }),
        }));

    return [...merged, ...customItems];
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, ShoppingCart, Printer, Trash2, Plus, Minus, Home, Grid3x3, Settings, Globe, Store, EyeOff, Eye, UtensilsCrossed } from 'lucide-react';
import { supabase } from './config/supabase';
import menuItems from './data/items';
import { t, translateCategory, translateItemName, translatePortion, LANGUAGES } from './i18n/translations';
import {
    BRANCH_OPTIONS,
    getSavedBranch,
    saveBranch,
    branchLabel,
    getSavedLanguage,
    saveLanguage,
    fetchMenuSettings,
    saveMenuSettings,
    mergeMenu,
    priceKey,
    emptyMenuSettings,
} from './lib/branchMenu';


/* ---------------- Header ---------------- */

// top bar with title + cart (mobile) / settings (all tables)
const Header = ({ onCartClick, cartItemCount, currentTab, onSettingsClick, lang, branch }) => (
    <header className="sticky top-0 z-50 bg-orange-500 text-white py-3 px-4 shadow-lg">
        <div className="flex justify-between items-center">
            <div className="flex flex-col leading-tight">
                <h1 className="text-lg md:text-2xl font-bold">{t('appName', lang)}</h1>
                {branch && (
                    <span className="text-[11px] md:text-xs italic font-normal text-orange-100 tracking-wide">
                        {branchLabel(branch, lang)}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {currentTab === 'home' && (
                    <button onClick={onCartClick} className="relative md:hidden bg-orange-600 p-2 rounded-full">
                        <ShoppingCart size={24} />
                        {cartItemCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                )}

                <button
                    onClick={onSettingsClick}
                    aria-label={t('settings', lang)}
                    className="bg-orange-600 p-2 rounded-full"
                >
                    <Settings size={22} />
                </button>
            </div>
        </div>
    </header>
);

/* ---------------- Table Selector (Mobile) ---------------- */

// modal to select table before ordering
const TableSelectorModal = ({ tables, selectedTable, onSelectTable, onClose, lang }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center">
        <div className="bg-white w-full md:w-96 rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold">{t('selectTable', lang)}</h2>
                <button onClick={onClose}><X size={24} /></button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 overflow-y-auto">
                {tables.map(num => (
                    <button
                        key={num}
                        onClick={() => { onSelectTable(num); onClose(); }}
                        className={`p-6 rounded-xl text-lg font-bold transition-all ${selectedTable === num
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                            }`}
                    >
                        T{num}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

/* ---------------- Category Filter ---------------- */

// horizontal category filter (mobile)
const CategoryPills = ({ categories, selectedCategory, onSelectCategory, lang }) => (
    <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto">
        <button
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2 rounded-full ${selectedCategory === null ? 'bg-orange-500 text-white' : 'bg-gray-100'
                }`}
        >
            {t('all', lang)}
        </button>

        {categories.map(cat => (
            <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${selectedCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-100'
                    }`}
            >
                {translateCategory(cat, lang)}
            </button>
        ))}
    </div>
);

/* ---------------- Menu Item Card ---------------- */

// tap card = default portion, buttons = other portions
const MenuItem = ({ item, onAddItem, currentQty, lang }) => {
    const defaultOption = item.options[0]; // most ordered portion
    const hasMultipleOptions = item.options.length > 1;
    const displayName = translateItemName(item.name, lang);

    return (
        <div className="bg-white rounded-xl border border-gray-300 overflow-hidden flex flex-col h-60">
            <div
                onClick={() => onAddItem(item.name, defaultOption.portion, defaultOption.price)}
                className="cursor-pointer flex-1 flex flex-col"
            >
                {item.img ? (
                    <img src={item.img} alt={displayName} className="w-full h-28 object-cover" />
                ) : (
                    <div className="w-full h-28 bg-orange-50 flex items-center justify-center">
                        <UtensilsCrossed size={32} className="text-orange-300" />
                    </div>
                )}

                <div className="p-3 flex flex-col justify-between flex-1">
                    <h3 className="font-bold text-sm line-clamp-2">{displayName}</h3>

                    <div className="flex justify-between items-center">
                        <span className="text-orange-600 font-bold">₹{defaultOption.price}</span>

                        {currentQty > 0 && (
                            <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-bold">
                                {currentQty}x
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {hasMultipleOptions && (
                <div className="px-3 pb-3 flex gap-2">
                    {item.options.slice(1).map((opt, i) => (
                        <button
                            key={i}
                            onClick={() => onAddItem(item.name, opt.portion, opt.price)}
                            className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-200 active:bg-orange-100"
                        >
                            {translatePortion(opt.portion, lang)} ₹{opt.price}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ---------------- Cart Drawer (Mobile) ---------------- */

// bottom drawer for current table bill
const CartDrawer = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, onClose, lang }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold">
                    {selectedTable ? `${t('tableLabel', lang)} ${selectedTable}` : t('cart', lang)}
                </h2>
                <button onClick={onClose}><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {currentBill.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                        <p>{t('noItemsAdded', lang)}</p>
                    </div>
                ) : (
                    currentBill.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-3 border-b">
                            <div>
                                <p className="font-medium">
                                    <span className="text-gray-400 font-normal mr-1">{idx + 1}.</span>
                                    {translateItemName(item.name, lang)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {translatePortion(item.portion, lang)}
                                    <span className="mx-1">·</span>
                                    <span className="text-orange-600 font-medium">₹{item.price} </span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onChangeQuantity(idx, item.qty - 1)}
                                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                                >
                                    <Minus size={16} />
                                </button>

                                <span className="font-bold w-8 text-center text-gray-800">
                                    {item.qty}
                                </span>

                                <button
                                    onClick={() => onChangeQuantity(idx, item.qty + 1)}
                                    className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center active:bg-orange-600"
                                >
                                    <Plus size={16} />
                                </button>

                                <span className="font-bold w-16 text-right text-gray-800">
                                    ₹{item.price * item.qty}
                                </span>
                            </div>

                        </div>
                    ))
                )}
            </div>

            <div className="border-t p-4 space-y-3">
                <div className="flex justify-between font-bold text-xl">
                    <span>{t('total', lang)}</span>
                    <span className="text-orange-600">₹{total}</span>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClearBill}
                        className="flex-1 py-3 rounded-xl font-bold 
               bg-red-500 text-white 
               active:bg-red-600
               shadow-md flex items-center justify-center gap-2"
                    >
                        <Trash2 size={20} />
                        {t('clearBill', lang)}
                    </button>

                    <button
                        onClick={onPrintBill}
                        className="flex-1 py-3 rounded-xl font-bold 
               bg-gray-800 text-white 
               active:bg-black
               shadow-md flex items-center justify-center gap-2"
                    >
                        <Printer size={20} />
                        {t('printBill', lang)}
                    </button>
                </div>

            </div>
        </div>
    </div>
);


// overview of all tables with running totals
const AllTablesGrid = ({ tables, bills, onTableClick }) => {
    const getTableTotal = (tableNum) => {
        const bill = bills[tableNum] || [];
        return bill.reduce((sum, item) => sum + item.price * item.qty, 0);
    };

    const isTableEmpty = (tableNum) => {
        const bill = bills[tableNum] || [];
        return bill.length === 0;
    };

    return (
        <div className="flex-1 overflow-y-auto bg-white p-4">
            {/* <h2 className="text-xl font-bold text-gray-900 mb-4">All Tables</h2> */}

            <div className="grid grid-cols-3 gap-3">
                {tables.map(num => {
                    const total = getTableTotal(num);
                    const empty = isTableEmpty(num);

                    return (
                        <button
                            key={num}
                            onClick={() => onTableClick(num)}
                            className="aspect-square bg-gray-50 border-2 border-gray-200 rounded-xl p-3 flex flex-col items-center justify-center transition-all active:bg-gray-100 active:scale-95"
                        >
                            <span className="text-lg font-bold text-gray-700 mb-2">T{num}</span>
                            {empty ? (
                                <span className="text-sm text-gray-400">—</span>
                            ) : (
                                <span className="text-xl font-bold text-orange-600">₹{total}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// Bottom Navigation to switch between Home and All tables grid view
const BottomNavigation = ({ activeTab, onTabChange, lang }) => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="grid grid-cols-2">
            <button
                onClick={() => onTabChange('home')}
                className={`flex flex-col items-center justify-center py-3 transition-colors ${activeTab === 'home'
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-600'
                    }`}
            >
                <Home size={24} />
                <span className="text-xs mt-1 font-medium">{t('home', lang)}</span>
            </button>

            <button
                onClick={() => onTabChange('allTables')}
                className={`flex flex-col items-center justify-center py-3 transition-colors ${activeTab === 'allTables'
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-600'
                    }`}
            >
                <Grid3x3 size={24} />
                <span className="text-xs mt-1 font-medium">{t('allTables', lang)}</span>
            </button>
        </div>
    </div>
);


const DesktopTableGrid = ({ tables, bills, selectedTable, onSelectTable }) => {
    const getTotal = (tableNum) => {
        const bill = bills[tableNum] || [];
        return bill.reduce((sum, item) => sum + item.price * item.qty, 0);
    };

    return (
        <div className="hidden md:block w-[18%] bg-white p-3 border-r border-gray-200 overflow-y-auto">

            <div className="grid grid-cols-2 gap-2">
                {tables.map(num => {
                    const total = getTotal(num);
                    const isSelected = selectedTable === num;

                    return (
                        <button
                            key={num}
                            onClick={() => onSelectTable(num)}
                            className={`relative aspect-square rounded-xl border p-2 flex flex-col 
                                items-center justify-center transition-all duration-150 select-none
                                ${isSelected
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg scale-[1.04]'
                                    : total > 0
                                        ? 'bg-orange-50 text-gray-800 border-orange-200 shadow-sm hover:bg-orange-100'
                                        : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-300 shadow-sm'
                                }
                            `}
                        >

                            <span className="text-base font-semibold">T{num}</span>

                            {total > 0 ? (
                                <span className="text-2xl font-bold mt-1">
                                    ₹{total}
                                </span>
                            ) : (
                                <span className="text-xs font-bold mt-1">
                                    Empty
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};



// // desktop sidebar for category filtering
// const CategorySidebar = ({ categories, selectedCategory, onSelectCategory }) => (
//     <div className="hidden md:block w-[28%] bg-gray-100 p-3 border-r border-gray-400 overflow-y-auto">
//         <div className="font-bold mb-3 text-gray-600">Categories</div>

//         {categories.map(cat => (
//             <button
//                 key={cat}
//                 onClick={() => onSelectCategory(cat)}
//                 className={`block w-full p-2 mb-1 rounded-lg text-sm transition-all ${selectedCategory === cat
//                     ? 'bg-gray-700 text-white'
//                     : 'bg-white text-gray-800 hover:bg-gray-400 hover:text-white'
//                     }`}
//             >
//                 {cat}
//             </button>
//         ))}

//         <button
//             onClick={() => onSelectCategory(null)}
//             className={`block w-full p-2 mb-1 rounded-lg text-sm transition-all ${selectedCategory === null
//                 ? 'bg-gray-700 text-white'
//                 : 'bg-white text-gray-800 hover:bg-gray-400 hover:text-white'
//                 }`}
//         >
//             All Items
//         </button>
//     </div>
// );



// fixed bill section on desktop
const BillSection = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, lang }) => (
    <div className="hidden md:flex w-[25%] bg-white p-4 flex-col border-l border-gray-400 bill-section-fixed">

        {/* current table info */}
        <h3 className="text-center text-xl font-bold text-gray-700 mb-3">
            {selectedTable ? `${t('billFor', lang)} ${selectedTable}` : t('billSelectTable', lang)}
        </h3>

        {/* scrollable bill items */}
        <div className="bill-scroll-area mb-3 overflow-y-auto">
            {currentBill.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-300">
                    <span className="flex-1 text-gray-800">
                        <span className="text-gray-400 mr-1">{idx + 1}.</span>
                        {translateItemName(item.name, lang)} ({translatePortion(item.portion, lang)})
                        <span className="block text-xs text-orange-600 font-medium">₹{item.price}</span>
                    </span>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onChangeQuantity(idx, item.qty - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                            <Minus size={14} />
                        </button>

                        <span className="w-6 text-center font-bold">
                            {item.qty}
                        </span>

                        <button
                            onClick={() => onChangeQuantity(idx, item.qty + 1)}
                            className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                        >
                            <Plus size={14} />
                        </button>

                        <span className="min-w-15 text-right font-bold text-gray-800">
                            ₹{item.price * item.qty}
                        </span>
                    </div>

                </div>
            ))}
        </div>

        {/* total + actions pinned at bottom */}
        <div className="bill-buttons bg-white pt-2 pb-2 shadow-[0_-2px_8px_rgba(0,0,0,0.1)] sticky bottom-0 z-10">
            <div className="bg-gray-800 text-white text-xl font-bold p-3 rounded-lg text-center mb-3">
                {t('total', lang)}: ₹{total}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={onPrintBill}
                    className="flex-1 bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-black transition-all"
                >
                    {t('printBill', lang)}
                </button>

                <button
                    onClick={onClearBill}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-800 transition-all"
                >
                    {t('clearBill', lang)}
                </button>
            </div>
        </div>
    </div>
);


/* ---------------- Branch Select Modal ---------------- */

const BranchSelectModal = ({ lang, onSelect }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl p-6">
            <h2 className="text-xl font-bold text-center mb-2">{t('selectBranch', lang)}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">{t('selectBranchSubtitle', lang)}</p>

            <div className="space-y-3">
                {BRANCH_OPTIONS.map(branch => (
                    <button
                        key={branch.id}
                        onClick={() => onSelect(branch.id)}
                        className="w-full py-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-bold text-lg active:bg-orange-100 flex items-center justify-center gap-2"
                    >
                        <Store size={20} />
                        {branch.label[lang] || branch.label.en}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

/* ---------------- Settings Modal ---------------- */

const SettingsModal = ({ lang, onChangeLang, branch, onOpenMenuManager, onChangeBranch, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center">
        <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold">{t('settings', lang)}</h2>
                <button onClick={onClose}><X size={24} /></button>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto">
                {/* Language */}
                <div>
                    <div className="flex items-center gap-2 mb-2 text-gray-700 font-semibold">
                        <Globe size={18} />
                        {t('language', lang)}
                    </div>
                    <div className="flex gap-2">
                        {LANGUAGES.map(l => (
                            <button
                                key={l.code}
                                onClick={() => onChangeLang(l.code)}
                                className={`flex-1 py-2 rounded-lg font-bold border ${lang === l.code
                                    ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Update Menu */}
                <button
                    onClick={onOpenMenuManager}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 active:bg-gray-100"
                >
                    <span className="flex items-center gap-2 font-semibold text-gray-800">
                        <UtensilsCrossed size={18} />
                        {t('updateMenu', lang)}
                    </span>
                    <span className="text-gray-400">›</span>
                </button>

                {/* Branch */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">{t('currentBranch', lang)}</p>
                    <p className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <Store size={18} />
                        {branchLabel(branch, lang)}
                    </p>
                    <button
                        onClick={onChangeBranch}
                        className="w-full py-2 rounded-lg bg-orange-100 text-orange-700 font-bold"
                    >
                        {t('switchBranch', lang)}
                    </button>
                </div>
            </div>
        </div>
    </div>
);

/* ---------------- Menu Manager Modal (Update Menu) ---------------- */

const MenuManagerModal = ({ lang, mergedMenu, categories, menuSettings, onSaveSettings, onClose }) => {
    const [localSettings, setLocalSettings] = useState(menuSettings);
    const [saving, setSaving] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null); // `${name}||${portion}`
    const [priceDraft, setPriceDraft] = useState('');

    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState(categories[0] || '');
    const [newPortions, setNewPortions] = useState([{ portion: '', price: '' }]);

    const persist = async (next) => {
        setLocalSettings(next);
        setSaving(true);
        try {
            await onSaveSettings(next);
        } finally {
            setSaving(false);
        }
    };

    const startEditPrice = (name, portion, currentPrice) => {
        setEditingPrice(priceKey(name, portion));
        setPriceDraft(String(currentPrice));
    };

    const confirmEditPrice = async (name, portion) => {
        const value = parseFloat(priceDraft);
        if (isNaN(value) || value < 0) {
            setEditingPrice(null);
            return;
        }
        const next = {
            ...localSettings,
            price_overrides: { ...localSettings.price_overrides, [priceKey(name, portion)]: value },
        };
        setEditingPrice(null);
        await persist(next);
    };

    const toggleHidden = async (name) => {
        const hidden = new Set(localSettings.hidden_items || []);
        if (hidden.has(name)) hidden.delete(name); else hidden.add(name);
        await persist({ ...localSettings, hidden_items: Array.from(hidden) });
    };

    const removeCustomItem = async (name) => {
        if (!window.confirm(t('confirmDeleteCustomItem', lang))) return;
        const next = {
            ...localSettings,
            custom_items: (localSettings.custom_items || []).filter(i => i.name !== name),
        };
        await persist(next);
    };

    const addPortionRow = () => setNewPortions(p => [...p, { portion: '', price: '' }]);
    const updatePortionRow = (idx, field, value) => {
        setNewPortions(p => p.map((row, i) => i === idx ? { ...row, [field]: value } : row));
    };
    const removePortionRow = (idx) => setNewPortions(p => p.filter((_, i) => i !== idx));

    const submitNewItem = async () => {
        const cleanPortions = newPortions
            .map(p => ({ portion: p.portion.trim(), price: parseFloat(p.price) }))
            .filter(p => p.portion && !isNaN(p.price) && p.price >= 0);

        if (!newName.trim() || !newCategory.trim() || cleanPortions.length === 0) {
            alert(t('fillAllFields', lang));
            return;
        }

        const newItem = {
            name: newName.trim(),
            category: newCategory.trim(),
            img: null,
            options: cleanPortions,
        };

        const next = {
            ...localSettings,
            custom_items: [...(localSettings.custom_items || []), newItem],
        };
        await persist(next);

        setNewName('');
        setNewPortions([{ portion: '', price: '' }]);
        setShowAddForm(false);
    };

    const hiddenSet = new Set(localSettings.hidden_items || []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[32rem] rounded-t-2xl md:rounded-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UtensilsCrossed size={20} />
                        {t('updateMenu', lang)}
                        {saving && <span className="text-xs font-normal text-gray-400">({t('savingChanges', lang)})</span>}
                    </h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <p className="text-xs text-gray-500">{t('priceOverrideNote', lang)}</p>

                    {mergedMenu.map((item) => (
                        <div
                            key={item.name}
                            className={`border rounded-xl p-3 ${hiddenSet.has(item.name) ? 'opacity-50 border-gray-200' : 'border-gray-300'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-gray-800">
                                        {translateItemName(item.name, lang)}
                                        {item.isCustom && (
                                            <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full align-middle">
                                                {t('addNewItem', lang)}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">{translateCategory(item.category, lang)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Hide/show toggle is temporarily disabled for items that are
                                        currently visible, to prevent accidental taps from hiding them.
                                        It still works to UN-hide an item that's already hidden. */}
                                    {hiddenSet.has(item.name) ? (
                                        <button
                                            onClick={() => toggleHidden(item.name)}
                                            className="p-2 rounded-full bg-gray-100"
                                            title={t('unhide', lang)}
                                        >
                                            <EyeOff size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="p-2 rounded-full bg-gray-50 text-gray-300 cursor-not-allowed"
                                            title="Hide is temporarily disabled"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    )}
                                    {item.isCustom && (
                                        <button
                                            onClick={() => removeCustomItem(item.name)}
                                            className="p-2 rounded-full bg-red-50 text-red-600"
                                            title={t('deleteItem', lang)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {item.options.map((opt) => {
                                    const key = priceKey(item.name, opt.portion);
                                    const isEditing = editingPrice === key;
                                    return (
                                        <div key={key} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm">
                                            <span className="text-gray-600">{translatePortion(opt.portion, lang)}</span>
                                            {isEditing ? (
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    value={priceDraft}
                                                    onChange={(e) => setPriceDraft(e.target.value)}
                                                    onBlur={() => confirmEditPrice(item.name, opt.portion)}
                                                    onKeyDown={(e) => e.key === 'Enter' && confirmEditPrice(item.name, opt.portion)}
                                                    className="w-16 border rounded px-1 text-right"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditPrice(item.name, opt.portion, opt.price)}
                                                    className="font-bold text-orange-600"
                                                >
                                                    ₹{opt.price}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Add new item */}
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-3 rounded-xl border-2 border-dashed border-orange-300 text-orange-600 font-bold flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            {t('addNewItem', lang)}
                        </button>
                    ) : (
                        <div className="border border-orange-200 rounded-xl p-3 space-y-3 bg-orange-50">
                            <p className="text-xs text-gray-500">{t('menuItemsCustomNote', lang)}</p>

                            <input
                                placeholder={t('itemName', lang)}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                            />

                            <input
                                list="category-options"
                                placeholder={t('category', lang)}
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                            />
                            <datalist id="category-options">
                                {categories.map(c => <option key={c} value={c} />)}
                            </datalist>

                            {newPortions.map((row, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        placeholder={t('portion', lang)}
                                        value={row.portion}
                                        onChange={(e) => updatePortionRow(idx, 'portion', e.target.value)}
                                        className="flex-1 border rounded-lg px-3 py-2"
                                    />
                                    <input
                                        type="number"
                                        placeholder={t('price', lang)}
                                        value={row.price}
                                        onChange={(e) => updatePortionRow(idx, 'price', e.target.value)}
                                        className="w-24 border rounded-lg px-3 py-2"
                                    />
                                    {newPortions.length > 1 && (
                                        <button onClick={() => removePortionRow(idx)} className="px-2 text-red-500">
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button onClick={addPortionRow} className="text-sm text-orange-600 font-semibold">
                                + {t('addPortion', lang)}
                            </button>

                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="flex-1 py-2 rounded-lg bg-gray-200 text-gray-700 font-bold"
                                >
                                    {t('cancel', lang)}
                                </button>
                                <button
                                    onClick={submitNewItem}
                                    className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold"
                                >
                                    {t('save', lang)}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// Main App
export default function RestaurantBillGenerator() {
    const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    // bills per table -> { tableNo: items[] }
    const [bills, setBills] = useState({});

    // Always-fresh mirror of `bills`. React state updates from rapid, back-to-back
    // taps can still be "in flight" (not yet committed) when the next tap fires, so
    // reading `bills` directly inside addItemToBill/changeQuantity can use a stale
    // snapshot and silently drop items. Reading/writing this ref instead guarantees
    // each call always builds on top of the very latest bill, even mid-render.
    const billsRef = useRef({});
    useEffect(() => {
        billsRef.current = bills;
    }, [bills]);

    // Per-table save queue so Supabase writes for the same table always run one at a
    // time, in order. Without this, two overlapping saves (fired from quick taps)
    // can resolve out of order over the network and the earlier (smaller) item list
    // can overwrite the later one in the database.
    const saveQueueRef = useRef({});
    const enqueueSave = (tableNumber, items, addToQueue = true) => {
        const prevInQueue = saveQueueRef.current[tableNumber] || Promise.resolve();
        const nextInQueue = prevInQueue
            .catch(() => { }) // don't let one failed save break the chain for this table
            .then(() => saveBillToSupabase(tableNumber, items, addToQueue));
        saveQueueRef.current[tableNumber] = nextInQueue;
        return nextInQueue;
    };

    // active table for ordering
    const [selectedTable, setSelectedTable] = useState(null);

    // category filter
    const [selectedCategory, setSelectedCategory] = useState(null);

    // mobile ui states
    const [showTableModal, setShowTableModal] = useState(false);
    const [showCartDrawer, setShowCartDrawer] = useState(false);

    // pwa install handling
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    // app state
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'home');

    // used when opening table from all tables view
    const [viewingTableFromAllTables, setViewingTableFromAllTables] = useState(null);

    // offline handling
    const [pendingSaves, setPendingSaves] = useState([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // language + branch
    const [lang, setLang] = useState(getSavedLanguage());
    const [branch, setBranch] = useState(getSavedBranch());
    const [showBranchModal, setShowBranchModal] = useState(!getSavedBranch());

    // settings / menu manager
    const [showSettings, setShowSettings] = useState(false);
    const [showMenuManager, setShowMenuManager] = useState(false);
    const [menuSettings, setMenuSettings] = useState(emptyMenuSettings());

    const selectedTableRef = useRef(null);
    const viewingTableRef = useRef(null);

    useEffect(() => {
        selectedTableRef.current = selectedTable;
    }, [selectedTable]);

    useEffect(() => {
        viewingTableRef.current = viewingTableFromAllTables;
    }, [viewingTableFromAllTables]);


    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Handle install
    const handleInstall = async () => {
        if (!installPrompt) return;

        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setInstallPrompt(null);
            setIsInstalled(true);
        }
    };


    // Load bills from Supabase once a branch is selected AND restore selected table
    useEffect(() => {
        if (!branch) return;
        loadBillsFromSupabase();

        // Restore selected table from localStorage
        const savedTable = localStorage.getItem('selectedTable');
        if (savedTable) {
            setSelectedTable(parseInt(savedTable));
        }
    }, [branch]);

    // Load per-branch menu settings (price overrides / custom items / hidden items)
    useEffect(() => {
        if (!branch) return;
        fetchMenuSettings(branch).then(setMenuSettings);
    }, [branch]);

    useEffect(() => {
        const handleOnline = () => {
            console.log('✅ Back online!');
            setIsOnline(true);
            retryPendingSaves();
        };

        const handleOffline = () => {
            console.log('❌ Offline!');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /* Supabase Section */
    // Real-time subscription to bill changes (scoped to the selected branch)
    useEffect(() => {
        if (!branch) return;

        const channel = supabase
            .channel(`bills-realtime-${branch}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bills',
                    filter: `branch=eq.${branch}`
                },
                (payload) => {
                    console.log('📡 REALTIME PAYLOAD:', payload);

                    const row = payload.new || payload.old;
                    if (!row || !row.table_number) return;
                    if (row.status && row.status !== 'active') return;

                    setBills(prev => ({
                        ...prev,
                        [row.table_number]: row.items || []
                    }));
                }
            )
            .subscribe((status) => {
                console.log('📡 Realtime status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [branch]);



    // Save activeTab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('activeTab', activeTab);
    }, [activeTab]);

    // Save selectedTable to localStorage whenever it changes
    useEffect(() => {
        if (selectedTable) {
            localStorage.setItem('selectedTable', selectedTable.toString());
        }
    }, [selectedTable]);

    // Retry failed saves when back online
    const retryPendingSaves = async () => {
        if (pendingSaves.length === 0) return;

        console.log('🔄 Retrying', pendingSaves.length, 'pending saves...');

        for (const save of pendingSaves) {
            await enqueueSave(save.tableNumber, save.items, false);
        }

        setPendingSaves([]);
        alert('✅ Synced offline changes!');
    };


    const loadBillsFromSupabase = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .eq('status', 'active')
                .eq('branch', branch);

            if (error) throw error;

            console.log('📥 Loaded from Supabase:', data);

            const loadedBills = {};
            tables.forEach(num => {
                const tableBill = data.find(b => b.table_number === num);
                loadedBills[num] = tableBill ? tableBill.items : [];

                if (tableBill) {
                    console.log(`Table ${num} items:`, tableBill.items);
                }
            });

            console.log('📊 Final bills state:', loadedBills);
            setBills(loadedBills);
        } catch (error) {
            console.error('Error loading bills:', error);
            const initialBills = {};
            tables.forEach(num => { initialBills[num] = []; });
            setBills(initialBills);
        } finally {
            setLoading(false);
        }
    };

    const saveBillToSupabase = async (tableNumber, items, addToQueue = true) => {
        try {
            console.log('💾 Saving to Supabase:', { tableNumber, itemCount: items.length, items });

            const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

            // Use limit(1) to handle multiple rows gracefully
            const { data: existingRows, error: selectError } = await supabase
                .from('bills')
                .select('id')
                .eq('table_number', tableNumber)
                .eq('status', 'active')
                .eq('branch', branch)
                .limit(1);

            if (selectError) {
                console.error('❌ Select error:', selectError);
                throw selectError;
            }

            const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

            if (existing) {
                console.log('🔄 Updating existing bill:', existing.id, 'with', items.length, 'items');

                const nextVersion = Date.now();

                const { data, error } = await supabase
                    .from('bills')
                    .update({
                        items,
                        total,
                        updated_at: new Date().toISOString(),
                        version: nextVersion
                    })
                    .eq('id', existing.id)
                    .select();

                if (error) {
                    console.error('❌ Update error:', error);
                    throw error;
                }
                console.log('✅ Update successful, returned data:', data);
            } else {
                console.log('➕ Creating new bill with', items.length, 'items');

                const { data, error } = await supabase
                    .from('bills')
                    .insert({
                        table_number: tableNumber,
                        items,
                        total,
                        status: 'active',
                        branch,
                        version: Date.now()
                    })


                    .select();

                if (error) {
                    console.error('❌ Insert error:', error);
                    throw error;
                }
                console.log('✅ Insert successful, returned data:', data);
            }

            // Add a small delay to ensure database commit before real-time triggers
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error('❌ Save failed:', error);

            // 🔁 Likely SW update / temporary offline
            if (!navigator.onLine || error.message.includes('Failed to fetch')) {
                setPendingSaves(prev => [...prev, { tableNumber, items }]);
                console.log('📦 Queued due to SW update / offline');
                return;
            }

            alert('Failed to save bill. Please try again.');
        }

    };

    // Customer-facing menu: hidden items dropped entirely
    const mergedMenuItems = useMemo(() => mergeMenu(menuItems, menuSettings), [menuSettings]);
    // Manager-facing menu: hidden items kept (tagged isHidden) so they can still be un-hidden
    const managerMenuItems = useMemo(() => mergeMenu(menuItems, menuSettings, { includeHidden: true }), [menuSettings]);
    const categories = [...new Set(mergedMenuItems.map(item => item.category))];
    const filteredMenu = selectedCategory ? mergedMenuItems.filter(i => i.category === selectedCategory) : mergedMenuItems;


    // adds an item to the selected table's bill
    // uses optimistic update so UI feels instant

    const addItemToBill = async (name, portion, price) => {
        if (!selectedTable) {
            setShowTableModal(true);
            return;
        }

        // read from the ref, not the `bills` state variable, so a burst of quick
        // taps always builds on the latest bill instead of a stale render snapshot
        const newBills = { ...billsRef.current };
        const bill = [...(newBills[selectedTable] || [])];

        // check if same item + portion already exists
        const existing = bill.find(
            b => b.name === name && b.portion === portion
        );

        if (existing) {
            existing.qty++;
        } else {
            bill.push({ name, portion, price, qty: 1 });
        }

        newBills[selectedTable] = bill;

        // update the ref immediately (synchronously) so the very next tap, even
        // before this render commits, sees this addition
        billsRef.current = newBills;

        // update UI immediately 
        setBills(newBills);

        // sync with backend (queued if offline; serialized per-table)
        await enqueueSave(selectedTable, bill);
    };


    // updates quantity or removes item if qty goes to 0
    const changeQuantity = async (index, value) => {
        const tableToUpdate = viewingTableFromAllTables || selectedTable;
        if (!tableToUpdate) return;

        const newBills = { ...billsRef.current };
        const bill = [...(newBills[tableToUpdate] || [])];
        const qty = parseInt(value);

        // remove item if qty is invalid or zero
        if (isNaN(qty) || qty <= 0) {
            bill.splice(index, 1);
        } else {
            bill[index].qty = qty;
        }

        newBills[tableToUpdate] = bill;
        billsRef.current = newBills;
        setBills(newBills);

        // persist changes (serialized per-table)
        await enqueueSave(tableToUpdate, bill);
    };


    // clears current table bill and moves it to completed_bills
    const clearBill = async () => {
        const tableToUpdate = viewingTableFromAllTables || selectedTable;
        if (!tableToUpdate) return;

        const billItems = billsRef.current[tableToUpdate];
        if (!billItems || billItems.length === 0) {
            alert('No items to clear');
            return;
        }

        if (window.confirm(`Clear all items for Table ${tableToUpdate}?`)) {
            try {
                const total = billItems.reduce(
                    (sum, item) => sum + item.price * item.qty,
                    0
                );
                const now = new Date();

                // save completed bill for analytics
                const { error: insertError } = await supabase
                    .from('completed_bills')
                    .insert({
                        table_number: tableToUpdate,
                        items: billItems,
                        total,
                        branch,
                        completed_at: now.toISOString(),
                        day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
                        hour_of_day: now.getHours(),
                        date: now.toISOString().split('T')[0]
                    });

                if (insertError) throw insertError;

                // mark active bill as cleared
                const { error: updateError } = await supabase
                    .from('bills')
                    .update({ status: 'cleared' })
                    .eq('table_number', tableToUpdate)
                    .eq('status', 'active')
                    .eq('branch', branch);

                if (updateError) throw updateError;

                // reset local state
                billsRef.current = { ...billsRef.current, [tableToUpdate]: [] };
                setBills(prev => ({ ...prev, [tableToUpdate]: [] }));
                setShowCartDrawer(false);
                setViewingTableFromAllTables(null);

            } catch (error) {
                console.error('Error clearing bill:', error);
                alert('Failed to clear bill. Please try again.');
            }
        }
    };


    // prints receipt using browser print
    const printBill = async () => {
        const tableToUpdate = viewingTableFromAllTables || selectedTable;
        if (!tableToUpdate) return;

        const now = new Date();
        let total = 0;

        // build receipt rows
        const billRows = bills[tableToUpdate]
            .map(b => {
                const lineTotal = b.price * b.qty;
                total += lineTotal;
                return `
        <tr>
          <td>${b.name} (${b.portion})</td>
          <td style="text-align:center;">${b.qty}</td>
          <td style="text-align:right;">${b.price.toFixed(2)}</td>
          <td style="text-align:right;">${lineTotal.toFixed(2)}</td>
        </tr>`;
            })
            .join('');

        const printContent = `
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            body {
              font-family: monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 5px;
            }
            h2, p { margin: 4px 0; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { border-bottom: 1px dotted #000; text-align: left; }
            td { border-bottom: 1px dotted #ccc; }
            tfoot td { font-weight: bold; border-top: 1px dotted #000; }
          }
          @page { margin: 0 }
        </style>
      </head>
      <body>
        <h2>Anand Fast Food</h2>
        <p><strong>Table:</strong> ${tableToUpdate}</p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${billRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;">Total</td>
              <td style="text-align:right;">${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p>Thank you!</p>
      </body>
    </html>
  `;

        const w = window.open('', '_blank', 'width=320,height=480');
        w.document.write(printContent);
        w.document.close();
        setTimeout(() => {
            w.print();
            w.close();
        }, 300);

        setShowCartDrawer(false);
        setViewingTableFromAllTables(null);
    };


    // Handle table click from All Tables grid
    const handleAllTablesTableClick = (tableNum) => {
        setViewingTableFromAllTables(tableNum);
        setShowCartDrawer(true);
    };

    // Close drawer handler
    const handleCloseDrawer = () => {
        setShowCartDrawer(false);
        setViewingTableFromAllTables(null);
    };

    // Branch selection (first launch, or via Settings > Switch Branch)
    const handleSelectBranch = (branchId) => {
        saveBranch(branchId);
        setBranch(branchId);
        setShowBranchModal(false);
        // reset local, per-branch UI state so we don't show stale data from another branch
        setSelectedTable(null);
        localStorage.removeItem('selectedTable');
        setBills({});
    };

    const handleRequestChangeBranch = () => {
        if (window.confirm(t('confirmChangeBranch', lang))) {
            setShowSettings(false);
            setShowBranchModal(true);
        }
    };

    const handleChangeLang = (code) => {
        saveLanguage(code);
        setLang(code);
    };

    const handleSaveMenuSettings = async (next) => {
        setMenuSettings(next);
        try {
            await saveMenuSettings(branch, next);
        } catch (error) {
            console.error('Error saving menu settings:', error);
            alert('Failed to save menu changes. Please try again.');
        }
    };

    const currentBill = selectedTable ? bills[selectedTable] || [] : [];
    const total = currentBill.reduce((sum, item) => sum + item.price * item.qty, 0);
    const cartItemCount = currentBill.reduce((sum, item) => sum + item.qty, 0);

    // For All Tables drawer
    const viewingBill = viewingTableFromAllTables ? bills[viewingTableFromAllTables] || [] : currentBill;
    const viewingTotal = viewingBill.reduce((sum, item) => sum + item.price * item.qty, 0);

    const getItemQty = (itemName, portion) => {
        if (!selectedTable) return 0;
        const item = currentBill.find(b => b.name === itemName && b.portion === portion);
        return item ? item.qty : 0;
    };

    if (showBranchModal) {
        return <BranchSelectModal lang={lang} onSelect={handleSelectBranch} />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">{t('loading', lang)}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Show install button if not installed */}
            {!isInstalled && installPrompt && (
                <div className="fixed top-16 left-4 right-4 bg-orange-500 text-white p-3 rounded-lg shadow-lg z-50 md:hidden">
                    <p className="text-sm font-semibold mb-2">{t('installApp', lang)}</p>
                    <button
                        onClick={handleInstall}
                        className="w-full bg-white text-orange-500 py-2 rounded font-bold"
                    >
                        {t('installNow', lang)}
                    </button>
                </div>
            )}

            <Header
                onCartClick={() => setShowCartDrawer(true)}
                cartItemCount={cartItemCount}
                currentTab={activeTab}
                onSettingsClick={() => setShowSettings(true)}
                lang={lang}
                branch={branch}
            />

            {/* Mobile: Show different content based on active tab */}
            {activeTab === 'home' && (
                <>
                    {/* Mobile: Floating Table Button */}
                    <div className="md:hidden sticky top-14 z-40 bg-white border-b px-4 py-2">
                        <button
                            onClick={() => setShowTableModal(true)}
                            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-lg active:bg-orange-600 flex justify-between items-center px-6"
                        >
                            <span>
                                {selectedTable ? `${t('tableLabel', lang)} ${selectedTable}` : t('selectTable', lang)}
                            </span>

                            {selectedTable && total > 0 && (
                                <span className="bg-white text-black px-3 py-1 rounded-xl font-bold text-lg">
                                    ₹{total}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Mobile: Category Pills */}
                    <div className="md:hidden">
                        <CategoryPills categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} lang={lang} />
                    </div>
                </>
            )}

            <main className="flex flex-1 overflow-hidden pb-16 md:pb-0">
                {activeTab === 'home' ? (
                    <>
                        {/* Desktop Layout */}
                        <DesktopTableGrid
                            tables={tables}
                            bills={bills}
                            selectedTable={selectedTable}
                            onSelectTable={setSelectedTable}
                            className="tableselectstyle w-[20%]"
                        />


                        <div className="flex flex-col w-full md:w-[57%] border-r border-gray-300">

                            {/* Desktop Category Pills */}
                            <div className="hidden md:block sticky top-0 z-10 bg-white border-b px-4 py-3">
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === null
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {t('all', lang)}
                                    </button>

                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${selectedCategory === cat
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {translateCategory(cat, lang)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Menu Grid */}
                            <div className="flex-1 
                                grid grid-cols-2 md:grid-cols-4 
                                gap-3 md:gap-4 
                                p-3 md:p-4 
                                overflow-y-auto bg-white
                                w-full"
                            >

                                {filteredMenu.map((item, idx) => (
                                    <MenuItem
                                        key={idx}
                                        item={item}
                                        onAddItem={addItemToBill}
                                        currentQty={getItemQty(item.name, item.options[0].portion)}
                                        lang={lang}
                                    />
                                ))}
                            </div>
                        </div>


                        <BillSection
                            selectedTable={selectedTable}
                            currentBill={currentBill}
                            total={total}
                            onChangeQuantity={changeQuantity}
                            onPrintBill={printBill}
                            onClearBill={clearBill}
                            lang={lang}
                        />
                    </>
                ) : (
                    /* All Tables Tab - Mobile */
                    <AllTablesGrid
                        tables={tables}
                        bills={bills}
                        onTableClick={handleAllTablesTableClick}
                    />
                )}
            </main>

            {/* Bottom Navigation (Mobile Only) */}
            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} lang={lang} />

            {/* Mobile Modals */}
            {showTableModal && (
                <TableSelectorModal
                    tables={tables}
                    selectedTable={selectedTable}
                    onSelectTable={setSelectedTable}
                    onClose={() => setShowTableModal(false)}
                    lang={lang}
                />
            )}

            {showCartDrawer && (
                <CartDrawer
                    selectedTable={viewingTableFromAllTables || selectedTable}
                    currentBill={viewingBill}
                    total={viewingTotal}
                    onChangeQuantity={changeQuantity}
                    onPrintBill={printBill}
                    onClearBill={clearBill}
                    onClose={handleCloseDrawer}
                    lang={lang}
                />
            )}

            {showSettings && (
                <SettingsModal
                    lang={lang}
                    onChangeLang={handleChangeLang}
                    branch={branch}
                    onOpenMenuManager={() => { setShowSettings(false); setShowMenuManager(true); }}
                    onChangeBranch={handleRequestChangeBranch}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {showMenuManager && (
                <MenuManagerModal
                    lang={lang}
                    mergedMenu={managerMenuItems}
                    categories={categories}
                    menuSettings={menuSettings}
                    onSaveSettings={handleSaveMenuSettings}
                    onClose={() => setShowMenuManager(false)}
                />
            )}
        </div>
    );
}
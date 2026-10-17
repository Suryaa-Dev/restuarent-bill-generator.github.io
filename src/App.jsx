import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Printer, Trash2, Plus, Minus, Home, Grid3x3, Settings, Globe, Store, UtensilsCrossed, History, ArrowRightLeft, ListPlus, ShoppingBag } from 'lucide-react';
import { supabase } from './config/supabase';
import { t, translateCategory, translateItemName, translatePortion, LANGUAGES } from './i18n/translations';
import {
    BRANCH_OPTIONS,
    getSavedBranch,
    saveBranch,
    branchLabel,
    getSavedLanguage,
    saveLanguage,
    fetchItemFrequency,
} from './lib/branchMenu';
import { fetchMenuItems, getCategories } from './lib/menu';
import { toISTParts } from './lib/time';
import MenuManager from './components/menu/MenuManager';


/* ---------------- Header ---------------- */

// top bar with title + cart (mobile) / settings (all tables)
const Header = ({ onCartClick, cartItemCount, currentTab, onSettingsClick, lang }) => (
    <header className="sticky top-0 z-50 bg-orange-500 text-white py-3 px-4 shadow-lg">
        <div className="flex justify-between items-center">
            <h1 className="text-lg md:text-2xl font-bold">{t('appName', lang)}</h1>

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

/* ---------------- Shift Table Modal ---------------- */

// Lets staff move an entire order from one table to another. Occupied
// destination tables are shown but disabled — tapping one explains why
// instead of silently doing nothing or overwriting the other order.
const ShiftTableModal = ({ sourceTable, tables, bills, onShift, onClose, lang }) => {
    const [warnTable, setWarnTable] = useState(null);

    const isOccupied = (num) => (bills[num] || []).length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
                    <div>
                        <h2 className="text-lg font-bold">{t('shiftOrderTitle', lang)}</h2>
                        <p className="text-xs text-gray-500">
                            {t('shiftOrderFrom', lang)} {sourceTable} {t('shiftOrderTo', lang)}
                        </p>
                    </div>
                    <button onClick={onClose}><X size={22} /></button>
                </div>

                {warnTable && (
                    <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                        {t('tableWordShort', lang)} {warnTable} {t('shiftOccupiedWarning', lang)}
                    </div>
                )}

                <div className="grid grid-cols-4 gap-2 p-4 overflow-y-auto">
                    {tables.filter(num => num !== sourceTable).map(num => {
                        const occupied = isOccupied(num);
                        return (
                            <button
                                key={num}
                                onClick={() => occupied ? setWarnTable(num) : onShift(num)}
                                className={`aspect-square rounded-xl font-bold flex items-center justify-center border-2 ${occupied
                                    ? 'bg-red-50 border-red-200 text-red-400'
                                    : 'bg-green-50 border-green-200 text-green-700 active:bg-green-100'
                                    }`}
                            >
                                {num}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ---------------- Category Filter ---------------- */

// horizontal category filter (mobile)
const CategoryPills = ({ categories, selectedCategory, onSelectCategory, lang }) => (
    <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto">
        <button
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2 rounded-full ${selectedCategory === null ? 'bg-orange-500 text-white' : 'bg-gray-100'
                }`}
        >
            {t('fav', lang)}
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
const MenuItem = ({ item, onAddItem, currentQty, getQty, lang }) => {
    const displayName = translateItemName(item.name, lang);

    // Quick rate-picker layout: no photo, no shared wrapper card — each price is
    // its own standalone tappable button (used for Ice-cream where the
    // "portion" is really just a price tier, not a meaningful size label).
    // Expects a single-option item (see flattenRatePickerItems in the main App).
    if (item.ratePicker) {
        const opt = item.options[0];
        const qty = getQty ? getQty(item.name, opt.portion, item.category) : 0;
        return (
            <button
                onClick={() => onAddItem(item.name, opt.portion, opt.price, item.category)}
                className="relative bg-orange-50 rounded-lg border border-orange-200 flex items-center justify-center py-2.5 active:bg-orange-100"
            >
                <span className="text-orange-700 font-bold text-base">₹{opt.price}</span>
                {qty > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {qty}
                    </span>
                )}
            </button>
        );
    }

    const defaultOption = item.options[0]; // most ordered portion
    const hasMultipleOptions = item.options.length > 1;

    return (
        <div className="bg-white rounded-xl border border-gray-300 overflow-hidden flex flex-col h-60">
            <div
                onClick={() => onAddItem(item.name, defaultOption.portion, defaultOption.price, item.category)}
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
                    {item.options.slice(1).map((opt, i) => {
                        const optQty = getQty ? getQty(item.name, opt.portion, item.category) : 0;
                        return (
                            <button
                                key={i}
                                onClick={() => onAddItem(item.name, opt.portion, opt.price, item.category)}
                                className="relative flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-200 active:bg-orange-100"
                            >
                                {translatePortion(opt.portion, lang)} ₹{opt.price}
                                {optQty > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                                        {optQty}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ---------------- Cart Drawer (Mobile) ---------------- */

// bottom drawer for current table bill
const CartDrawer = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, onClose, onQuickAdd, onShiftTable, isParcel, onToggleParcel, lang }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
                {/* Title + close kept on their own row, away from the action buttons
                    below, so closing the drawer is never at risk of a mis-tap. */}
                <div className="flex justify-between items-center px-4 pt-4 pb-2 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold truncate">
                        {selectedTable ? `${t('tableLabel', lang)} ${selectedTable}` : t('cart', lang)}
                    </h2>
                    <button onClick={onClose} className="p-1 -mr-1 shrink-0" aria-label={t('close', lang)}>
                        <X size={24} />
                    </button>
                </div>

                {/* Action row: add more items / shift table / parcel. Parcel is a toggle:
                    white while off, purple once this order is marked as a parcel. */}
                <div className="flex items-stretch gap-2 px-4 pb-3 border-b sticky top-[52px] bg-white z-10">
                    <button
                        onClick={onQuickAdd}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-green-50 text-green-700 active:bg-green-100"
                    >
                        <ListPlus size={18} />
                        <span className="text-[10px] font-semibold leading-tight">{t('addMore', lang)}</span>
                    </button>

                    <button
                        onClick={onShiftTable}
                        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100"
                    >
                        <ArrowRightLeft size={18} />
                        <span className="text-[10px] font-semibold leading-tight">{t('shiftTable', lang)}</span>
                    </button>

                    <button
                        onClick={onToggleParcel}
                        disabled={currentBill.length === 0}
                        aria-pressed={!!isParcel}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border transition-colors disabled:opacity-40 ${isParcel
                            ? 'bg-purple-600 text-white border-purple-600 active:bg-purple-700'
                            : 'bg-white text-gray-700 border-gray-300 active:bg-gray-100'
                            }`}
                    >
                        <ShoppingBag size={18} />
                        <span className="text-[10px] font-semibold leading-tight">{t('parcel', lang)}</span>
                    </button>
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
                                        <span className="text-orange-600 font-medium">₹{item.price} {t('each', lang)}</span>
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
};


// overview of all tables with running totals
const AllTablesGrid = ({ tables, bills, parcels, onTableClick, lang }) => {
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
                            {!empty && parcels[num] && (
                                <span className="mb-1 text-[10px] font-bold text-white bg-purple-600 rounded-full px-2 py-0.5 flex items-center gap-1">
                                    <ShoppingBag size={10} /> {t('parcelBadge', lang)}
                                </span>
                            )}
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


const DesktopTableGrid = ({ tables, bills, parcels, selectedTable, onSelectTable }) => {
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

                            {total > 0 && parcels[num] && (
                                <span className="absolute top-1 right-1 bg-purple-600 text-white rounded-full p-1" title="Parcel">
                                    <ShoppingBag size={11} />
                                </span>
                            )}
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
const BillSection = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, isParcel, onToggleParcel, lang }) => {
    return (
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
                            <span className="block text-xs text-orange-600 font-medium">
                                ₹{item.price} {t('each', lang)}
                            </span>
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
                <button
                    onClick={onToggleParcel}
                    disabled={currentBill.length === 0}
                    aria-pressed={!!isParcel}
                    className={`w-full mb-2 py-2 rounded-lg font-semibold border flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${isParcel
                        ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                >
                    <ShoppingBag size={18} />
                    {t('parcel', lang)}
                </button>

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
};


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

const SettingsModal = ({ lang, onChangeLang, branch, onOpenMenuManager, onOpenHistory, onChangeBranch, onClose }) => (
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

                {/* Order History */}
                <button
                    onClick={onOpenHistory}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 active:bg-gray-100"
                >
                    <span className="flex items-center gap-2 font-semibold text-gray-800">
                        <History size={18} />
                        {t('orderHistory', lang)}
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

// Main App
export default function RestaurantBillGenerator() {
    const navigate = useNavigate();
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
    const [showShiftModal, setShowShiftModal] = useState(false);

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
    // menu comes from the shared `menu_items` table (same for every branch)
    const [menuItems, setMenuItems] = useState([]);
    const [menuWarning, setMenuWarning] = useState(false);

    // which tables are marked "Parcel" ({ tableNo: true }); mirrored in a ref for the same
    // reason as billsRef (the save queue must always read the latest value)
    const [parcels, setParcels] = useState({});
    const parcelsRef = useRef({});
    const setParcelsBoth = (next) => { parcelsRef.current = next; setParcels(next); };

    // "Fav" tab: how often each item has actually been ordered at this branch
    const [itemFrequency, setItemFrequency] = useState({});
    const refreshItemFrequency = () => {
        if (!branch) return;
        fetchItemFrequency(branch).then(setItemFrequency);
    };

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

    // Load the menu from the database (and pick up edits made on another device
    // whenever this one comes back to the foreground).
    const loadMenu = async () => {
        const { items, fromCache, error } = await fetchMenuItems();
        setMenuItems(items);
        setMenuWarning(!!error && fromCache);
    };

    useEffect(() => {
        loadMenu();
        const onVisible = () => { if (document.visibilityState === 'visible') loadMenu(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    // Load "Fav" tab data (most frequently ordered items) for this branch
    useEffect(() => {
        refreshItemFrequency();
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

                    // A bill going to any non-active status (cleared, etc.) means the
                    // table is now empty — reflect that immediately on every device
                    // instead of ignoring the event, which was leaving stale items
                    // showing elsewhere after a bill was cleared.
                    if (row.status && row.status !== 'active') {
                        setBills(prev => ({
                            ...prev,
                            [row.table_number]: []
                        }));
                        setParcelsBoth({ ...parcelsRef.current, [row.table_number]: false });
                        return;
                    }

                    setBills(prev => ({
                        ...prev,
                        [row.table_number]: row.items || []
                    }));
                    setParcelsBoth({ ...parcelsRef.current, [row.table_number]: !!row.is_parcel });
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
            const loadedParcels = {};
            tables.forEach(num => {
                const tableBill = data.find(b => b.table_number === num);
                loadedBills[num] = tableBill ? tableBill.items : [];
                loadedParcels[num] = !!(tableBill && tableBill.is_parcel);

                if (tableBill) {
                    console.log(`Table ${num} items:`, tableBill.items);
                }
            });

            console.log('📊 Final bills state:', loadedBills);
            setBills(loadedBills);
            setParcelsBoth(loadedParcels);
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
                        is_parcel: !!parcelsRef.current[tableNumber],
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
                        is_parcel: !!parcelsRef.current[tableNumber],
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

    // Customer-facing menu: items switched off in Update Menu are not shown
    const mergedMenuItems = useMemo(() => menuItems.filter(item => !item.isHidden), [menuItems]);
    const categories = useMemo(() => getCategories(mergedMenuItems), [mergedMenuItems]);

    // "Fav" (replaces the old "All"): the items ordered most often at this branch,
    // most-ordered first. Falls back to the first few menu items until there's
    // enough order history to rank anything. Rate-picker items (Ice-cream) are
    // excluded — they display as bare price buttons with no name/photo, which
    // looks out of place mixed in with regular item cards.
    const favoriteItems = useMemo(() => {
        const favEligible = mergedMenuItems.filter(it => !it.ratePicker);
        const byName = {};
        favEligible.forEach(it => { byName[it.name] = it; });

        const rankedNames = Object.entries(itemFrequency)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name)
            .filter(name => byName[name]);

        if (rankedNames.length === 0) {
            return favEligible.slice(0, 8);
        }
        return rankedNames.slice(0, 12).map(name => byName[name]);
    }, [itemFrequency, mergedMenuItems]);

    // Rate-picker items (Cold Drinks / Ice-cream) store all their price points on
    // one item; for the customer-facing grid we split that into one standalone
    // button per price so they don't share a wrapper card. Everywhere else
    // (Update Menu, price overrides, hidden-item toggle) keeps working on the
    // combined item — this only affects how it's displayed here.
    const flattenRatePickerItems = (items) => {
        const out = [];
        items.forEach(item => {
            if (item.ratePicker) {
                item.options.forEach(opt => out.push({ ...item, options: [opt] }));
            } else {
                out.push(item);
            }
        });
        return out;
    };

    const filteredMenu = useMemo(() => {
        const base = selectedCategory
            ? mergedMenuItems.filter(i => i.category === selectedCategory)
            : favoriteItems;
        return flattenRatePickerItems(base);
    }, [selectedCategory, mergedMenuItems, favoriteItems]);

    // Ice-cream (and anything else flagged ratePicker) uses a tighter 3-per-row
    // grid instead of the usual photo-card layout.
    const isRatePickerOnly = filteredMenu.length > 0 && filteredMenu.every(i => i.ratePicker);


    // adds an item to the selected table's bill
    // uses optimistic update so UI feels instant

    const addItemToBill = async (name, portion, price, category) => {
        if (!selectedTable) {
            setShowTableModal(true);
            return;
        }

        // read from the ref, not the `bills` state variable, so a burst of quick
        // taps always builds on the latest bill instead of a stale render snapshot
        const newBills = { ...billsRef.current };
        const bill = [...(newBills[selectedTable] || [])];

        // check if same item + portion already exists
        // (category is part of the match: e.g. "Combination" exists under both Rice and Noodles.
        //  Lines saved before categories were recorded have none and match on name + portion.)
        const existingIndex = bill.findIndex(
            b => b.name === name && b.portion === portion && (!b.category || !category || b.category === category)
        );

        if (existingIndex >= 0) {
            const existing = bill[existingIndex];
            bill[existingIndex] = { ...existing, qty: existing.qty + 1 };
        } else {
            bill.push({ name, portion, price, qty: 1, category });
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
            bill[index] = { ...bill[index], qty };
        }

        newBills[tableToUpdate] = bill;
        billsRef.current = newBills;
        setBills(newBills);

        // an emptied table is no longer a parcel order
        if (bill.length === 0 && parcelsRef.current[tableToUpdate]) {
            setParcelsBoth({ ...parcelsRef.current, [tableToUpdate]: false });
        }

        // persist changes (serialized per-table)
        await enqueueSave(tableToUpdate, bill);
    };


    // marks / unmarks the open order as a parcel (saved with the bill, so every device sees it)
    const toggleParcel = async (table) => {
        if (!table) return;
        const items = billsRef.current[table] || [];
        if (items.length === 0) return;
        setParcelsBoth({ ...parcelsRef.current, [table]: !parcelsRef.current[table] });
        await enqueueSave(table, items);
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
                // day / hour / date are always the IST (Asia/Kolkata) values, whatever the device's
                // own timezone is. completed_at itself stays a UTC instant (the column is
                // `timestamp without time zone`, so it holds UTC wall-clock time).
                const ist = toISTParts(now);

                // save completed bill for analytics
                const { error: insertError } = await supabase
                    .from('completed_bills')
                    .insert({
                        table_number: tableToUpdate,
                        items: billItems,
                        total,
                        branch,
                        completed_at: now.toISOString(),
                        day_of_week: ist.weekday,
                        hour_of_day: ist.hour,
                        date: ist.dateKey,
                        is_parcel: !!parcelsRef.current[tableToUpdate]
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
                setParcelsBoth({ ...parcelsRef.current, [tableToUpdate]: false });
                setShowCartDrawer(false);
                setViewingTableFromAllTables(null);

                // this order just fed into "Fav" — refresh so it reflects the latest counts
                refreshItemFrequency();

            } catch (error) {
                console.error('Error clearing bill:', error);
                alert('Failed to clear bill. Please try again.');
            }
        }
    };


        // prints receipt (80mm thermal) using browser print
    const printBill = async () => {
        const tableToUpdate = viewingTableFromAllTables || selectedTable;
        if (!tableToUpdate) return;

        const items = bills[tableToUpdate] || [];
        if (items.length === 0) return;

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        const isParcelOrder = !!parcelsRef.current[tableToUpdate];
        const logoUrl = `${window.location.origin}/anand-logo-bw.png`;

        let total = 0;
        let totalQty = 0;

        const billRows = items
            .map((b, idx) => {
                const lineTotal = b.price * b.qty;
                total += lineTotal;
                totalQty += b.qty;
                const portion = b.portion ? ` (${translatePortion(b.portion, lang)})` : '';
                return `
        <div class="item">
          <div class="name">${idx + 1}. ${translateItemName(b.name, lang)}${portion}</div>
          <div class="line">
            <span></span>
            <span class="num">${b.qty}</span>
            <span class="num">${b.price}</span>
            <span class="num">${lineTotal}</span>
          </div>
        </div>`;
            })
            .join('');

        const printContent = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            width: 100%;
            max-width: 80mm;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body {
            padding: 2mm 3mm 10mm;
            color: #000;
            font-family: 'Noto Sans Devanagari', 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.35;
          }
          .logo {
    display: block;
    width: 48mm;
    margin: 0 auto 2mm;
    image-rendering: crisp-edges;
}
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .dash { border-top: 1px dashed #000; margin: 2mm 0; }
          .row { display: flex; justify-content: space-between; align-items: baseline; }
          .line, .head {
            display: grid;
            grid-template-columns: 1fr 9mm 12mm 15mm;
            gap: 1mm;
          }
          .head { font-weight: 700; }
          .num { text-align: right; }
          .item { margin-bottom: 1.5mm; }
          .name { font-weight: 600; word-break: break-word; }
          .grand { font-size: 16px; font-weight: 800; margin-top: 1mm; }
          .small { font-size: 11px; }
        </style>
      </head>
      <body>
        <img class="logo" src="${logoUrl}" alt="Anand" />
        <div class="center bold">${branchLabel(branch, lang)}</div>
        ${isParcelOrder ? `<div class="center bold" style="font-size:15px;border:1px solid #000;margin:1.5mm 0 0;padding:0.5mm 0;">${t('parcel', lang).toUpperCase()}</div>` : ''}

        <div class="dash"></div>
        <div class="row">
          <span>${t('tableLabel', lang)}: <b>${tableToUpdate}</b></span>
          <span>${dateStr} ${timeStr}</span>
        </div>
        <div class="dash"></div>

        <div class="head">
          <span>${lang === 'mr' ? 'तपशील' : 'Item'}</span>
          <span class="num">${lang === 'mr' ? 'नग' : 'Qty'}</span>
          <span class="num">${lang === 'mr' ? 'दर' : 'Rate'}</span>
          <span class="num">${lang === 'mr' ? 'रक्कम' : 'Amt'}</span>
        </div>
        <div class="dash"></div>

        ${billRows}

        <div class="dash"></div>
        <div class="row">
          <span>${lang === 'mr' ? 'एकूण नग' : 'Total Qty'}</span>
          <b>${totalQty}</b>
        </div>
        <div class="row grand">
          <span>${t('total', lang)}</span>
          <span>₹${total}</span>
        </div>
        <div class="dash"></div>

        <div class="center small">
          ${lang === 'mr' ? 'आपल्या भेटीबद्दल धन्यवाद! पुन्हा भेट द्या.' : 'Thank you! Visit again.'}
        </div>
      </body>
    </html>
  `;

        const w = window.open('', '_blank', 'width=340,height=600');
        if (!w) {
            alert('Please allow pop-ups to print the bill.');
            return;
        }
        w.document.write(printContent);
        w.document.close();

        // wait for the logo to load before printing, otherwise it comes out blank
        const img = w.document.querySelector('.logo');
        let printed = false;
        const doPrint = () => {
            if (printed) return;
            printed = true;
            setTimeout(() => {
                w.focus();
                w.print();
                w.close();
            }, 200);
        };
        if (img && !img.complete) {
            img.onload = doPrint;
            img.onerror = doPrint;
            setTimeout(doPrint, 2000); // safety fallback
        } else {
            doPrint();
        }

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

    // "Add More" from the cart drawer: jump straight to Home with this exact
    // table already selected, so adding another item is one tap instead of
    // closing the drawer, going to Home, and reselecting the table.
    const handleQuickAddMore = () => {
        const table = viewingTableFromAllTables || selectedTable;
        if (!table) return;
        setSelectedTable(table);
        localStorage.setItem('selectedTable', table.toString());
        setActiveTab('home');
        setShowCartDrawer(false);
        setViewingTableFromAllTables(null);
    };

    // Moves an entire order from the table currently open in the cart to
    // another table. Destination must be empty — ShiftTableModal already
    // blocks occupied tables in the UI, but we re-check here too in case
    // something changed between opening the modal and tapping a table.
    const handleShiftTable = async (destTable) => {
        const sourceTable = viewingTableFromAllTables || selectedTable;
        if (!sourceTable || destTable === sourceTable) return;

        const sourceItems = billsRef.current[sourceTable] || [];
        const destItems = billsRef.current[destTable] || [];

        if (destItems.length > 0) {
            alert(`Table ${destTable} already has an active order. Please clear it first.`);
            return;
        }

        const newBills = { ...billsRef.current, [destTable]: sourceItems, [sourceTable]: [] };
        billsRef.current = newBills;
        setBills(newBills);
        setParcelsBoth({ ...parcelsRef.current, [destTable]: !!parcelsRef.current[sourceTable], [sourceTable]: false });
        setShowShiftModal(false);

        // persist both sides — independent per-table saves, safely serialized
        await enqueueSave(destTable, sourceItems);
        await enqueueSave(sourceTable, []);

        // follow the order to its new table so the cart view doesn't go stale
        if (viewingTableFromAllTables === sourceTable) setViewingTableFromAllTables(destTable);
        if (selectedTable === sourceTable) {
            setSelectedTable(destTable);
            localStorage.setItem('selectedTable', destTable.toString());
        }
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
        setParcelsBoth({});
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

    const currentBill = selectedTable ? bills[selectedTable] || [] : [];
    const total = currentBill.reduce((sum, item) => sum + item.price * item.qty, 0);
    const cartItemCount = currentBill.reduce((sum, item) => sum + item.qty, 0);

    // For All Tables drawer
    const viewingBill = viewingTableFromAllTables ? bills[viewingTableFromAllTables] || [] : currentBill;
    const viewingTotal = viewingBill.reduce((sum, item) => sum + item.price * item.qty, 0);

    const getItemQty = (itemName, portion, category) => {
        if (!selectedTable) return 0;
        const item = currentBill.find(b => b.name === itemName && b.portion === portion && (!b.category || !category || b.category === category));
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
                            parcels={parcels}
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
                                        {t('fav', lang)}
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
                            <div className={`flex-1 
                                grid ${isRatePickerOnly ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'} 
                                gap-3 md:gap-4 
                                p-3 md:p-4 
                                overflow-y-auto bg-white
                                w-full`}
                            >

                                {filteredMenu.length === 0 && (
                                    <p className="col-span-full text-center text-gray-400 py-12">
                                        {menuItems.length === 0 ? t('noMenuItems', lang) : t('noFavoritesYet', lang)}
                                    </p>
                                )}

                                {filteredMenu.map((item, idx) => (
                                    <MenuItem
                                        key={idx}
                                        item={item}
                                        onAddItem={addItemToBill}
                                        currentQty={getItemQty(item.name, item.options[0].portion, item.category)}
                                        getQty={getItemQty}
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
                            isParcel={!!(selectedTable && parcels[selectedTable])}
                            onToggleParcel={() => toggleParcel(selectedTable)}
                            lang={lang}
                        />
                    </>
                ) : (
                    /* All Tables Tab - Mobile */
                    <AllTablesGrid
                        tables={tables}
                        bills={bills}
                        parcels={parcels}
                        onTableClick={handleAllTablesTableClick}
                        lang={lang}
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
                    onQuickAdd={handleQuickAddMore}
                    onShiftTable={() => setShowShiftModal(true)}
                    isParcel={!!parcels[viewingTableFromAllTables || selectedTable]}
                    onToggleParcel={() => toggleParcel(viewingTableFromAllTables || selectedTable)}
                    lang={lang}
                />
            )}

            {showShiftModal && (
                <ShiftTableModal
                    sourceTable={viewingTableFromAllTables || selectedTable}
                    tables={tables}
                    bills={bills}
                    onShift={handleShiftTable}
                    onClose={() => setShowShiftModal(false)}
                    lang={lang}
                />
            )}

            {showSettings && (
                <SettingsModal
                    lang={lang}
                    onChangeLang={handleChangeLang}
                    branch={branch}
                    onOpenMenuManager={() => { setShowSettings(false); setShowMenuManager(true); }}
                    onOpenHistory={() => { setShowSettings(false); navigate('/history'); }}
                    onChangeBranch={handleRequestChangeBranch}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {showMenuManager && (
                <MenuManager
                    lang={lang}
                    items={menuItems}
                    loadWarning={menuWarning}
                    onItemsChange={setMenuItems}
                    onClose={() => { setShowMenuManager(false); loadMenu(); }}
                />
            )}
        </div>
    );
}
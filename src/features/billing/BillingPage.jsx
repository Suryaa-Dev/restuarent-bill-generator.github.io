import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { t } from '../../i18n/translations';
import { ta } from '../../i18n/adminExtra';
import { ts } from '../../i18n/serveExtra';
import {
    getSavedBranch,
    getSavedLanguage,
    getSavedMode,
    saveBranch,
    saveLanguage,
    saveMode,
} from '../../shared/utils/devicePrefs';
import { useToast } from '../../shared/hooks/useToast';
import { usePwaInstall } from '../../shared/hooks/usePwaInstall';
import Toast from '../../shared/components/Toast';
import { useAuth } from '../auth/AuthProvider';
import { PERMISSIONS as P } from '../auth/permissions';
import { buildKitchenLookup, analyzeBill, countPendingServe, computeSentQty } from '../kitchens/utils/kitchenLogic';
import { getCategories } from '../menu/utils/menuUtils';
import SettingsPage from '../settings/SettingsPage';
import BranchSelectModal from '../settings/components/BranchSelectModal';
import KitchenManager from '../kitchens/components/KitchenManager';
import MenuManager from '../menu/components/MenuManager';
import FavoritesManager from '../menu/components/FavoritesManager';
import ModifierManager from '../menu/components/ModifierManager';
import UserManagement from '../users/components/UserManagement';
import PaymentSettingsScreen from '../payments/components/PaymentSettingsScreen';
import UpiQrModal from '../payments/components/UpiQrModal';
import { TABLE_NUMBERS } from './constants';
import { useBills } from './hooks/useBills';
import { useKitchenTokens } from './hooks/useKitchenTokens';
import { useMenuData } from './hooks/useMenuData';
import { useFavorites } from './hooks/useFavorites';
import { useMenuView } from './hooks/useMenuView';
import { useTableLocks } from './hooks/useTableLocks';
import { useBillActions } from './hooks/useBillActions';
import { useTokenActions } from './hooks/useTokenActions';
import { useParcelEta } from './hooks/useParcelEta';
import { roundEtaMinutes } from './utils/parcelEta';
import { billQuantity, billTotal } from './utils/billMath';
import { billingPermissions } from './utils/billingPermissions';
import { buildUnits, groupIndexes } from './utils/customize';
import { getTableStatus } from './utils/tableStatus';
import { printReceipt } from './utils/printReceipt';
import BillingHeader from './components/BillingHeader';
import MobileTableBar from './components/MobileTableBar';
import DesktopTableGrid from './components/DesktopTableGrid';
import MenuPanel from './components/MenuPanel';
import BillSection from './components/BillSection';
import CartDrawer from './components/CartDrawer';
import AllTablesGrid from './components/AllTablesGrid';
import BottomNavigation from './components/BottomNavigation';
import TableSelectorModal from './components/TableSelectorModal';
import ShiftTableModal from './components/ShiftTableModal';
import TableBusyDialog from './components/TableBusyDialog';
import InstallBanner from './components/InstallBanner';
import ServeManagementTab from './components/ServeManagementTab';
import CustomizeModal from './components/CustomizeModal';
import { CancelTokenModal } from './components/tokens/TokensPanel';
import UpdateTokenModal from './components/tokens/UpdateTokenModal';

/* The billing screen: tables, menu, bill / cart, tokens and the Settings page on top of it.
   Data lives in hooks (bills, tokens, menu, favourites); the actions live in useBillActions /
   useTokenActions; this file wires them to the screen and decides what the user may see. */
export default function BillingPage() {
    const navigate = useNavigate();
    const { can, branches } = useAuth();
    const tables = TABLE_NUMBERS;
    const { toast, showToast, hideToast } = useToast();
    const pwa = usePwaInstall();

    // ---- device preferences ----
    const [lang, setLang] = useState(getSavedLanguage());
    const [branch, setBranch] = useState(getSavedBranch());
    const [showBranchModal, setShowBranchModal] = useState(!getSavedBranch());
    const [appMode, setAppMode] = useState(getSavedMode());
    const kitchenMode = appMode === 'kitchen';

    // ---- what this account may do ----
    const perms = billingPermissions(can);
    const canBill = can(P.BILLING_VIEW);
    const canServeTab = can(P.SERVE_VIEW);
    // every action checks this first; a refused action explains itself instead of silently doing nothing
    const allow = (permission) => {
        if (can(permission)) return true;
        showToast(ta('notAllowed', lang));
        return false;
    };

    // ---- screen state ----
    const [selectedTable, setSelectedTable] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        const saved = localStorage.getItem('activeTab') || 'home';
        return canBill ? saved : 'serve';
    });
    const [viewingTableFromAllTables, setViewingTableFromAllTables] = useState(null);
    const [panel, setPanel] = useState(null); // settings | menu | favorites | modifiers | kitchens | users | payments
    const [showQr, setShowQr] = useState(false);
    const [customizeIndex, setCustomizeIndex] = useState(null); // bill line being customised
    const [cancelTarget, setCancelTarget] = useState(null);     // token being cancelled
    const [updateTarget, setUpdateTarget] = useState(null);     // token being edited
    const [lockPrompt, setLockPrompt] = useState(null);         // { table, source } — table is open on another device

    // a serve-only account never lands on the billing tabs
    useEffect(() => { if (!canBill && activeTab !== 'serve') setActiveTab('serve'); }, [canBill, activeTab]);

    // ---- data ----
    const billsApi = useBills({ branch, tables });
    const { bills, billsRef, parcels, loading } = billsApi;
    const kitchenApi = useKitchenTokens({ branch, enabled: kitchenMode });
    const { kitchens, tokens } = kitchenApi;
    const { menuItems, setMenuItems, menuWarning, loadMenu, modifiers, loadModifiers } = useMenuData();
    const { favoriteIds, favSyncError, changeFavorites, itemFrequency, refreshItemFrequency } = useFavorites(branch);
    const { visibleItems, categories, favoriteItems, shownItems, isRatePickerOnly } =
        useMenuView({ menuItems, favoriteIds, itemFrequency, selectedCategory });
    const kitchenLookup = useMemo(() => buildKitchenLookup(menuItems), [menuItems]);
    const parcelEta = useParcelEta({ branch, enabled: kitchenMode, kitchens });

    // ---- table cart locks: only ONE device can have a table's cart open at a time ----
    const lockConflictRef = useRef(null);
    const { lockedTables, acquireLock } = useTableLocks(
        branch,
        showCartDrawer ? (viewingTableFromAllTables || selectedTable) : null,
        (tb) => lockConflictRef.current?.(tb)
    );

    // restore the selected table of this branch
    useEffect(() => {
        if (!branch) return;
        const savedTable = localStorage.getItem('selectedTable');
        if (savedTable) setSelectedTable(parseInt(savedTable));
    }, [branch]);
    useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);
    useEffect(() => { if (selectedTable) localStorage.setItem('selectedTable', selectedTable.toString()); }, [selectedTable]);

    const closeDrawer = () => {
        setShowCartDrawer(false);
        setViewingTableFromAllTables(null);
    };

    // ---- actions ----
    const billActions = useBillActions({
        branch, lang, kitchenMode, selectedTable, viewingTable: viewingTableFromAllTables, modifiers,
        bills: billsApi, kitchen: kitchenApi, allow, refreshItemFrequency,
        onRequireTable: () => setShowTableModal(true),
        onClosed: closeDrawer,
        onShiftStarted: () => setShowShiftModal(false),
        onTableMoved: (sourceTable, destTable) => {
            if (viewingTableFromAllTables === sourceTable) setViewingTableFromAllTables(destTable);
            if (selectedTable === sourceTable) {
                setSelectedTable(destTable);
                localStorage.setItem('selectedTable', destTable.toString());
            }
        },
    });
    const tokenActions = useTokenActions({
        branch, lang, kitchenLookup, bills: billsApi, kitchen: kitchenApi, allow,
        estimateParcel: parcelEta.estimate,
        // a parcel token was just sent: tell the waiter what to tell the customer
        onParcelSent: (token, eta) => showToast(
            ta('etaSentToast', lang)
                .replace('{token}', token.tokenNo)
                .replace('{min}', roundEtaMinutes(eta.minutes))
                .replace('{time}', new Date(eta.readyAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })),
            { icon: Clock, tone: 'info', durationMs: 9000 }
        ),
    });

    const printBill = () => {
        const table = viewingTableFromAllTables || selectedTable;
        if (!table || !allow(P.BILLING_PRINT)) return;
        const printed = printReceipt({
            bill: bills[table] || [],
            table,
            branch,
            lang,
            kitchenMode,
            parcelFlag: !!billsApi.parcelsRef.current[table],
        });
        if (printed) closeDrawer();
    };

    const openQr = () => { if (allow(P.BILLING_SHOW_QR)) setShowQr(true); };

    const handleCancelToken = async (removeFromBill) => {
        if (await tokenActions.cancelToken(cancelTarget, removeFromBill)) setCancelTarget(null);
    };
    const handleSaveTokenUpdate = async (newItems, deltas, makeParcel) => {
        if (await tokenActions.saveTokenUpdate(updateTarget, newItems, deltas, makeParcel)) setUpdateTarget(null);
    };

    // ---- customisation (preparation instructions) of one cart item ----
    const customizing = (() => {
        if (customizeIndex === null) return null;
        const table = viewingTableFromAllTables || selectedTable;
        const bill = (table && billsRef.current[table]) || [];
        const line = bill[customizeIndex];
        if (!line) return null;
        const group = groupIndexes(bill, line).map(i => bill[i]);
        const sentMap = computeSentQty(kitchenApi.tokensRef.current.filter(tk => tk.tableNumber === table && tk.status === 'active'));
        const { locked, editable } = buildUnits(group, sentMap);
        return { table, line, locked, editable };
    })();
    const onCustomizeLine = kitchenMode && modifiers.length > 0 && perms.customize ? ((i) => setCustomizeIndex(i)) : undefined;

    // ---- opening a table's cart (the database decides who gets it: acquireLock is atomic) ----
    const lockOpeningRef = useRef(false);
    const handleAllTablesTableClick = async (tableNum) => {
        if (lockOpeningRef.current) return;
        lockOpeningRef.current = true;
        try {
            if (!(await acquireLock(tableNum))) {
                setLockPrompt({ table: tableNum, source: 'grid' });
                return;
            }
            setViewingTableFromAllTables(tableNum);
            setShowCartDrawer(true);
        } finally {
            lockOpeningRef.current = false;
        }
    };

    // Home cart icon: same rule for the table that is selected on Home
    const handleOpenCartFromHome = async () => {
        if (lockOpeningRef.current) return;
        lockOpeningRef.current = true;
        try {
            if (selectedTable && !(await acquireLock(selectedTable))) {
                setLockPrompt({ table: selectedTable, source: 'home' });
                return;
            }
            setShowCartDrawer(true);
        } finally {
            lockOpeningRef.current = false;
        }
    };

    // "Continue anyway": open the cart although another device has it. Nobody is thrown out; both can edit.
    const continueAnyway = async () => {
        const p = lockPrompt;
        setLockPrompt(null);
        if (!p) return;
        await acquireLock(p.table, { override: true });
        if (p.source === 'grid') setViewingTableFromAllTables(p.table);
        setShowCartDrawer(true);
    };

    // two people opened the same table at the same moment and the other one was first
    lockConflictRef.current = (tb) => {
        closeDrawer();
        showToast(ts('lostTable', lang).replace('{n}', tb));
    };

    // "Add More" from the cart drawer: jump straight to Home with this exact table selected
    const handleQuickAddMore = () => {
        const table = viewingTableFromAllTables || selectedTable;
        if (!table) return;
        setSelectedTable(table);
        localStorage.setItem('selectedTable', table.toString());
        setActiveTab('home');
        closeDrawer();
    };

    // ---- branch / language / mode ----
    const handleSelectBranch = (branchId) => {
        saveBranch(branchId);
        setBranch(branchId);
        setShowBranchModal(false);
        // reset local, per-branch UI state so we don't show stale data from another branch
        setSelectedTable(null);
        localStorage.removeItem('selectedTable');
        billsApi.resetForBranch();
        kitchenApi.updateTokens(() => []);
    };

    const handleRequestChangeBranch = () => {
        if (!allow(P.SETTINGS_BRANCH)) return;
        if (window.confirm(t('confirmChangeBranch', lang))) {
            setPanel(null);
            setShowBranchModal(true);
        }
    };

    const handleChangeLang = (code) => {
        saveLanguage(code);
        setLang(code);
    };

    const handleChangeMode = (mode) => {
        if (!allow(P.SETTINGS_MODE)) return;
        saveMode(mode);
        setAppMode(mode);
    };

    // a settings screen opens only for an account that may use it
    const openPanel = (name, permission) => () => {
        if (permission && !allow(permission)) return;
        setPanel(name);
    };

    // ---- derived screen data ----
    const parcelBadges = useMemo(() => {
        if (!kitchenMode) return parcels;
        const out = { ...parcels };
        Object.entries(bills).forEach(([n, bill]) => { if ((bill || []).some(i => i.isParcel)) out[n] = true; });
        return out;
    }, [parcels, bills, kitchenMode]);

    // status dots on the Tables tab (Kitchen mode only — Normal mode has no tokens to track)
    const tableStatuses = useMemo(() => {
        if (!kitchenMode) return null;
        const out = {};
        tables.forEach(n => {
            out[n] = getTableStatus(bills[n] || [], tokens.filter(tk => tk.tableNumber === n), kitchenLookup);
        });
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kitchenMode, bills, tokens, kitchenLookup]);

    const currentBill = selectedTable ? bills[selectedTable] || [] : [];
    const total = billTotal(currentBill);
    const cartItemCount = billQuantity(currentBill);

    // the cart drawer can show a table opened from All Tables
    const drawerTable = viewingTableFromAllTables || selectedTable;
    const viewingBill = viewingTableFromAllTables ? bills[viewingTableFromAllTables] || [] : currentBill;
    const viewingTotal = billTotal(viewingBill);

    // ---- Kitchen System: per-table token data handed to the drawer / desktop bill panel ----
    const buildKitchenBundle = (table, bill) => {
        if (!kitchenMode) return null;
        const tableTokens = table ? tokens.filter(tk => tk.tableNumber === table) : [];
        const analysis = analyzeBill(bill, tableTokens, kitchenLookup);
        return {
            // parcel: estimated minutes until ready (promised time of sent parcel tokens / estimate for the cart)
            eta: parcelEta.forTable(tableTokens, analysis.items.filter(i => i.isParcel), tokens),
            tokens: tableTokens,
            kitchens,
            unsentCount: analysis.count,
            pendingServe: countPendingServe(tableTokens),
            sending: tokenActions.sendingToken,
            onSend: () => tokenActions.sendToken(table),
            onToggleServed: perms.serve ? tokenActions.toggleServed : undefined,
            onCancel: perms.cancel ? (tk) => setCancelTarget(tk) : undefined,
            onUpdate: perms.edit ? (tk) => setUpdateTarget(tk) : undefined,
            onEditServed: perms.edit ? tokenActions.editServedToken : undefined,
        };
    };
    const drawerKitchen = buildKitchenBundle(drawerTable, viewingBill);
    const desktopKitchen = buildKitchenBundle(selectedTable, currentBill);

    const getItemQty = (itemName, portion, category) => {
        if (!selectedTable) return 0;
        const item = currentBill.find(b => b.name === itemName && b.portion === portion && (!b.category || !category || b.category === category));
        return item ? item.qty : 0;
    };

    if (showBranchModal) {
        return <BranchSelectModal lang={lang} branches={branches} onSelect={handleSelectBranch} />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">{t('loading', lang)}</div>
            </div>
        );
    }

    const qrTable = showCartDrawer ? drawerTable : selectedTable;
    const qrTotal = showCartDrawer ? viewingTotal : total;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {pwa.canInstall && <InstallBanner lang={lang} onInstall={pwa.install} />}

            <BillingHeader
                onCartClick={handleOpenCartFromHome}
                cartItemCount={cartItemCount}
                currentTab={activeTab}
                onSettingsClick={() => setPanel('settings')}
                parcelOn={!!(selectedTable && parcels[selectedTable])}
                onParcelClick={() => (selectedTable ? billActions.toggleParcel(selectedTable) : setShowTableModal(true))}
                lang={lang}
            />

            {activeTab === 'home' && (
                <MobileTableBar
                    selectedTable={selectedTable}
                    total={total}
                    onPickTable={() => setShowTableModal(true)}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    lang={lang}
                />
            )}

            <main className="flex flex-1 overflow-hidden pb-16 md:pb-0">
                {activeTab === 'home' ? (
                    <>
                        <DesktopTableGrid
                            tables={tables}
                            bills={bills}
                            parcels={parcelBadges}
                            selectedTable={selectedTable}
                            onSelectTable={setSelectedTable}
                        />

                        <MenuPanel
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            items={shownItems}
                            isRatePickerOnly={isRatePickerOnly}
                            menuIsEmpty={menuItems.length === 0}
                            onAddItem={billActions.addItemToBill}
                            getQty={getItemQty}
                            lang={lang}
                        />

                        <BillSection
                            selectedTable={selectedTable}
                            currentBill={currentBill}
                            total={total}
                            onChangeQuantity={billActions.changeQuantity}
                            onPrintBill={printBill}
                            onClearBill={billActions.clearBill}
                            onShowQr={openQr}
                            isParcel={!!(selectedTable && parcels[selectedTable])}
                            onToggleParcel={() => billActions.toggleParcel(selectedTable)}
                            kitchen={desktopKitchen}
                            onCustomizeLine={onCustomizeLine}
                            onAddUnit={billActions.addPlainUnit}
                            perms={perms}
                            lang={lang}
                        />
                    </>
                ) : activeTab === 'serve' ? (
                    <ServeManagementTab
                        tokens={tokens}
                        tables={tables}
                        categories={categories}
                        kitchens={kitchens}
                        onServe={tokenActions.toggleServed}
                        lang={lang}
                    />
                ) : (
                    <AllTablesGrid
                        lockedTables={lockedTables}
                        tables={tables}
                        bills={bills}
                        parcels={parcelBadges}
                        statuses={tableStatuses}
                        onTableClick={handleAllTablesTableClick}
                        lang={lang}
                    />
                )}
            </main>

            <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} showBilling={canBill} showServe={canServeTab} lang={lang} />

            {showTableModal && (
                <TableSelectorModal
                    tables={tables}
                    selectedTable={selectedTable}
                    onSelectTable={setSelectedTable}
                    onClose={() => setShowTableModal(false)}
                    lang={lang}
                />
            )}

            {lockPrompt && (
                <TableBusyDialog table={lockPrompt.table} lang={lang} onCancel={() => setLockPrompt(null)} onContinue={continueAnyway} />
            )}

            <Toast toast={toast} onClose={hideToast} />

            {showCartDrawer && (
                <CartDrawer
                    selectedTable={drawerTable}
                    currentBill={viewingBill}
                    total={viewingTotal}
                    onChangeQuantity={billActions.changeQuantity}
                    onPrintBill={printBill}
                    onClearBill={billActions.clearBill}
                    onShowQr={openQr}
                    onClose={closeDrawer}
                    onQuickAdd={handleQuickAddMore}
                    onShiftTable={() => { if (allow(P.BILLING_SHIFT_TABLE)) setShowShiftModal(true); }}
                    isParcel={!!parcels[drawerTable]}
                    onToggleParcel={() => billActions.toggleParcel(drawerTable)}
                    kitchen={drawerKitchen}
                    onCustomizeLine={onCustomizeLine}
                    onAddUnit={billActions.addPlainUnit}
                    perms={perms}
                    lang={lang}
                />
            )}

            {showShiftModal && (
                <ShiftTableModal
                    sourceTable={drawerTable}
                    tables={tables}
                    bills={bills}
                    onShift={billActions.shiftTable}
                    onClose={() => setShowShiftModal(false)}
                    lang={lang}
                />
            )}

            {showQr && (
                <UpiQrModal
                    amount={qrTotal}
                    table={qrTable}
                    branch={branch}
                    lang={lang}
                    onOpenSettings={can(P.SETTINGS_PAYMENTS) ? () => { setShowQr(false); closeDrawer(); setPanel('payments'); } : undefined}
                    onClose={() => setShowQr(false)}
                />
            )}

            {panel === 'settings' && (
                <SettingsPage
                    lang={lang}
                    onChangeLang={handleChangeLang}
                    branch={branch}
                    appMode={appMode}
                    onChangeMode={handleChangeMode}
                    onOpenKitchenSettings={openPanel('kitchens', P.SETTINGS_KITCHENS)}
                    onOpenKds={() => { setPanel(null); navigate('/kds'); }}
                    onOpenMenuManager={openPanel('menu', P.SETTINGS_MENU)}
                    onOpenModifiers={openPanel('modifiers', P.SETTINGS_MODIFIERS)}
                    onOpenFavorites={openPanel('favorites', P.SETTINGS_FAVORITES)}
                    onOpenHistory={() => { setPanel(null); navigate('/history'); }}
                    onOpenDashboard={() => { setPanel(null); navigate('/dashboard'); }}
                    onOpenPayments={openPanel('payments', P.SETTINGS_PAYMENTS)}
                    onOpenUsers={openPanel('users')}
                    onChangeBranch={handleRequestChangeBranch}
                    onClose={() => setPanel(p => (p === 'settings' ? null : p))}
                />
            )}

            {customizing && (
                <CustomizeModal
                    key={`${customizing.table}-${customizeIndex}`}
                    line={customizing.line}
                    locked={customizing.locked}
                    initialUnits={customizing.editable}
                    modifiers={modifiers}
                    lang={lang}
                    onSave={(units) => { const c = customizing; setCustomizeIndex(null); billActions.saveCustomization(c, units); }}
                    onClose={() => setCustomizeIndex(null)}
                />
            )}

            {panel === 'modifiers' && can(P.SETTINGS_MODIFIERS) && (
                <ModifierManager
                    lang={lang}
                    modifiers={modifiers}
                    categories={getCategories(menuItems)}
                    onChanged={loadModifiers}
                    onClose={() => setPanel(null)}
                />
            )}

            {panel === 'menu' && can(P.SETTINGS_MENU) && (
                <MenuManager
                    lang={lang}
                    items={menuItems}
                    loadWarning={menuWarning}
                    onItemsChange={setMenuItems}
                    kitchenMode={kitchenMode}
                    kitchens={kitchens}
                    onClose={() => { setPanel(null); loadMenu(); }}
                />
            )}

            {panel === 'favorites' && can(P.SETTINGS_FAVORITES) && (
                <FavoritesManager
                    lang={lang}
                    items={menuItems}
                    ids={favoriteIds}
                    onChange={changeFavorites}
                    syncError={favSyncError}
                    onClose={() => setPanel(null)}
                />
            )}

            {kitchenMode && panel === 'kitchens' && can(P.SETTINGS_KITCHENS) && (
                <KitchenManager
                    lang={lang}
                    kitchens={kitchens}
                    onKitchensChange={kitchenApi.setKitchens}
                    items={menuItems}
                    onItemsChange={setMenuItems}
                    loadError={kitchenApi.kitchenLoadError}
                    onClose={() => { setPanel(null); loadMenu(); }}
                />
            )}

            {panel === 'payments' && can(P.SETTINGS_PAYMENTS) && (
                <PaymentSettingsScreen lang={lang} branch={branch} onClose={() => setPanel(null)} />
            )}

            {panel === 'users' && <UserManagement lang={lang} onClose={() => setPanel(null)} />}

            {kitchenMode && cancelTarget && (
                <CancelTokenModal
                    token={cancelTarget}
                    lang={lang}
                    onConfirm={handleCancelToken}
                    onClose={() => setCancelTarget(null)}
                />
            )}

            {kitchenMode && updateTarget && (
                <UpdateTokenModal
                    token={updateTarget}
                    menuItems={visibleItems}
                    favoriteItems={favoriteItems}
                    modifiers={modifiers}
                    canCustomize={perms.customize}
                    lang={lang}
                    onSave={handleSaveTokenUpdate}
                    onClose={() => setUpdateTarget(null)}
                />
            )}
        </div>
    );
}

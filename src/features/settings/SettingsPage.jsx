import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, TrendingUp, ChefHat, Globe, History, IndianRupee, KeyRound, LogOut, MonitorPlay, SlidersHorizontal, Star, Store, Users, UtensilsCrossed } from 'lucide-react';
import { t, LANGUAGES } from '../../i18n/translations';
import { tf } from '../../i18n/favExtra';
import { ts } from '../../i18n/serveExtra';
import { ta } from '../../i18n/adminExtra';
import { branchLabel } from '../../shared/utils/devicePrefs';
import { useAuth } from '../auth/AuthProvider';
import { PERMISSIONS as P, ROLES } from '../auth/permissions';
import { SettingsRow, SettingsSection, SettingsSegment } from './components/SettingsUi';
import ChangePasswordModal from './components/ChangePasswordModal';

/* Settings: full-screen page. Every row is shown only to accounts that may use it
   (the screens behind the rows check the permission again). */
export default function SettingsPage({ lang, onChangeLang, branch, appMode, onChangeMode, onOpenKitchenSettings, onOpenKds, onOpenMenuManager, onOpenModifiers, onOpenFavorites, onOpenHistory, onOpenDashboard, onOpenPayments, onOpenUsers, onChangeBranch, onClose }) {
    const { account, can, isAdmin, signOut } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    // The phone's Back button closes the page (instead of leaving the app). Actions that
    // leave the page (open Menu, History, KDS...) go "back" first so history stays clean.
    const pendingRef = useRef(null);
    useEffect(() => {
        if (!window.history.state?.settings) window.history.pushState({ settings: 1 }, '');
        const onPop = () => {
            const after = pendingRef.current;
            pendingRef.current = null;
            onClose();
            if (after) after();
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const leave = (after) => {
        if (window.history.state?.settings) {
            pendingRef.current = after || null;
            window.history.back();
        } else {
            onClose();
            if (after) after();
        }
    };

    const kitchenMode = appMode === 'kitchen';
    const showKitchenSection = can(P.SETTINGS_MODE) || (kitchenMode && (can(P.SETTINGS_KITCHENS) || can(P.KDS_VIEW)));
    const manageRows = [
        can(P.SETTINGS_MENU) && <SettingsRow key="menu" icon={UtensilsCrossed} tint="bg-orange-50 text-orange-600" title={t('updateMenu', lang)} desc={t('updateMenuDesc', lang)} onClick={() => leave(onOpenMenuManager)} />,
        kitchenMode && can(P.SETTINGS_MODIFIERS) && <SettingsRow key="mods" icon={SlidersHorizontal} tint="bg-indigo-50 text-indigo-600" title={ts('modifiers', lang)} desc={ts('modifiersDesc', lang)} onClick={() => leave(onOpenModifiers)} />,
        can(P.SETTINGS_FAVORITES) && <SettingsRow key="fav" icon={Star} tint="bg-yellow-50 text-yellow-600" title={tf('favTitle', lang)} desc={tf('favDesc', lang)} onClick={() => leave(onOpenFavorites)} />,
        can(P.HISTORY_VIEW) && <SettingsRow key="history" icon={History} tint="bg-gray-100 text-gray-700" title={t('orderHistory', lang)} desc={t('orderHistoryDesc', lang)} onClick={() => leave(onOpenHistory)} />,
        can(P.DASHBOARD_VIEW) && <SettingsRow key="dash" icon={TrendingUp} tint="bg-emerald-50 text-emerald-600" title={ta('dashboardRow', lang)} desc={ta('dashboardRowDesc', lang)} onClick={() => leave(onOpenDashboard)} />,
    ].filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto">
            {/* header: same orange bar as the billing screen */}
            <header className="sticky top-0 z-10 bg-orange-500 text-white shadow-lg">
                <div className="max-w-2xl mx-auto flex items-center gap-3 px-3 py-3">
                    <button onClick={() => leave()} aria-label={t('close', lang)} className="bg-orange-600 p-2 rounded-full active:bg-orange-700">
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-xl font-bold">{t('settings', lang)}</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-12">
                {/* General */}
                <SettingsSection title={t('secGeneral', lang)}>
                    <div className="p-4 space-y-3">
                        <p className="flex items-center gap-2 font-semibold text-gray-900">
                            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Globe size={20} /></span>
                            {t('language', lang)}
                        </p>
                        <SettingsSegment
                            options={LANGUAGES.map(l => ({ id: l.code, label: l.label }))}
                            value={lang}
                            onChange={onChangeLang}
                        />
                    </div>

                    <div className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Store size={20} /></span>
                            <div className="min-w-0">
                                <p className="text-xs text-gray-500">{t('currentBranch', lang)}</p>
                                <p className="font-bold text-gray-900 truncate">{branchLabel(branch, lang)}</p>
                            </div>
                        </div>
                        {can(P.SETTINGS_BRANCH) && (
                            <button
                                onClick={() => leave(onChangeBranch)}
                                className="w-full h-11 rounded-xl border-2 border-orange-300 text-orange-700 font-bold active:bg-orange-50"
                            >
                                {t('switchBranch', lang)}
                            </button>
                        )}
                    </div>
                </SettingsSection>

                {/* Mode + kitchen */}
                {showKitchenSection && (
                    <SettingsSection title={t('appMode', lang)}>
                        {can(P.SETTINGS_MODE) && (
                            <div className="p-4 space-y-3">
                                <SettingsSegment
                                    options={[{ id: 'normal', label: t('modeNormal', lang) }, { id: 'kitchen', label: t('modeKitchen', lang) }]}
                                    value={appMode}
                                    onChange={onChangeMode}
                                />
                                <p className="text-xs text-gray-500">{t(kitchenMode ? 'modeKitchenDesc' : 'modeNormalDesc', lang)}</p>
                            </div>
                        )}
                        {kitchenMode && can(P.SETTINGS_KITCHENS) && (
                            <SettingsRow icon={ChefHat} tint="bg-indigo-50 text-indigo-600" title={t('kitchenSettings', lang)} desc={t('kitchenSettingsNote', lang)} onClick={() => leave(onOpenKitchenSettings)} />
                        )}
                        {kitchenMode && can(P.KDS_VIEW) && (
                            <SettingsRow icon={MonitorPlay} tint="bg-indigo-50 text-indigo-600" title={t('openKds', lang)} desc={t('kdsOpenDesc', lang)} onClick={() => leave(onOpenKds)} />
                        )}
                    </SettingsSection>
                )}

                {/* Menu & orders */}
                {manageRows.length > 0 && (
                    <SettingsSection title={t('secManage', lang)}>{manageRows}</SettingsSection>
                )}

                {/* Payments */}
                {can(P.SETTINGS_PAYMENTS) && (
                    <SettingsSection title={ta('secPayments', lang)}>
                        <SettingsRow icon={IndianRupee} tint="bg-blue-50 text-blue-600" title={ta('paymentsTitle', lang)} desc={ta('paymentsRowDesc', lang)} onClick={() => leave(onOpenPayments)} />
                    </SettingsSection>
                )}

                {/* Administration: owner / admin only */}
                {isAdmin && (
                    <SettingsSection title={ta('secAdmin', lang)}>
                        <SettingsRow icon={Users} tint="bg-orange-50 text-orange-600" title={ta('usersTitle', lang)} desc={ta('usersRowDesc', lang)} onClick={() => leave(onOpenUsers)} />
                    </SettingsSection>
                )}
                {/* Account */}
                <SettingsSection title={ta('secAccount', lang)}>
                    <div className="p-4 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 font-bold text-lg">
                            {(account?.display_name || account?.username || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 truncate">{account?.display_name}</p>
                            <p className="text-xs text-gray-500 truncate">@{account?.username} · {ta(account?.role === ROLES.ADMIN ? 'roleAdmin' : 'roleStaff', lang)}</p>
                        </div>
                    </div>
                    <SettingsRow icon={KeyRound} tint="bg-gray-100 text-gray-700" title={ta('changeMyPassword', lang)} onClick={() => setShowPassword(true)} />
                    <SettingsRow icon={LogOut} tint="bg-red-50 text-red-600" title={ta('signOut', lang)} desc={ta('signOutDesc', lang)} onClick={() => leave(signOut)} />
                </SettingsSection>
            </div>

            {showPassword && <ChangePasswordModal lang={lang} onClose={() => setShowPassword(false)} />}
        </div>
    );
}

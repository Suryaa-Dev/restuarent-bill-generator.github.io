import React, { useState } from 'react';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { getSavedBranch, getSavedLanguage, saveBranch, saveLanguage } from '../../../shared/utils/devicePrefs';
import BranchSelectModal from '../../settings/components/BranchSelectModal';
import { useAuth } from '../AuthProvider';
import LoginPage from './LoginPage';
import OwnerSetupPage from './OwnerSetupPage';

/* Nothing of the app is shown until someone is logged in.
   Then, on a device that has never chosen a branch, the branch is picked first
   (every screen — billing, KDS, reports — works per branch). */
export default function AuthGate({ children }) {
    const { status, retry, signOut } = useAuth();
    const [lang, setLang] = useState(getSavedLanguage());
    const [branch, setBranch] = useState(getSavedBranch());
    const changeLang = (code) => { saveLanguage(code); setLang(code); };

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-3 text-gray-500">
                <Loader2 size={28} className="animate-spin text-orange-400" />
                <div className="text-xl">{t('loading', lang)}</div>
            </div>
        );
    }
    if (status === 'setup') return <OwnerSetupPage lang={lang} onChangeLang={changeLang} />;
    if (status === 'signedOut') return <LoginPage lang={lang} onChangeLang={changeLang} />;
    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
                <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-4">
                    <p className="text-gray-700">{ta('accountLoadError', lang)}</p>
                    <button onClick={retry} className="w-full h-12 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2">
                        <RefreshCw size={18} /> {ta('tryAgain', lang)}
                    </button>
                    <button onClick={signOut} className="w-full h-11 rounded-xl bg-gray-100 text-gray-700 font-bold flex items-center justify-center gap-2">
                        <LogOut size={18} /> {ta('signOut', lang)}
                    </button>
                </div>
            </div>
        );
    }

    if (!branch) {
        return <BranchSelectModal lang={lang} onSelect={(id) => { saveBranch(id); setBranch(id); }} />;
    }
    return children;
}

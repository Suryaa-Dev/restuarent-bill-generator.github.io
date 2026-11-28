import React from 'react';
import { LogOut, ShieldOff } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { getSavedLanguage } from '../../../shared/utils/devicePrefs';
import { useAuth } from '../AuthProvider';

export default function NoAccessPage() {
    const { account, signOut } = useAuth();
    const lang = getSavedLanguage();
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-4">
                <span className="mx-auto w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><ShieldOff size={26} /></span>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{ta('noAccessTitle', lang)}</h2>
                    <p className="text-sm text-gray-500 mt-1">{ta('noAccessDesc', lang)}</p>
                    {account && <p className="text-xs text-gray-400 mt-2">{account.display_name} · @{account.username}</p>}
                </div>
                <button onClick={signOut} className="w-full h-12 rounded-xl bg-gray-800 text-white font-bold flex items-center justify-center gap-2 active:bg-black">
                    <LogOut size={18} /> {ta('signOut', lang)}
                </button>
            </div>
        </div>
    );
}

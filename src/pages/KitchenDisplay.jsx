import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChefHat } from 'lucide-react';
import { t } from '../i18n/translations';
import { getSavedLanguage } from '../lib/branchMenu';

// Placeholder: the Kitchen Display System (KDS) is built in the next phase.
// The route + Settings link already exist so only this page needs to be filled in.
export default function KitchenDisplay() {
    const navigate = useNavigate();
    const lang = getSavedLanguage();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="sticky top-0 z-50 bg-orange-500 text-white py-3 px-4 shadow-lg flex items-center gap-3">
                <button onClick={() => navigate('/')} aria-label={t('backToApp', lang)} className="bg-orange-600 p-2 rounded-full">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-lg md:text-2xl font-bold">{t('kdsTitle', lang)}</h1>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 p-8">
                <ChefHat size={56} className="mb-4 text-orange-300" />
                <p className="text-lg font-semibold text-gray-700 mb-1">{t('kdsTitle', lang)}</p>
                <p className="text-sm max-w-xs">{t('kdsPlaceholder', lang)}</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold active:bg-orange-600"
                >
                    {t('backToApp', lang)}
                </button>
            </div>
        </div>
    );
}

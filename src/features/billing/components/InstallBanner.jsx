import React from 'react';
import { t } from '../../../i18n/translations';

// "Install app" banner (mobile, before the app is installed)
export default function InstallBanner({ lang, onInstall }) {
    return (
        <div className="fixed top-16 left-4 right-4 bg-orange-500 text-white p-3 rounded-lg shadow-lg z-50 md:hidden">
            <p className="text-sm font-semibold mb-2">{t('installApp', lang)}</p>
            <button onClick={onInstall} className="w-full bg-white text-orange-500 py-2 rounded font-bold">
                {t('installNow', lang)}
            </button>
        </div>
    );
}

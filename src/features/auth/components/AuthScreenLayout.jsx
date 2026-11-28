import React from 'react';
import { LANGUAGES, t } from '../../../i18n/translations';

// Shared frame for the login / first-start screens: orange bar, centred card, language switch.
export default function AuthScreenLayout({ lang, onChangeLang, title, subtitle, children }) {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-orange-500 text-white py-3 px-4 shadow-lg">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <h1 className="text-lg md:text-2xl font-bold">{t('appName', lang)}</h1>
                    <div className="flex gap-1 p-1 rounded-full bg-orange-600">
                        {LANGUAGES.map(l => (
                            <button
                                key={l.code}
                                onClick={() => onChangeLang(l.code)}
                                className={`px-3 h-8 rounded-full text-xs font-bold ${lang === l.code ? 'bg-white text-orange-600' : 'text-white'}`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>
            <main className="flex-1 flex items-start md:items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}

export const authInputCls = 'w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';

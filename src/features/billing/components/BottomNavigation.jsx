import React from 'react';
import { Home, Grid3x3, HandPlatter } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { ts } from '../../../i18n/serveExtra';

// Bottom Navigation to switch between Home and All tables grid view
// `showBilling` / `showServe`: tabs the logged-in user may open
const BottomNavigation = ({ activeTab, onTabChange, showBilling = true, showServe = true, lang }) => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className={`grid ${showBilling && showServe ? 'grid-cols-3' : showBilling ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showBilling && (<>
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
            </>)}

            {showServe && (
            <button
                onClick={() => onTabChange('serve')}
                className={`flex flex-col items-center justify-center py-3 transition-colors ${activeTab === 'serve'
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-600'
                    }`}
            >
                <HandPlatter size={24} />
                <span className="text-xs mt-1 font-medium">{ts('tabServe', lang)}</span>
            </button>
            )}
        </div>
    </div>
);

export default BottomNavigation;

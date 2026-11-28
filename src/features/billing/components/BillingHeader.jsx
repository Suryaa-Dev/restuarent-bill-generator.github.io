import React from 'react';
import { ShoppingCart, Settings, ShoppingBag } from 'lucide-react';
import { t } from '../../../i18n/translations';

// top bar with title + cart (mobile) / settings (all tables)
const BillingHeader = ({ onCartClick, cartItemCount, currentTab, onSettingsClick, parcelOn, onParcelClick, lang }) => (
    <header className="sticky top-0 z-50 bg-orange-500 text-white py-3 px-4 shadow-lg">
        <div className="flex justify-between items-center">
            <h1 className="text-lg md:text-2xl font-bold">{t('appName', lang)}</h1>

            <div className="flex items-center gap-2">
                {currentTab === 'home' && (
                    // Parcel toggle sits left of the cart with a wide gap (mr-5) so it can't be hit by
                    // accident. Purple + "ON" while new items will go in as parcel.
                    <button
                        onClick={onParcelClick}
                        aria-pressed={!!parcelOn}
                        aria-label={t('parcel', lang)}
                        className={`md:hidden mr-5 p-2 rounded-full transition-colors ${parcelOn ? 'bg-purple-600 ring-2 ring-white' : 'bg-orange-600'}`}
                    >
                        <ShoppingBag size={22} />
                    </button>
                )}

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

export default BillingHeader;

import React from 'react';
import { ArrowLeft, Check, ChefHat, LogOut, Play, Volume2, VolumeX, X } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { tx } from '../../../i18n/kdsExtra';
import { ta } from '../../../i18n/adminExtra';
import { playCancelled, playNewOrder } from '../utils/kdsSound';
import { NotifyPanel } from './NotifyPanel';

const Group = ({ title, note, children }) => (
    <section className="space-y-2">
        <div className="px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h3>
            {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 space-y-3">{children}</div>
    </section>
);

/* Settings of THIS kitchen screen (device):
   1. Which kitchen this screen shows
   2. Alerts: sound + pop-up notifications
   3. Account: who is signed in, back to billing, sign out */
export default function KdsSettingsSheet({ lang, kitchens, kitchenId, onKitchen, sound, onSound, notify, account, onBack, onSignOut, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-3" onClick={onClose}>
            <div className="bg-white w-full max-w-md max-h-full overflow-y-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{t('kdsSettings', lang)}</h2>
                    <button onClick={onClose} aria-label={t('close', lang)}><X size={22} /></button>
                </div>

                <div className="p-4 space-y-5">
                    <Group title={ta('kdsSecKitchen', lang)} note={ta('kdsSecKitchenNote', lang)}>
                        {kitchens.length === 0 && <p className="text-sm text-gray-500">{t('kdsNoKitchens', lang)}</p>}
                        <div className="space-y-2">
                            {kitchens.map(k => (
                                <button
                                    key={k.id}
                                    onClick={() => onKitchen(k.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-semibold ${k.id === kitchenId ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-800 border-gray-200'}`}
                                >
                                    <span className="flex items-center gap-2"><ChefHat size={16} /> {k.name}</span>
                                    {k.id === kitchenId && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </Group>

                    <Group title={ta('kdsSecAlerts', lang)}>
                        <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 font-semibold text-gray-800">
                                        {sound ? <Volume2 size={18} className="text-green-600" /> : <VolumeX size={18} className="text-gray-400" />} {t('kdsSound', lang)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{ta('kdsSoundDesc', lang)}</p>
                                </div>
                                <button
                                    onClick={() => onSound(!sound)}
                                    role="switch"
                                    aria-checked={sound}
                                    className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${sound ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${sound ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                            </div>
                            {sound && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => playNewOrder()} className="py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5 active:bg-gray-100">
                                        <Play size={14} /> {t('kdsTestNew', lang)}
                                    </button>
                                    <button onClick={() => playCancelled()} className="py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5 active:bg-gray-100">
                                        <Play size={14} /> {t('kdsTestCancel', lang)}
                                    </button>
                                </div>
                            )}
                        </div>
                        {notify && (
                            <div className="pt-3 border-t border-gray-200">
                                <NotifyPanel lang={lang} notify={notify} />
                            </div>
                        )}
                    </Group>

                    <Group title={ta('secAccount', lang)}>
                        {account && (
                            <p className="text-sm text-gray-700">
                                {ta('signedInAs', lang)} <span className="font-bold">{account.display_name}</span>
                                <span className="text-gray-400"> · @{account.username}</span>
                            </p>
                        )}
                        <div className="grid gap-2">
                            {onBack && (
                                <button onClick={onBack} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2">
                                    <ArrowLeft size={18} /> {t('backToApp', lang)}
                                </button>
                            )}
                            <button onClick={onSignOut} className="w-full py-3 rounded-xl bg-white border border-gray-300 text-gray-800 font-bold flex items-center justify-center gap-2 active:bg-gray-100">
                                <LogOut size={18} /> {ta('signOut', lang)}
                            </button>
                        </div>
                    </Group>
                    <p className="text-[11px] text-gray-400 text-center">{tx('notifDeviceNote', lang)}</p>
                </div>
            </div>
        </div>
    );
}

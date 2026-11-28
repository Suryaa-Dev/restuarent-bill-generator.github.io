import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, QrCode, Settings, X } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { t } from '../../../i18n/translations';
import { fetchPaymentSettings, getCachedPaymentSettings } from '../../../services/paymentSettingsService';
import { buildUpiLink, formatRupees, isValidUpiId } from '../upi';

/* "Show QR": a UPI QR code for the bill amount. The amount comes straight from the open bill,
   so it is always the latest total — also when items change while the window is open. */
export default function UpiQrModal({ amount, table, branch, lang, onOpenSettings, onClose }) {
    const [settings, setSettings] = useState(() => getCachedPaymentSettings(branch));
    const [loaded, setLoaded] = useState(false);
    const [qr, setQr] = useState('');
    const [qrError, setQrError] = useState(false);

    // always read the latest UPI details when the window opens (falls back to this device's copy offline)
    useEffect(() => {
        let alive = true;
        fetchPaymentSettings(branch).then(s => { if (alive) { setSettings(s); setLoaded(true); } });
        return () => { alive = false; };
    }, [branch]);

    const configured = isValidUpiId(settings.upiId);
    const payee = settings.payeeName || settings.upiId;
    const note = table ? `${t('tableLabel', 'en')} ${table}` : '';

    useEffect(() => {
        if (!configured || !(amount > 0)) { setQr(''); return undefined; }
        let alive = true;
        const link = buildUpiLink({ upiId: settings.upiId, payeeName: settings.payeeName, amount, note });
        QRCode.toDataURL(link, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
            .then(url => { if (alive) { setQr(url); setQrError(false); } })
            .catch(err => { console.error('QR code failed:', err); if (alive) setQrError(true); });
        return () => { alive = false; };
    }, [configured, settings.upiId, settings.payeeName, amount, note]);

    // Esc closes the window (keyboard / desktop)
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
                    <h2 className="text-lg font-bold flex items-center gap-2"><QrCode size={20} className="text-blue-600" /> {ta('qrTitle', lang)}</h2>
                    <button
                        onClick={onClose}
                        aria-label={t('close', lang)}
                        className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center active:bg-gray-200"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="p-5 flex flex-col items-center text-center gap-3">
                    {configured ? (
                        <>
                            <div>
                                <p className="text-base font-bold text-gray-900">{payee}</p>
                                <p className="text-xs text-gray-500 break-all">{settings.upiId}</p>
                            </div>
                            <div className="w-64 h-64 rounded-xl border border-gray-200 flex items-center justify-center bg-white">
                                {qr ? (
                                    <img src={qr} alt={ta('qrTitle', lang)} className="w-full h-full rounded-xl" />
                                ) : qrError ? (
                                    <p className="text-sm text-red-600 px-4">{ta('qrFailed', lang)}</p>
                                ) : (
                                    <Loader2 size={28} className="animate-spin text-gray-300" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{ta('qrAmount', lang)}</p>
                                <p className="text-3xl font-extrabold text-orange-600">{formatRupees(amount)}</p>
                                {table && <p className="text-sm text-gray-500 mt-0.5">{t('tableLabel', lang)} {table}</p>}
                            </div>
                            <p className="text-xs text-gray-500">{ta('qrHint', lang)}</p>
                        </>
                    ) : !loaded ? (
                        <Loader2 size={28} className="animate-spin text-gray-300 my-10" />
                    ) : (
                        <div className="py-6 space-y-3">
                            <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{ta('qrNotSetUp', lang)}</p>
                            {onOpenSettings && (
                                <button onClick={onOpenSettings} className="w-full h-11 rounded-xl border-2 border-orange-300 text-orange-700 font-bold flex items-center justify-center gap-2 active:bg-orange-50">
                                    <Settings size={18} /> {ta('qrSetUpNow', lang)}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-4 pb-4">
                    <button onClick={onClose} className="w-full h-12 rounded-xl bg-gray-800 text-white font-bold active:bg-black">
                        {t('close', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

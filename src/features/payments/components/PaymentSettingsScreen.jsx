import React, { useEffect, useState } from 'react';
import { Check, IndianRupee, Loader2, X } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { t } from '../../../i18n/translations';
import { branchLabel } from '../../../shared/utils/devicePrefs';
import { fetchPaymentSettings, savePaymentSettings } from '../../../services/paymentSettingsService';
import { isValidUpiId } from '../upi';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';

// Settings -> Payments: the UPI ID and name used by "Show QR" (per branch)
export default function PaymentSettingsScreen({ lang, branch, onClose }) {
    const [upiId, setUpiId] = useState('');
    const [payeeName, setPayeeName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        fetchPaymentSettings(branch).then(s => {
            if (!alive) return;
            setUpiId(s.upiId);
            setPayeeName(s.payeeName);
            setLoading(false);
        });
        return () => { alive = false; };
    }, [branch]);

    const touch = () => { setSaved(false); setError(''); };

    const save = async () => {
        if (upiId.trim() && !isValidUpiId(upiId)) { setError(ta('upiInvalid', lang)); return; }
        setSaving(true);
        setError('');
        try {
            await savePaymentSettings(branch, { upiId, payeeName });
            setSaved(true);
        } catch (err) {
            console.error('Saving UPI settings failed:', err);
            setError(ta('saveFailedGeneric', lang));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[30rem] max-h-[94vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold flex items-center gap-2"><IndianRupee size={20} /> {ta('paymentsTitle', lang)}</h2>
                        <p className="text-xs text-gray-500 truncate">{branchLabel(branch, lang)}</p>
                    </div>
                    <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <p className="text-sm text-gray-600">{ta('paymentsIntro', lang)}</p>
                    {loading ? (
                        <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-gray-300" size={28} /></div>
                    ) : (
                        <>
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-gray-700">{ta('upiId', lang)}</span>
                                <input value={upiId} onChange={(e) => { touch(); setUpiId(e.target.value); }} placeholder="name@okbank"
                                    autoCapitalize="none" autoCorrect="off" spellCheck={false} className={inputCls} />
                                <span className="block text-xs text-gray-500">{ta('upiIdHint', lang)}</span>
                            </label>
                            <label className="block space-y-1.5">
                                <span className="text-sm font-semibold text-gray-700">{ta('payeeName', lang)}</span>
                                <input value={payeeName} onChange={(e) => { touch(); setPayeeName(e.target.value); }} className={inputCls} />
                                <span className="block text-xs text-gray-500">{ta('payeeNameHint', lang)}</span>
                            </label>
                            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">{ta('paymentsNote', lang)}</p>
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-white space-y-2">
                    {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                    <button onClick={save} disabled={saving || loading}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : null}
                        {saved ? ta('saved', lang) : t('saveChanges', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

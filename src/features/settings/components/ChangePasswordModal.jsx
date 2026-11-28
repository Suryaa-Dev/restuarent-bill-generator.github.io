import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { t } from '../../../i18n/translations';
import { changeMyPassword } from '../../../services/authService';
import PasswordInput from '../../auth/components/PasswordInput';

// Settings -> Account -> Change my password
export default function ChangePasswordModal({ lang, onClose }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const save = async () => {
        if (password.length < 6) { setError(ta('err.weak_password', lang)); return; }
        if (password !== confirm) { setError(ta('passwordsDiffer', lang)); return; }
        setBusy(true);
        setError('');
        try {
            await changeMyPassword(password);
            setDone(true);
        } catch (err) {
            console.error('Password change failed:', err);
            setError(ta('passwordChangeFailed', lang));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold">{ta('changeMyPassword', lang)}</h2>
                {done ? (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"><Check size={16} /> {ta('passwordChanged', lang)}</p>
                ) : (
                    <>
                        <label className="block space-y-1.5">
                            <span className="text-sm font-semibold text-gray-700">{ta('newPassword', lang)}</span>
                            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                        </label>
                        <label className="block space-y-1.5">
                            <span className="text-sm font-semibold text-gray-700">{ta('confirmPassword', lang)}</span>
                            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
                        </label>
                        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                    </>
                )}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-800 font-bold">{t('close', lang)}</button>
                    {!done && (
                        <button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                            {busy && <Loader2 size={16} className="animate-spin" />} {t('save', lang)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

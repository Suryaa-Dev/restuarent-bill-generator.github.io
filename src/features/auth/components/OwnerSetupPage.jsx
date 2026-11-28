import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { createFirstAdmin } from '../../../services/authService';
import { userErrorCode } from '../../../services/usersService';
import { useAuth } from '../AuthProvider';
import AuthScreenLayout, { authInputCls } from './AuthScreenLayout';
import PasswordInput from './PasswordInput';

// First start: no owner account exists yet. The owner creates theirs, then logs in with it.
export default function OwnerSetupPage({ lang, onChangeLang }) {
    const { signIn, finishSetup } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username.trim().toLowerCase())) { setError(ta('err.invalid_username', lang)); return; }
        if (password.length < 6) { setError(ta('err.weak_password', lang)); return; }
        if (password !== confirm) { setError(ta('passwordsDiffer', lang)); return; }
        setBusy(true);
        setError('');
        try {
            await createFirstAdmin({ username: username.trim(), password, displayName: displayName.trim() });
            await signIn(username.trim(), password);
        } catch (err) {
            console.error('Owner setup failed:', err);
            const code = `${err?.message || ''}`.includes('setup_done') ? 'setup_done' : userErrorCode(err);
            if (code === 'setup_done') { finishSetup(); return; }
            setError(ta(`err.${code}`, lang));
            setBusy(false);
        }
    };

    return (
        <AuthScreenLayout lang={lang} onChangeLang={onChangeLang} title={ta('setupTitle', lang)} subtitle={ta('setupSubtitle', lang)}>
            <form onSubmit={submit} className="space-y-4">
                <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-gray-700">{ta('displayName', lang)}</span>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={authInputCls} />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-gray-700">{ta('username', lang)}</span>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
                        autoCapitalize="none" autoCorrect="off" spellCheck={false} className={authInputCls} />
                    <span className="block text-xs text-gray-500">{ta('usernameHint', lang)}</span>
                </label>
                <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-gray-700">{ta('password', lang)}</span>
                    <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-gray-700">{ta('confirmPassword', lang)}</span>
                    <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
                </label>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
                <button type="submit" disabled={busy}
                    className="w-full h-12 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600 disabled:opacity-60">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    {ta('setupButton', lang)}
                </button>
            </form>
        </AuthScreenLayout>
    );
}

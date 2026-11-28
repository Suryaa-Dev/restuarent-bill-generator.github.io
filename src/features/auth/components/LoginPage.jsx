import React, { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { useAuth } from '../AuthProvider';
import AuthScreenLayout, { authInputCls } from './AuthScreenLayout';
import PasswordInput from './PasswordInput';

export default function LoginPage({ lang, onChangeLang }) {
    const { signIn, notice } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) { setError(ta('loginMissing', lang)); return; }
        setBusy(true);
        setError('');
        try {
            await signIn(username, password);
        } catch (err) {
            console.error('Login failed:', err);
            setError(/invalid|credentials|banned/i.test(err?.message || '') ? ta('loginWrong', lang) : ta('loginOffline', lang));
            setBusy(false);
        }
    };

    return (
        <AuthScreenLayout lang={lang} onChangeLang={onChangeLang} title={ta('loginTitle', lang)} subtitle={ta('loginSubtitle', lang)}>
            {notice && (
                <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    {ta(notice === 'inactive' ? 'loginInactive' : 'loginNoAccount', lang)}
                </p>
            )}
            <form onSubmit={submit} className="space-y-4">
                <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-gray-700">{ta('username', lang)}</span>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={authInputCls}
                    />
                </label>
                <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-gray-700">{ta('password', lang)}</span>
                    <PasswordInput value={password} onChange={setPassword} />
                </label>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
                <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600 disabled:opacity-60"
                >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    {ta('loginButton', lang)}
                </button>
            </form>
            <p className="text-xs text-gray-500 text-center">{ta('loginHelp', lang)}</p>
        </AuthScreenLayout>
    );
}

import React, { useState } from 'react';
import { Check, ChevronLeft, KeyRound, Loader2, ShieldCheck, Store, Trash2, UserCog } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { t } from '../../../i18n/translations';
import { createUser, deleteUser, setUserPassword, updateUser, userErrorCode } from '../../../services/usersService';
import PasswordInput from '../../auth/components/PasswordInput';
import { BRANCH_OPTIONS, branchLabel } from '../../../shared/utils/devicePrefs';
import {
    PERMISSION_GROUPS,
    PERMISSION_PRESETS,
    ROLES,
    normalizePermissions,
    togglePermission,
} from '../../auth/permissions';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

const Field = ({ label, hint, children }) => (
    <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {children}
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
    </label>
);

const Switch = ({ on, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-40 ${on ? 'bg-green-500' : 'bg-gray-300'}`}
    >
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
);

/* Create or edit one account: name, username, password, role, permissions, active. */
export default function UserEditor({ lang, user, currentUserId, onSaved, onDeleted, onBack }) {
    const isNew = !user;
    const isSelf = !!user && user.id === currentUserId;
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user?.role || ROLES.STAFF);
    const [permissions, setPermissions] = useState(() => normalizePermissions(user?.permissions || []));
    const [isActive, setIsActive] = useState(user ? user.isActive : true);
    // branches: empty list = every branch
    const [branchMode, setBranchMode] = useState(user && user.branches.length ? 'some' : 'all');
    const [branches, setBranches] = useState(user ? user.branches : []);
    const toggleBranch = (id) => setBranches(list => (list.includes(id) ? list.filter(b => b !== id) : [...list, id]));
    const [newPassword, setNewPassword] = useState('');
    const [showReset, setShowReset] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const fail = (err) => { console.error(err); setError(ta(`err.${userErrorCode(err)}`, lang)); };
    const has = (key) => permissions.includes(key);
    const applyPreset = (preset) => setPermissions(normalizePermissions(preset.permissions));
    const activePreset = PERMISSION_PRESETS.find(p => {
        const a = normalizePermissions(p.permissions);
        return a.length === permissions.length && a.every(k => permissions.includes(k));
    });

    const validate = () => {
        if (!USERNAME_RE.test(username.trim().toLowerCase())) return ta('err.invalid_username', lang);
        if (isNew && password.length < 6) return ta('err.weak_password', lang);
        if (role === ROLES.STAFF && branchMode === 'some' && branches.length === 0) return ta('branchPickOne', lang);
        return '';
    };

    const save = async () => {
        const v = validate();
        if (v) { setError(v); return; }
        setBusy(true);
        setError('');
        const payload = {
            username: username.trim().toLowerCase(),
            displayName: displayName.trim(),
            role,
            permissions: role === ROLES.ADMIN ? [] : permissions,
            branches: role === ROLES.ADMIN || branchMode === 'all' ? [] : BRANCH_OPTIONS.map(b => b.id).filter(id => branches.includes(id)),
            isActive,
        };
        try {
            if (isNew) await createUser({ ...payload, password });
            else await updateUser(user.id, payload);
            onSaved();
        } catch (err) {
            fail(err);
            setBusy(false);
        }
    };

    const resetPassword = async () => {
        if (newPassword.length < 6) { setError(ta('err.weak_password', lang)); return; }
        setBusy(true);
        setError('');
        try {
            await setUserPassword(user.id, newPassword);
            setNewPassword('');
            setShowReset(false);
            setNotice(ta('passwordChanged', lang));
        } catch (err) {
            fail(err);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm(ta('deleteUserConfirm', lang).replace('{name}', user.displayName))) return;
        setBusy(true);
        setError('');
        try {
            await deleteUser(user.id);
            onDeleted();
        } catch (err) {
            fail(err);
            setBusy(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 p-4 border-b">
                <button onClick={onBack} className="p-1 -ml-1" aria-label={t('cancel', lang)}><ChevronLeft size={24} /></button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold truncate">{isNew ? ta('addUser', lang) : user.displayName}</h2>
                    <p className="text-xs text-gray-500 truncate">{isNew ? ta('addUserDesc', lang) : `@${user.username}`}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* login details */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{ta('secLogin', lang)}</h3>
                    <Field label={ta('displayName', lang)}>
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label={ta('username', lang)} hint={ta('usernameHint', lang)}>
                        <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none"
                            autoCorrect="off" spellCheck={false} className={inputCls} />
                    </Field>
                    {isNew ? (
                        <Field label={ta('password', lang)} hint={ta('passwordHint', lang)}>
                            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
                        </Field>
                    ) : showReset ? (
                        <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                            <Field label={ta('newPassword', lang)} hint={isSelf ? null : ta('resetPasswordHint', lang)}>
                                <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                            </Field>
                            <div className="flex gap-2">
                                <button onClick={() => { setShowReset(false); setNewPassword(''); }} className="flex-1 h-10 rounded-lg bg-gray-100 text-gray-700 font-semibold">{t('cancel', lang)}</button>
                                <button onClick={resetPassword} disabled={busy} className="flex-1 h-10 rounded-lg bg-gray-800 text-white font-semibold disabled:opacity-60">{ta('setPassword', lang)}</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => { setShowReset(true); setNotice(''); }} className="w-full h-11 rounded-xl border border-gray-300 text-gray-800 font-semibold flex items-center justify-center gap-2 active:bg-gray-50">
                            <KeyRound size={16} /> {ta('resetPassword', lang)}
                        </button>
                    )}
                    {notice && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{notice}</p>}
                </section>

                {/* role */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{ta('secRole', lang)}</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {[[ROLES.STAFF, UserCog, 'roleStaff', 'roleStaffDesc'], [ROLES.ADMIN, ShieldCheck, 'roleAdmin', 'roleAdminDesc']].map(([id, Icon, label, desc]) => (
                            <button
                                key={id}
                                onClick={() => setRole(id)}
                                disabled={isSelf}
                                className={`p-3 rounded-xl border-2 text-left disabled:opacity-60 ${role === id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}
                            >
                                <span className="flex items-center gap-2 font-bold text-gray-900"><Icon size={18} /> {ta(label, lang)}</span>
                                <span className="block text-xs text-gray-500 mt-1">{ta(desc, lang)}</span>
                            </button>
                        ))}
                    </div>
                    {isSelf && <p className="text-xs text-gray-500">{ta('cannotChangeOwnRole', lang)}</p>}
                </section>

                {/* branches (staff only: admins work everywhere) */}
                {role === ROLES.STAFF && (
                    <section className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{ta('secBranches', lang)}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[['all', 'branchAll'], ['some', 'branchSome']].map(([id, key]) => (
                                <button
                                    key={id}
                                    onClick={() => setBranchMode(id)}
                                    className={`h-11 rounded-xl border-2 text-sm font-bold ${branchMode === id ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-700'}`}
                                >
                                    {ta(key, lang)}
                                </button>
                            ))}
                        </div>
                        {branchMode === 'some' && (
                            <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                                {BRANCH_OPTIONS.map(b => (
                                    <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                                        <Store size={18} className="text-emerald-600 shrink-0" />
                                        <p className="flex-1 text-sm font-semibold text-gray-900">{branchLabel(b.id, lang)}</p>
                                        <Switch on={branches.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-500">{ta('branchHint', lang)}</p>
                    </section>
                )}

                {/* permissions (staff only) */}
                {role === ROLES.STAFF && (
                    <section className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{ta('secPermissions', lang)}</h3>
                        <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">{ta('presetsTitle', lang)}</p>
                            <div className="flex flex-wrap gap-2">
                                {PERMISSION_PRESETS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => applyPreset(p)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${activePreset?.id === p.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300'}`}
                                    >
                                        {ta(`preset.${p.id}`, lang)}
                                    </button>
                                ))}
                                <button onClick={() => setPermissions([])} className="px-3 py-1.5 rounded-full text-sm font-semibold border bg-white text-gray-500 border-gray-300">
                                    {ta('presetNone', lang)}
                                </button>
                            </div>
                        </div>

                        {PERMISSION_GROUPS.map(group => (
                            <div key={group.id} className="rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                                    <p className="font-bold text-gray-800 text-sm">{ta(`permGroup.${group.id}`, lang)}</p>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {group.items.map(item => {
                                        const blocked = item.requires && !has(item.requires);
                                        return (
                                            <div key={item.key} className={`flex items-center gap-3 px-4 py-3 ${blocked ? 'opacity-50' : ''}`}>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900">{ta(`perm.${item.key}`, lang)}</p>
                                                    <p className="text-xs text-gray-500">{ta(`perm.${item.key}.desc`, lang)}</p>
                                                </div>
                                                <Switch on={has(item.key)} onChange={(on) => setPermissions(list => togglePermission(list, item.key, on))} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* account status */}
                {!isNew && (
                    <section className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{ta('secStatus', lang)}</h3>
                        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{ta('accountActive', lang)}</p>
                                <p className="text-xs text-gray-500">{ta('accountActiveDesc', lang)}</p>
                            </div>
                            <Switch on={isActive} onChange={setIsActive} disabled={isSelf} />
                        </div>
                        {!isSelf && (
                            <button onClick={remove} disabled={busy} className="w-full h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                                <Trash2 size={16} /> {ta('deleteUser', lang)}
                            </button>
                        )}
                    </section>
                )}
            </div>

            <div className="p-4 border-t bg-white space-y-2">
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                <button onClick={save} disabled={busy} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2 active:bg-orange-600">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {isNew ? ta('createUser', lang) : t('saveChanges', lang)}
                </button>
            </div>
        </>
    );
}

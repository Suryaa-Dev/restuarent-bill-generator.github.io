import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, Plus, ShieldCheck, Users, X } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { t } from '../../../i18n/translations';
import { listUsers, userErrorCode } from '../../../services/usersService';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES, normalizePermissions } from '../../auth/permissions';
import UserEditor from './UserEditor';

/* Settings -> Users & permissions (owner / admin only). */
export default function UserManagement({ lang, onClose }) {
    const { isAdmin, account, refreshAccount } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [screen, setScreen] = useState({ name: 'list' }); // list | edit (id) | new

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setUsers(await listUsers());
        } catch (err) {
            console.error('Loading users failed:', err);
            setError(ta(`err.${userErrorCode(err)}`, lang));
        } finally {
            setLoading(false);
        }
    }, [lang]);

    useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

    const backToList = () => { setScreen({ name: 'list' }); load(); refreshAccount(); };
    const editing = screen.name === 'edit' ? users.find(u => u.id === screen.id) : null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[36rem] h-[94vh] md:h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                {!isAdmin ? (
                    // the Settings row is only shown to admins; this is the second line of defence
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                        <p className="text-gray-600">{ta('adminOnly', lang)}</p>
                        <button onClick={onClose} className="px-6 h-11 rounded-xl bg-gray-800 text-white font-bold">{t('close', lang)}</button>
                    </div>
                ) : screen.name === 'new' || editing ? (
                    <UserEditor
                        key={editing?.id || 'new'}
                        lang={lang}
                        user={editing}
                        currentUserId={account?.id}
                        onSaved={backToList}
                        onDeleted={backToList}
                        onBack={() => setScreen({ name: 'list' })}
                    />
                ) : (
                    <>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20} /> {ta('usersTitle', lang)}</h2>
                                <p className="text-xs text-gray-500 truncate">{ta('usersSubtitle', lang)}</p>
                            </div>
                            <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                        </div>

                        <div className="p-4 border-b">
                            <button
                                onClick={() => setScreen({ name: 'new' })}
                                className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600"
                            >
                                <Plus size={18} /> {ta('addUser', lang)}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
                            {loading && users.length === 0 ? (
                                <div className="py-12 flex justify-center"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
                            ) : (
                                users.map(u => {
                                    const count = normalizePermissions(u.permissions).length;
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => setScreen({ name: 'edit', id: u.id })}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white active:bg-gray-50 text-left ${u.isActive ? '' : 'opacity-60'}`}
                                        >
                                            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg ${u.role === ROLES.ADMIN ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                                {(u.displayName || u.username).slice(0, 1).toUpperCase()}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-800 truncate">{u.displayName}</span>
                                                    {u.id === account?.id && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">{ta('you', lang)}</span>}
                                                </span>
                                                <span className="block text-xs text-gray-500 truncate">
                                                    @{u.username} · {u.role === ROLES.ADMIN
                                                        ? ta('fullAccess', lang)
                                                        : `${count} ${ta(count === 1 ? 'permissionOne' : 'permissionMany', lang)}`}
                                                </span>
                                            </span>
                                            {u.role === ROLES.ADMIN && <ShieldCheck size={18} className="text-orange-500 shrink-0" />}
                                            {!u.isActive && <span className="text-[11px] font-bold text-red-600 bg-red-50 rounded-full px-2 py-1 shrink-0">{ta('inactive', lang)}</span>}
                                            <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

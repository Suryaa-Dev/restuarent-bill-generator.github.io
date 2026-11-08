import React, { useState } from 'react';
import { Bell, BellOff, BellRing, Smartphone, X } from 'lucide-react';
import { tx } from '../../i18n/kdsExtra';
import { hasPushConfig } from '../../lib/kdsNotify';

// Settings-sheet section: turn notifications on/off, test them, see whether background push is live
export function NotifyPanel({ lang, notify }) {
    const { status, busy, diag, enable, disable, test } = notify;
    const { sup, perm, enabled, push } = status;
    const [msg, setMsg] = useState('');

    const unsupported = !sup.notifications && !sup.needsInstall;
    const onEnable = async () => {
        setMsg('');
        const res = await enable();
        if (!res.ok) setMsg(res.reason === 'install' ? 'install' : res.reason === 'denied' ? 'denied' : 'unsupported');
    };

    let note = null;
    if (sup.needsInstall) note = tx('notifInstallIos', lang);
    else if (unsupported || msg === 'unsupported') note = tx('notifUnsupported', lang);
    else if (perm === 'denied' || msg === 'denied') note = tx('notifBlocked', lang);

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-gray-800">
                        {enabled ? <BellRing size={18} className="text-green-600" /> : <BellOff size={18} className="text-gray-400" />}
                        {tx('notifTitle', lang)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{tx('notifDesc', lang)}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {enabled ? tx('notifOn', lang) : tx('notifOff', lang)}
                </span>
            </div>

            {note && <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{note}</p>}

            {enabled && (
                <p className={`text-xs rounded-lg p-2.5 border ${push ? 'text-green-800 bg-green-50 border-green-200' : 'text-gray-600 bg-white border-gray-200'}`}>
                    {push ? tx('notifPushOn', lang) : tx('notifPushOff', lang)}
                    {!push && !hasPushConfig() && <span className="block mt-1 text-gray-400">(VITE_VAPID_PUBLIC_KEY)</span>}
                </p>
            )}

            {enabled && (
                <div className="text-xs rounded-lg p-2.5 border border-gray-200 bg-white space-y-1">
                    <p className="font-bold text-gray-700">{tx('notifCheck', lang)}</p>
                    <p>{diag.handler === true ? '✅' : diag.handler === false ? '❌' : '⏳'} {tx('notifChkWorker', lang)}</p>
                    <p>{push ? '✅' : '❌'} {tx('notifChkSub', lang)}</p>
                    {diag.error && <p className="text-red-600 break-words">⚠ {diag.error}</p>}
                    {diag.testMsg && <p className={diag.testOk ? 'text-green-700' : 'text-red-600'}>{diag.testOk ? '✅' : '❌'} {diag.testMsg}</p>}
                    <p className="text-gray-500 pt-1">{tx('notifPopHint', lang)}</p>
                </div>
            )}

            {!note && (
                <div className="grid grid-cols-2 gap-2">
                    {enabled ? (
                        <>
                            <button onClick={test} disabled={busy} className="py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5 active:bg-gray-100">
                                <Bell size={14} /> {tx('notifTest', lang)}
                            </button>
                            <button onClick={disable} disabled={busy} className="py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-600 flex items-center justify-center gap-1.5 active:bg-gray-100 disabled:opacity-50">
                                <BellOff size={14} /> {tx('notifDisable', lang)}
                            </button>
                        </>
                    ) : (
                        <button onClick={onEnable} disabled={busy} className="col-span-2 py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                            <Bell size={18} /> {busy ? tx('notifWorking', lang) : tx('notifEnable', lang)}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// Slim bar under the navbar until the chef turns notifications on (or dismisses it)
export function NotifyBanner({ lang, notify }) {
    const { status, busy, enable, hideBanner } = notify;
    const needsInstall = status.sup.needsInstall;
    return (
        <div className="shrink-0 bg-orange-50 border-b border-orange-200 px-3 md:px-4 py-2 flex items-center gap-3">
            {needsInstall ? <Smartphone size={20} className="text-orange-600 shrink-0" /> : <BellRing size={20} className="text-orange-600 shrink-0" />}
            <div className="flex-1 min-w-0 leading-tight">
                <p className="text-sm font-bold text-gray-900">{tx('notifBannerTitle', lang)}</p>
                <p className="text-xs text-gray-600">{needsInstall ? tx('notifInstallIos', lang) : tx('notifBannerDesc', lang)}</p>
            </div>
            {!needsInstall && (
                <button onClick={enable} disabled={busy} className="h-9 px-4 rounded-full bg-orange-500 text-white text-sm font-bold shrink-0 disabled:opacity-60 active:bg-orange-600">
                    {tx('notifEnable', lang)}
                </button>
            )}
            <button onClick={hideBanner} aria-label={tx('notifLater', lang)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 active:bg-orange-100 shrink-0">
                <X size={18} />
            </button>
        </div>
    );
}
import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Info, Smartphone, X } from 'lucide-react';
import { tx } from '../../../i18n/kdsExtra';

// Kitchen screen settings -> Alerts -> Pop-up notifications: turn on / off, send a test,
// and say in plain words whether alerts also arrive while the app is closed.
export function NotifyPanel({ lang, notify }) {
    const { status, busy, diag, enable, disable, test } = notify;
    const { sup, perm, enabled, push } = status;
    const [msg, setMsg] = useState('');
    const [showTip, setShowTip] = useState(false);

    const unsupported = !sup.notifications && !sup.needsInstall;
    const onEnable = async () => {
        setMsg('');
        const res = await enable();
        if (!res.ok) setMsg(res.reason === 'install' ? 'install' : res.reason === 'denied' ? 'denied' : 'unsupported');
    };

    // technical details stay in the console for whoever maintains the app
    useEffect(() => {
        if (diag.error) console.warn('KDS push:', diag.error);
        if (diag.testOk === false && diag.testMsg) console.warn('KDS push test:', diag.testMsg);
    }, [diag.error, diag.testOk, diag.testMsg]);

    let note = null;
    if (sup.needsInstall) note = tx('notifInstallIos', lang);
    else if (unsupported || msg === 'unsupported') note = tx('notifUnsupported', lang);
    else if (perm === 'denied' || msg === 'denied') note = tx('notifBlocked', lang);

    return (
        <div className="space-y-3">
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
                    {push ? tx('notifPushOn', lang) : tx('notifPushOffPlain', lang)}
                </p>
            )}

            {enabled && diag.testOk != null && (
                <p className={`text-xs rounded-lg p-2.5 border ${diag.testOk ? 'text-green-800 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                    {tx(diag.testOk ? 'notifTestSent' : 'notifTestFailed', lang)}
                </p>
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

            {enabled && (
                <div className="text-xs">
                    <button onClick={() => setShowTip(v => !v)} className="font-semibold text-blue-700 flex items-center gap-1">
                        <Info size={13} /> {tx('notifTipTitle', lang)}
                    </button>
                    {showTip && <p className="mt-1.5 text-gray-600 bg-white border border-gray-200 rounded-lg p-2.5">{tx('notifPopHint', lang)}</p>}
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
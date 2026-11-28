import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChefHat, Settings, Check, Undo2 } from 'lucide-react';
import { t, translateItemName } from '../../i18n/translations';
import { tx } from '../../i18n/kdsExtra';
import { getSavedLanguage } from '../../shared/utils/devicePrefs';
import { useKdsData } from './hooks/useKdsData';
import { useKdsNotify } from './hooks/useKdsNotify';
import { useKdsBatches } from './hooks/useKdsBatches';
import { tb } from '../../i18n/batchExtra';
import {
    FLAG_TTL_MS,
    aggregate,
    describeEvents,
    diffEvents,
    normalizeConfig,
    pendingLines,
} from './utils/kds';
import { isSoundOn, playCancelled, playNewOrder, setSoundOn, unlockAudio } from './utils/kdsSound';
import { useAuth } from '../auth/AuthProvider';
import { PERMISSIONS as P } from '../auth/permissions';
import KdsSettingsSheet from './components/KdsSettingsSheet';
import AllTab from './components/AllTab';
import ItemPage from './components/ItemPage';
import TokenTab from './components/TokenTab';
import BatchesTab from './components/BatchesTab';
import { NotifyBanner } from './components/NotifyPanel';

const KITCHEN_KEY = 'restaurant_kds_kitchen';

// Undo the automatic landscape lock, so billing is free to rotate back to portrait
function releaseOrientation() {
    try { window.screen.orientation?.unlock?.(); } catch { /* not supported */ }
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* not supported */ }
}

/* ---------- landscape: the KDS layout is built for it, so it rotates by itself (no question asked) ----------
   1. try to lock the screen to landscape (works in the installed app and, via fullscreen, right after a tap)
   2. if the device won't allow it (iPhone, a plain browser tab) the KDS layout is turned 90 degrees instead
      (.kds-forced-landscape in index.css), so it still shows in landscape without any prompt.            */
function useAutoLandscape(portrait) {
    const [forced, setForced] = useState(false);
    useEffect(() => {
        if (!portrait) { setForced(false); return undefined; }
        let cancelled = false;
        const lock = () => window.screen.orientation?.lock?.('landscape');
        (async () => {
            try { await lock(); }
            catch {
                try { await document.documentElement.requestFullscreen?.(); await lock(); }
                catch { if (!cancelled) setForced(true); return; }
            }
            // locked but the screen did not turn (rotation switched off on the phone): fall back too
            setTimeout(() => {
                if (!cancelled && window.matchMedia('(orientation: portrait) and (max-width: 820px)').matches) setForced(true);
            }, 700);
        })();
        return () => { cancelled = true; };
    }, [portrait]);
    return portrait && forced;
}

function usePortraitPhone() {
    const query = '(orientation: portrait) and (max-width: 820px)';
    const [portrait, setPortrait] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setPortrait(mq.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return portrait;
}

/* ---------- the display itself (pure: all data comes in as props) ---------- */

export function KdsView({ lang, kitchens, kitchenId, onKitchen, tokens, menuItems, onBack, initial, onServe, notify, batches, live = true, onRefresh, account, onSignOut, canManageBatches = true }) {
    const kitchen = kitchens.find(k => k.id === kitchenId) || null;
    const config = useMemo(() => normalizeConfig(kitchen?.kdsConfig), [kitchen]);

    const [tab, setTab] = useState(initial?.tab || 'all');            // all | table | parcel
    const [selected, setSelected] = useState(initial?.selected || null); // { key, name } — item page
    const [showSettings, setShowSettings] = useState(false);
    const [sound, setSound] = useState(isSoundOn());
    const portrait = usePortraitPhone();
    const forcedLandscape = useAutoLandscape(portrait);

    // ticking clock for the timer colours + expiring arrows
    // leaving the KDS (any way) hands rotation back to the device
    useEffect(() => releaseOrientation, []);

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);

    // audio can only start after a tap
    useEffect(() => {
        const unlock = () => unlockAudio();
        window.addEventListener('pointerdown', unlock, { once: true });
        return () => window.removeEventListener('pointerdown', unlock);
    }, []);

    // ---- everything below is derived from the token records ----
    const lines = useMemo(() => (kitchenId ? pendingLines(tokens, kitchenId) : []), [tokens, kitchenId]);
    const agg = useMemo(() => aggregate(lines), [lines]);
    // how many tokens are waiting in each tab (shown as a small count on the tab)
    const tabCounts = useMemo(() => {
        const tbl = new Set();
        const par = new Set();
        lines.forEach(l => (l.token.isParcel ? par : tbl).add(l.token.id));
        return { table: tbl.size, parcel: par.size };
    }, [lines]);
    const menuByKey = useMemo(() => {
        const m = new Map();
        menuItems.forEach(i => m.set(`${i.name}||${i.category || ''}`, i));
        return m;
    }, [menuItems]);

    // ---- arrows + sound: compare each new snapshot with the previous one ----
    const [flags, setFlags] = useState(initial?.flags || {});
    const prevRef = useRef({ tokens: null, kitchenId: null });
    useEffect(() => {
        const prev = prevRef.current;
        if (prev.tokens && prev.kitchenId === kitchenId && kitchenId) {
            const { up, down } = diffEvents(prev.tokens, tokens, kitchenId);
            const upKeys = Object.keys(up);
            const downKeys = Object.keys(down);
            if (upKeys.length || downKeys.length) {
                // app in the background (chef is in another app)? -> system notification
                if (notify) notify.notifyEvents(describeEvents(prev.tokens, tokens, kitchenId));
                const at = Date.now();
                setFlags(old => {
                    const next = { ...old };
                    const bump = (key, dir, n) => {
                        const cur = next[key];
                        next[key] = cur && cur.dir === dir && at - cur.at < FLAG_TTL_MS ? { dir, n: cur.n + n, at } : { dir, n, at };
                    };
                    upKeys.forEach(k => bump(k, 'up', up[k]));
                    downKeys.forEach(k => bump(k, 'down', down[k]));
                    return next;
                });
                if (isSoundOn()) {
                    if (upKeys.length) playNewOrder();
                    else playCancelled();
                }
            }
        } else if (prev.kitchenId && prev.kitchenId !== kitchenId) {
            setFlags({}); // switching kitchen: start clean, no alerts
        }
        prevRef.current = { tokens, kitchenId };
    }, [tokens, kitchenId]); // eslint-disable-line react-hooks/exhaustive-deps -- `notify` is read fresh on purpose

    // arrows fade after a minute
    const liveFlags = useMemo(() => {
        const out = {};
        Object.entries(flags).forEach(([k, f]) => { if (now - f.at < FLAG_TTL_MS) out[k] = f; });
        return out;
    }, [flags, now]);

    // ---- item page navigation (Android back button returns to the list) ----
    useEffect(() => {
        const onPop = () => setSelected(null);
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);
    const openItem = (key, name) => {
        window.history.pushState({ kds: 1 }, '');
        setSelected({ key, name });
        setFlags(f => { const n = { ...f }; delete n[key]; return n; }); // seen
    };
    const goTab = (id) => {
        if (selected && window.history.state?.kds) window.history.back();
        setSelected(null);
        setTab(id);
    };

    // ---- serve on behalf of the waiter (Table / Parcel tabs) with a short Undo ----
    const [toast, setToast] = useState(null); // { tokenId, idx, name, tokenNo, id }
    useEffect(() => {
        if (!toast) return undefined;
        const id = setTimeout(() => setToast(null), 6000);
        return () => clearTimeout(id);
    }, [toast]);
    const serve = (tokenId, idx) => {
        if (!onServe) return;
        const tk = tokens.find(x => x.id === tokenId);
        const it = tk?.items?.[idx];
        if (!it) return;
        setToast({ tokenId, idx, name: it.name, tokenNo: tk.tokenNo, id: Date.now() });
        Promise.resolve(onServe(tokenId, idx, true)).then(ok => {
            if (ok === false) { setToast(null); alert(t('tokenSaveFailed', lang)); }
        });
    };
    const undoServe = () => {
        if (!toast || !onServe) return;
        const { tokenId, idx } = toast;
        setToast(null);
        Promise.resolve(onServe(tokenId, idx, false)).then(ok => {
            if (ok === false) alert(t('tokenSaveFailed', lang));
        });
    };

    const switchKitchen = (id) => {
        localStorage.setItem(KITCHEN_KEY, id);
        onKitchen(id);
        setSelected(null);
        setShowSettings(false);
    };

    // the Batches tab only exists when batch data is supplied (the live KDS does; demos / previews don't)
    const tabs = [['all', 'kdsAll'], ['table', 'kdsTable'], ['parcel', 'kdsParcel'], ...(batches ? [['batches', null]] : [])];

    return (
        <div className={`h-dvh bg-gray-100 flex flex-col overflow-hidden ${forcedLandscape ? 'kds-forced-landscape' : ''}`}>

            {/* navbar: kitchen name · [All][Table][Parcel] · settings */}
            <header className="shrink-0 z-40 bg-white border-b border-gray-200 px-3 md:px-4 py-2 flex items-center gap-3">
                <div className="w-1/4 min-w-0 flex items-center gap-2">
                    {selected ? (
                        /* item page: Back takes the place of the kitchen name */
                        <button
                            onClick={() => goTab('all')}
                            aria-label={t('kdsBackToAll', lang)}
                            className="flex items-center gap-1.5 pl-2.5 pr-4 h-10 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-800 shadow-sm active:bg-gray-100"
                        >
                            <ArrowLeft size={18} /> {t('kdsBackToAll', lang)}
                        </button>
                    ) : (
                        <>
                            <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><ChefHat size={20} /></span>
                            <span className="text-base font-bold text-gray-900 truncate">{kitchen?.name || t('kdsTitle', lang)}</span>
                        </>
                    )}
                    {/* connection dot: green = live, amber = reconnecting (tap to refresh orders now) */}
                    <button
                        onClick={() => onRefresh?.()}
                        aria-label="Refresh orders"
                        title={live ? 'Live' : 'Reconnecting…'}
                        className="w-6 h-6 flex items-center justify-center shrink-0"
                    >
                        <span className={`w-2.5 h-2.5 rounded-full ${live ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                    </button>
                </div>
                <nav className="flex-1 flex justify-center">
                    <div className="inline-flex gap-1 p-1 rounded-full bg-gray-100">
                        {tabs.map(([id, key]) => {
                            const active = tab === id;
                            const n = id === 'table' ? tabCounts.table : id === 'parcel' ? tabCounts.parcel
                                : id === 'batches' ? (batches ? batches.inProgress.length + batches.recs.length : 0) : 0;
                            return (
                                <button
                                    key={id}
                                    onClick={() => goTab(id)}
                                    className={`h-10 px-4 sm:px-5 rounded-full text-[15px] font-semibold flex items-center gap-2 transition-colors ${active ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 active:bg-gray-200'}`}
                                >
                                    {key ? t(key, lang) : tb('tabBatches', lang)}
                                    {n > 0 && (
                                        <span className={`text-xs font-bold tabular-nums rounded-full px-1.5 py-0.5 leading-none ${active ? 'bg-white/25 text-white' : 'bg-white text-gray-600'}`}>{n}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>
                <div className="w-1/4 flex justify-end">
                    <button onClick={() => setShowSettings(true)} aria-label={t('settings', lang)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 active:bg-gray-100">
                        <Settings size={22} />
                    </button>
                </div>
            </header>

            {notify?.showBanner && <NotifyBanner lang={lang} notify={notify} />}

            {!kitchen ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-8">
                    <ChefHat size={48} className="mb-3 opacity-50" />
                    <p className="max-w-xs">{t('kdsNoKitchens', lang)}</p>
                    {onBack && <button onClick={onBack} className="mt-5 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold">{t('backToApp', lang)}</button>}
                </div>
            ) : (
                <main className="flex-1 min-h-0">
                    {selected ? (
                        <ItemPage itemKey={selected.key} name={selected.name} lines={lines} menuByKey={menuByKey} now={now} timer={config.timer} lang={lang} onServe={onServe ? serve : undefined} onBack={() => goTab('all')} />
                    ) : tab === 'batches' && batches ? (
                        <BatchesTab batches={batches} timer={config.timer} lang={lang} readOnly={!canManageBatches} />
                    ) : tab === 'all' ? (
                        <AllTab config={config} agg={agg} menuByKey={menuByKey} flags={liveFlags} now={now} lang={lang} onOpen={openItem} />
                    ) : (
                        <TokenTab mode={tab} lines={lines} kitchenId={kitchenId} now={now} timer={config.timer} lang={lang} onServe={onServe ? serve : undefined} />
                    )}
                </main>
            )}

            {showSettings && (
                <KdsSettingsSheet
                    lang={lang}
                    kitchens={kitchens}
                    kitchenId={kitchenId}
                    onKitchen={switchKitchen}
                    sound={sound}
                    onSound={(on) => { setSoundOn(on); setSound(on); if (on) unlockAudio(); }}
                    notify={notify}
                    account={account}
                    onBack={onBack}
                    onSignOut={onSignOut}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {toast && (
                <div key={toast.id} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] bg-gray-900 text-white rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-3 shadow-xl">
                    <Check size={18} className="text-green-400 shrink-0" />
                    <span className="text-sm font-semibold truncate">
                        {tx('servedToast', lang)} · #{toast.tokenNo} · {translateItemName(toast.name, lang)}
                    </span>
                    <button onClick={undoServe} className="h-9 px-3.5 rounded-full bg-white/15 text-sm font-bold flex items-center gap-1.5 shrink-0 active:bg-white/25">
                        <Undo2 size={15} /> {t('undo', lang)}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ---------- route component: loads live data ---------- */

export default function KitchenDisplayPage() {
    const navigate = useNavigate();
    const { can, account, signOut } = useAuth();
    // "Back to billing" only for accounts that can use the billing screen
    const goBack = can(P.BILLING_VIEW) || can(P.SERVE_VIEW) ? () => navigate('/') : undefined;
    const lang = getSavedLanguage();
    const { branch, kitchens, tokens, menuItems, ready, error, live, refresh, serveItem } = useKdsData();
    const [kitchenId, setKitchenId] = useState(() => localStorage.getItem(KITCHEN_KEY));
    const notify = useKdsNotify({ branch, kitchenId, lang });

    // Batches tab: recommendations + started batches of the selected kitchen
    const activeKitchen = kitchens.find(k => k.id === kitchenId) || null;
    const kdsCfg = useMemo(() => normalizeConfig(activeKitchen?.kdsConfig), [activeKitchen]);
    const batches = useKdsBatches({
        branch,
        kitchenId: activeKitchen ? kitchenId : null,
        tokens,
        timer: kdsCfg.timer,
        weights: activeKitchen?.kdsConfig?.batchWeights,
    });

    useEffect(() => { if (!branch) navigate('/', { replace: true }); }, [branch, navigate]);

    // fall back to the first kitchen if none/removed one is remembered
    useEffect(() => {
        if (!ready || kitchens.length === 0) return;
        if (!kitchens.some(k => k.id === kitchenId)) setKitchenId(kitchens[0].id);
    }, [ready, kitchens, kitchenId]);

    if (!ready) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-3">
                <ChefHat size={44} className="opacity-50" />
                <p>{error ? t('kdsLoadError', lang) : t('kdsLoading', lang)}</p>
                {error && goBack && <button onClick={goBack} className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold">{t('backToApp', lang)}</button>}
            </div>
        );
    }

    return (
        <KdsView
            lang={lang}
            kitchens={kitchens}
            kitchenId={kitchenId}
            onKitchen={setKitchenId}
            tokens={tokens}
            menuItems={menuItems}
            onServe={can(P.KDS_SERVE) ? serveItem : undefined}
            notify={notify}
            batches={batches}
            live={live}
            onRefresh={refresh}
            onBack={goBack}
            account={account}
            onSignOut={signOut}
            canManageBatches={can(P.KDS_BATCHES)}
        />
    );
}
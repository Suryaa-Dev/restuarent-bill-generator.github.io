import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChefHat, Settings, X, Volume2, VolumeX, Maximize, RotateCw, Check, Play } from 'lucide-react';
import { t } from '../i18n/translations';
import { getSavedLanguage } from '../lib/branchMenu';
import { useKdsData } from '../lib/useKdsData';
import {
    FLAG_TTL_MS,
    aggregate,
    diffEvents,
    normalizeConfig,
    pendingLines,
} from '../lib/kds';
import { isSoundOn, playCancelled, playNewOrder, setSoundOn, unlockAudio } from '../lib/kdsSound';
import AllTab from '../components/kds/AllTab';
import ItemPage from '../components/kds/ItemPage';
import TokenTab from '../components/kds/TokenTab';

const KITCHEN_KEY = 'restaurant_kds_kitchen';

// Undo what "Go landscape" did, so billing is free to rotate back to portrait
function releaseOrientation() {
    try { window.screen.orientation?.unlock?.(); } catch { /* not supported */ }
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* not supported */ }
}

/* ---------- landscape prompt (the layout is built for landscape) ---------- */

function RotatePrompt({ lang, onContinue }) {
    const goLandscape = async () => {
        try {
            await document.documentElement.requestFullscreen?.();
            await window.screen.orientation?.lock?.('landscape');
        } catch { /* not supported — user can rotate manually */ }
    };
    return (
        <div className="fixed inset-0 z-[90] bg-gray-900 text-white flex flex-col items-center justify-center text-center p-8">
            <RotateCw size={56} className="mb-4 text-orange-400" />
            <p className="text-xl font-bold mb-1">{t('kdsRotate', lang)}</p>
            <p className="text-sm text-gray-300 max-w-xs mb-6">{t('kdsRotateDesc', lang)}</p>
            <button onClick={goLandscape} className="w-full max-w-xs py-3 rounded-xl bg-orange-500 font-bold flex items-center justify-center gap-2 mb-3">
                <Maximize size={18} /> {t('kdsGoLandscape', lang)}
            </button>
            <button onClick={onContinue} className="text-sm text-gray-400 underline">{t('kdsContinue', lang)}</button>
        </div>
    );
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

/* ---------- settings sheet ---------- */

function KdsSettings({ lang, kitchens, kitchenId, onKitchen, sound, onSound, onBack, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-3" onClick={onClose}>
            <div className="bg-white w-full max-w-md max-h-full overflow-y-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold">{t('kdsSettings', lang)}</h2>
                    <button onClick={onClose} aria-label={t('close', lang)}><X size={22} /></button>
                </div>
                <div className="p-4 space-y-5">
                    <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><ChefHat size={16} /> {t('kdsSwitchKitchen', lang)}</p>
                        <div className="space-y-2">
                            {kitchens.map(k => (
                                <button
                                    key={k.id}
                                    onClick={() => onKitchen(k.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-semibold ${k.id === kitchenId ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-800 border-gray-200'}`}
                                >
                                    {k.name}
                                    {k.id === kitchenId && <Check size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => onSound(!sound)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-gray-50"
                    >
                        <span className="flex items-center gap-2 font-semibold text-gray-800">
                            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />} {t('kdsSound', lang)}
                        </span>
                        <span className={`text-sm font-bold ${sound ? 'text-green-600' : 'text-gray-400'}`}>{sound ? t('on', lang) : t('off', lang)}</span>
                    </button>

                    {sound && (
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => playNewOrder()} className="py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5 active:bg-gray-100">
                                <Play size={14} /> {t('kdsTestNew', lang)}
                            </button>
                            <button onClick={() => playCancelled()} className="py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-800 flex items-center justify-center gap-1.5 active:bg-gray-100">
                                <Play size={14} /> {t('kdsTestCancel', lang)}
                            </button>
                        </div>
                    )}

                    <button onClick={onBack} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2">
                        <ArrowLeft size={18} /> {t('backToApp', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------- the display itself (pure: all data comes in as props) ---------- */

export function KdsView({ lang, kitchens, kitchenId, onKitchen, tokens, menuItems, onBack, initial }) {
    const kitchen = kitchens.find(k => k.id === kitchenId) || null;
    const config = useMemo(() => normalizeConfig(kitchen?.kdsConfig), [kitchen]);

    const [tab, setTab] = useState(initial?.tab || 'all');            // all | table | parcel
    const [selected, setSelected] = useState(initial?.selected || null); // { key, name } — item page
    const [showSettings, setShowSettings] = useState(false);
    const [sound, setSound] = useState(isSoundOn());
    const [skipRotate, setSkipRotate] = useState(false);
    const portrait = usePortraitPhone();

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
    }, [tokens, kitchenId]);

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

    const switchKitchen = (id) => {
        localStorage.setItem(KITCHEN_KEY, id);
        onKitchen(id);
        setSelected(null);
        setShowSettings(false);
    };

    const tabs = [['all', 'kdsAll'], ['table', 'kdsTable'], ['parcel', 'kdsParcel']];

    return (
        <div className="h-dvh bg-gray-100 flex flex-col overflow-hidden">
            {portrait && !skipRotate && <RotatePrompt lang={lang} onContinue={() => setSkipRotate(true)} />}

            {/* navbar: kitchen name · [All][Table][Parcel] · settings */}
            <header className="shrink-0 z-40 bg-white border-b border-gray-200 px-3 md:px-4 py-2 flex items-center gap-3">
                <div className="w-1/4 min-w-0 flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><ChefHat size={20} /></span>
                    <span className="text-base font-bold text-gray-900 truncate">{kitchen?.name || t('kdsTitle', lang)}</span>
                </div>
                <nav className="flex-1 flex justify-center">
                    <div className="inline-flex gap-1 p-1 rounded-full bg-gray-100">
                        {tabs.map(([id, key]) => {
                            const active = tab === id;
                            const n = id === 'table' ? tabCounts.table : id === 'parcel' ? tabCounts.parcel : 0;
                            return (
                                <button
                                    key={id}
                                    onClick={() => goTab(id)}
                                    className={`h-10 px-5 rounded-full text-[15px] font-semibold flex items-center gap-2 transition-colors ${active ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700 active:bg-gray-200'}`}
                                >
                                    {t(key, lang)}
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

            {!kitchen ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-8">
                    <ChefHat size={48} className="mb-3 opacity-50" />
                    <p className="max-w-xs">{t('kdsNoKitchens', lang)}</p>
                    <button onClick={onBack} className="mt-5 px-6 py-3 rounded-xl bg-orange-500 text-white font-bold">{t('backToApp', lang)}</button>
                </div>
            ) : (
                <main className="flex-1 min-h-0">
                    {selected ? (
                        <ItemPage itemKey={selected.key} name={selected.name} lines={lines} menuByKey={menuByKey} now={now} timer={config.timer} lang={lang} onBack={() => goTab('all')} />
                    ) : tab === 'all' ? (
                        <AllTab config={config} agg={agg} menuByKey={menuByKey} flags={liveFlags} now={now} lang={lang} onOpen={openItem} />
                    ) : (
                        <TokenTab mode={tab} lines={lines} kitchenId={kitchenId} now={now} timer={config.timer} lang={lang} />
                    )}
                </main>
            )}

            {showSettings && (
                <KdsSettings
                    lang={lang}
                    kitchens={kitchens}
                    kitchenId={kitchenId}
                    onKitchen={switchKitchen}
                    sound={sound}
                    onSound={(on) => { setSoundOn(on); setSound(on); if (on) unlockAudio(); }}
                    onBack={onBack}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </div>
    );
}

/* ---------- route component: loads live data ---------- */

export default function KitchenDisplay() {
    const navigate = useNavigate();
    const lang = getSavedLanguage();
    const { branch, kitchens, tokens, menuItems, ready, error } = useKdsData();
    const [kitchenId, setKitchenId] = useState(() => localStorage.getItem(KITCHEN_KEY));

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
                {error && <button onClick={() => navigate('/')} className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold">{t('backToApp', lang)}</button>}
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
            onBack={() => navigate('/')}
        />
    );
}
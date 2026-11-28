import React, { useMemo, useState } from 'react';
import { Copy, Lock, X } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../../i18n/translations';
import { ts } from '../../../i18n/serveExtra';
import { buildConflictMap, isBlocked, toggleMod, modifiersForCategory, modsSig } from '../../menu/utils/modifiers';

/* Long-press a dish (in the cart, or in Update Token) -> choose cooking instructions per plate.
   Instructions never change a price.

   Two ways of working:
     - "Same for all N"         one set of choices applied to every plate
     - "Each plate separately"  Plate 1, Plate 2 … each with its own choices (+ "Copy to all")
   Plates that can't change any more (already in the kitchen / already served) are listed, locked.
   The footer always shows how the dish will be cooked, e.g.  2 × Spicy · 1 × Plain.

   Props: line (the dish), locked [{ mods }], initialUnits [{ id, mods }], modifiers, onSave(units)
          lockedKind 'kitchen' (cart, default) | 'served' (Update Token)                         */

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const sameMods = (a, b) => a.length === b.length && a.every(m => b.includes(m));

function Pills({ list, selected, conflictMap, onToggle, lang }) {
    return (
        <div className="flex flex-wrap gap-2">
            {list.map(m => {
                const on = selected.includes(m.name);
                const blocked = isBlocked(selected, m.name, conflictMap);
                const why = blocked ? selected.find(s => conflictMap.get(s)?.has(m.name) || conflictMap.get(m.name)?.has(s)) : null;
                return (
                    <button
                        key={m.id}
                        type="button"
                        disabled={blocked}
                        aria-pressed={on}
                        title={why ? fill(ts('conflictsWith', lang), { name: why }) : undefined}
                        onClick={() => onToggle(m.name)}
                        className={`h-11 px-4 rounded-full border-2 text-[15px] font-bold transition-colors ${on
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : blocked
                                ? 'bg-gray-50 border-gray-200 text-gray-300 line-through'
                                : 'bg-white border-gray-300 text-gray-800 active:bg-indigo-50'}`}
                    >
                        {m.name}
                    </button>
                );
            })}
        </div>
    );
}

// "2 × Spicy · 1 × Plain"
function summarize(unitMods, lang) {
    const m = new Map();
    unitMods.forEach(mods => {
        const k = modsSig(mods);
        if (!m.has(k)) m.set(k, { label: mods.length ? mods.join(', ') : ts('custPlain', lang), n: 0, plain: !mods.length });
        m.get(k).n += 1;
    });
    return [...m.values()].sort((a, b) => (a.plain ? 1 : 0) - (b.plain ? 1 : 0) || b.n - a.n);
}

export default function CustomizeModal({ line, locked, initialUnits, modifiers, lang, onSave, onClose, lockedKind = 'kitchen' }) {
    const list = useMemo(() => modifiersForCategory(modifiers, line.category), [modifiers, line.category]);
    const conflictMap = useMemo(() => buildConflictMap(modifiers), [modifiers]);

    const [units, setUnits] = useState(initialUnits); // [{ id, mods }] — the plates that can still change
    const allEqual = units.length > 0 && units.every(u => sameMods(u.mods, units[0].mods));
    const [same, setSame] = useState(units.length > 1 && allEqual); // identical plates open in "same for all"
    const [shared, setShared] = useState(allEqual ? [...(units[0]?.mods || [])] : []);

    const portion = translatePortion(line.portion, lang);
    const name = translateItemName(line.name, lang);
    const total = locked.length + units.length;

    const setUnitMods = (id, mods) => setUnits(us => us.map(u => (u.id === id ? { ...u, mods } : u)));
    const copyToAll = (mods) => setUnits(us => us.map(u => ({ ...u, mods: [...mods] })));

    const switchMode = (toSame) => {
        if (toSame === same) return;
        if (toSame) {
            const first = units[0]?.mods || [];
            setShared(units.every(u => sameMods(u.mods, first)) ? [...first] : []);
        } else {
            setUnits(us => us.map(u => ({ ...u, mods: [...shared] })));
        }
        setSame(toSame);
    };

    const result = same ? units.map(u => ({ ...u, mods: [...shared] })) : units;
    const summary = summarize(result.map(u => u.mods), lang);
    const changed = result.some((u, i) => !sameMods(u.mods, initialUnits[i]?.mods || []));
    const save = () => onSave(result);

    return (
        <div className="fixed inset-0 bg-black/60 z-[85] flex items-end md:items-center justify-center" onClick={onClose}>
            <div className="bg-white w-full md:w-[32rem] max-h-[92vh] md:max-h-[85vh] rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* dish + how many plates */}
                <div className="px-4 pt-4 pb-3 border-b">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold leading-tight truncate">{fill(ts('customizeTitle', lang), { name })}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">{fill(ts(total === 1 ? 'plate1' : 'plateN', lang), { n: total, portion })}</p>
                        </div>
                        <button onClick={onClose} aria-label={t('close', lang)} className="w-10 h-10 -mr-1 rounded-full flex items-center justify-center text-gray-600 active:bg-gray-100 shrink-0"><X size={22} /></button>
                    </div>

                    {units.length > 1 && list.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100">
                            {[[true, fill(ts('custModeSame', lang), { n: units.length })], [false, ts('custModeEach', lang)]].map(([val, label]) => (
                                <button
                                    key={String(val)}
                                    onClick={() => switchMode(val)}
                                    className={`h-10 rounded-lg text-sm font-bold transition-colors ${same === val ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {list.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">{ts('noModifiersForCategory', lang)}</p>
                    ) : units.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">{ts('allSent', lang)}</p>
                    ) : same ? (
                        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-3.5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-bold text-gray-800">{fill(ts('allN', lang), { n: units.length })} × {portion}</p>
                                {shared.length > 0 && <button onClick={() => setShared([])} className="text-xs font-bold text-gray-500 px-2 py-1">{ts('custClear', lang)}</button>}
                            </div>
                            <Pills list={list} selected={shared} conflictMap={conflictMap} onToggle={n => setShared(s => toggleMod(s, n, conflictMap))} lang={lang} />
                        </div>
                    ) : (
                        units.map((u, i) => (
                            <div key={u.id} className={`rounded-2xl border-2 p-3.5 ${u.mods.length ? 'border-indigo-200' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <p className="text-sm font-bold text-gray-800">
                                        {fill(ts('custPlateNo', lang), { n: locked.length + i + 1 })}
                                        <span className="ml-2 font-semibold text-indigo-600">{u.mods.length ? u.mods.join(', ') : ''}</span>
                                    </p>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {units.length > 1 && (
                                            <button onClick={() => copyToAll(u.mods)} className="text-xs font-bold text-indigo-600 px-2 py-1 rounded-lg active:bg-indigo-50 flex items-center gap-1">
                                                <Copy size={12} /> {ts('custCopyAll', lang)}
                                            </button>
                                        )}
                                        {u.mods.length > 0 && (
                                            <button onClick={() => setUnitMods(u.id, [])} className="text-xs font-bold text-gray-500 px-2 py-1">{ts('custClear', lang)}</button>
                                        )}
                                    </div>
                                </div>
                                <Pills list={list} selected={u.mods} conflictMap={conflictMap} onToggle={n => setUnitMods(u.id, toggleMod(u.mods, n, conflictMap))} lang={lang} />
                            </div>
                        ))
                    )}

                    {locked.length > 0 && (
                        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600">
                            <p className="flex items-center gap-1.5 font-semibold text-gray-700">
                                <Lock size={14} /> {fill(ts(lockedKind === 'served' ? 'custLockedServed' : 'custLockedKitchen', lang), { n: locked.length })}
                            </p>
                            <p className="mt-1 text-xs">{summarize(locked.map(u => u.mods), lang).map(x => `${x.n} × ${x.label}`).join(' · ')}</p>
                        </div>
                    )}
                    {list.length > 0 && units.length > 0 && <p className="text-xs text-gray-400 text-center">{ts('custHint', lang)}</p>}
                </div>

                <div className="border-t p-3 space-y-2.5 bg-white">
                    {units.length > 0 && list.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-semibold text-gray-500 mr-1">{ts('custResult', lang)}:</span>
                            {summary.map(x => (
                                <span key={x.label} className={`px-2 py-1 rounded-full font-bold ${x.plain ? 'bg-gray-100 text-gray-700' : 'bg-indigo-50 text-indigo-700'}`}>{x.n} × {x.label}</span>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={onClose} className="h-12 rounded-xl bg-gray-100 text-gray-800 font-bold active:bg-gray-200">{ts('custCancel', lang)}</button>
                        <button
                            onClick={save}
                            disabled={list.length === 0 || units.length === 0 || !changed}
                            className="col-span-2 h-12 rounded-xl bg-indigo-600 text-white font-bold active:bg-indigo-700 disabled:opacity-40"
                        >
                            {ts('saveCustomizations', lang)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

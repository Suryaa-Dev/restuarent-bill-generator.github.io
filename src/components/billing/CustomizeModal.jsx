import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../i18n/translations';
import { ts } from '../../i18n/serveExtra';
import { buildConflictMap, isBlocked, toggleMod, modifiersForCategory } from '../../lib/modifiers';

/* Long-press a cart item -> customise its portions (preparation instructions only, never a price).

   "3 Half Manchurian" is shown as three separate portions, each with its own modifier pills.
   "Apply same customization to all" gives one set of pills that is applied to every portion.
   Portions already sent to the kitchen are locked (change them with Update Token).           */

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

function Pills({ list, selected, conflictMap, onToggle, lang }) {
    return (
        <div className="flex flex-wrap gap-2.5">
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
                        className={`h-12 px-5 rounded-full border-2 text-base font-bold transition-colors ${on
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow'
                            : blocked
                                ? 'bg-gray-100 border-gray-200 text-gray-300 line-through'
                                : 'bg-white border-gray-300 text-gray-800 active:bg-indigo-50'}`}
                    >
                        {m.name}
                    </button>
                );
            })}
        </div>
    );
}

export default function CustomizeModal({ line, locked, initialUnits, modifiers, lang, onSave, onClose }) {
    const list = useMemo(() => modifiersForCategory(modifiers, line.category), [modifiers, line.category]);
    const conflictMap = useMemo(() => buildConflictMap(modifiers), [modifiers]);

    const [units, setUnits] = useState(initialUnits);        // [{ id, mods }] — the portions that can still change
    const [same, setSame] = useState(false);                  // one selection for every portion
    const [shared, setShared] = useState([]);

    const total = locked.length + units.length;
    const portion = translatePortion(line.portion, lang);
    const name = translateItemName(line.name, lang);

    const setUnitMods = (id, mods) => setUnits(us => us.map(u => (u.id === id ? { ...u, mods } : u)));

    const switchSame = (on) => {
        if (on) {
            // start from what all portions already have in common (nothing, if they differ)
            const first = units[0]?.mods || [];
            const allEqual = units.every(u => u.mods.length === first.length && u.mods.every(m => first.includes(m)));
            setShared(allEqual ? [...first] : []);
        } else {
            setUnits(us => us.map(u => ({ ...u, mods: [...shared] })));
        }
        setSame(on);
    };

    const save = () => onSave(same ? units.map(u => ({ ...u, mods: [...shared] })) : units);

    return (
        <div className="fixed inset-0 bg-black/60 z-[85] flex items-end md:items-center justify-center" onClick={onClose}>
            <div className="bg-white w-full md:w-[32rem] h-[90vh] md:h-[85vh] rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* title + quantities (kept small: the pills are the focus) */}
                <div className="px-4 pt-4 pb-3 border-b">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-bold truncate">{fill(ts('customizeTitle', lang), { name })}</h2>
                        <button onClick={onClose} aria-label={t('close', lang)} className="p-1 shrink-0"><X size={24} /></button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">{fill(ts(total === 1 ? 'plate1' : 'plateN', lang), { n: total, portion })}</span>
                        <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">{fill(ts(total === 1 ? 'item1' : 'itemN', lang), { n: total })}</span>
                        {locked.length > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{fill(ts('alreadySent', lang), { n: locked.length })}</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {list.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">{ts('noModifiersForCategory', lang)}</p>
                    ) : units.length === 0 ? (
                        <p className="text-center text-gray-500 py-12">{ts('allSent', lang)}</p>
                    ) : (
                        <>
                            {units.length > 1 && (
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={same}
                                    onClick={() => switchSame(!same)}
                                    className={`w-full flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors ${same ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <span className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${same ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${same ? 'translate-x-5' : ''}`} />
                                    </span>
                                    <span className="font-semibold text-gray-900 text-sm">{fill(ts('applyAll', lang), { n: units.length })}</span>
                                </button>
                            )}

                            {same ? (
                                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-3.5">
                                    <p className="text-sm font-bold text-gray-800 mb-3">{name} · {fill(ts('allN', lang), { n: units.length })} × {portion}</p>
                                    <Pills list={list} selected={shared} conflictMap={conflictMap} onToggle={n => setShared(s => toggleMod(s, n, conflictMap))} lang={lang} />
                                </div>
                            ) : (
                                units.map((u) => (
                                    <div key={u.id} className="rounded-2xl border-2 border-gray-200 p-3.5">
                                        <p className="text-sm font-bold text-gray-800 mb-3">{name} · 1 × {portion}</p>
                                        <Pills list={list} selected={u.mods} conflictMap={conflictMap} onToggle={n => setUnitMods(u.id, toggleMod(u.mods, n, conflictMap))} lang={lang} />
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                <div className="border-t p-3">
                    <button
                        onClick={save}
                        disabled={list.length === 0 || units.length === 0}
                        className="w-full h-14 rounded-xl bg-indigo-600 text-white text-base font-bold active:bg-indigo-700 disabled:opacity-40"
                    >
                        {ts('saveCustomizations', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
}

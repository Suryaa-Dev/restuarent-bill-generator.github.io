import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, ChevronsUp, X, Plus, Search, Star, Trash2 } from 'lucide-react';
import { t, translateCategory, translateItemName } from '../../i18n/translations';
import { tf } from '../../i18n/favExtra';
import { isFavEligible, moveItem, resolveFavorites } from '../../lib/favorites';

/* Settings -> Favourites. Pick the dishes of the Fav tab and set their order.
   `ids` is the saved ordered list; every change calls onChange(newIds) (the app saves it). */
export default function FavoritesManager({ lang, items, ids, onChange, syncError, onClose }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState(null);

    const eligible = useMemo(() => items.filter(isFavEligible), [items]);
    const favs = useMemo(() => resolveFavorites(ids, items), [ids, items]);
    const favIds = useMemo(() => new Set(favs.map(i => i.id)), [favs]);
    const categories = useMemo(() => [...new Set(eligible.map(i => i.category))], [eligible]);

    const candidates = useMemo(() => {
        const q = query.trim().toLowerCase();
        return eligible.filter(i =>
            !favIds.has(i.id)
            && (!category || i.category === category)
            && (!q || i.name.toLowerCase().includes(q) || (i.nameMr || '').toLowerCase().includes(q))
        );
    }, [eligible, favIds, category, query]);

    const emit = (list) => onChange(list.map(i => i.id));
    const move = (from, to) => emit(moveItem(favs, from, to));
    const remove = (idx) => emit(favs.filter((_, i) => i !== idx));
    const add = (item) => emit([...favs, item]);
    const clearAll = () => { if (window.confirm(tf('favClearConfirm', lang))) onChange([]); };

    const iconBtn = 'w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-700 active:bg-gray-200 disabled:opacity-25';

    return (
        <div className="fixed inset-0 z-50 bg-gray-100 overflow-y-auto">
            <header className="sticky top-0 z-10 bg-orange-500 text-white shadow-lg">
                <div className="max-w-2xl mx-auto flex items-center gap-3 px-3 py-3">
                    <button onClick={onClose} aria-label={t('close', lang)} className="bg-orange-600 p-2 rounded-full active:bg-orange-700">
                        <ArrowLeft size={22} />
                    </button>
                    <h1 className="text-xl font-bold flex-1">{tf('favTitle', lang)}</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-16">
                {syncError && (
                    <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{tf('favSyncErr', lang)}</p>
                )}

                {/* current favourites, in order */}
                <section>
                    <div className="flex items-center justify-between px-1 mb-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">{tf('favYour', lang)} ({favs.length})</h2>
                        {favs.length > 0 && (
                            <button onClick={clearAll} className="text-xs font-bold text-red-600 flex items-center gap-1 active:opacity-60">
                                <Trash2 size={13} /> {tf('favClear', lang)}
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        {favs.length === 0 && (
                            <div className="p-6 text-center text-gray-400 text-sm">
                                <Star size={28} className="mx-auto mb-2 opacity-50" />
                                {tf('favEmpty', lang)}
                            </div>
                        )}
                        {favs.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2 p-3">
                                <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{translateItemName(item.name, lang)}</p>
                                    <p className="text-xs text-gray-500 truncate">{translateCategory(item.category, lang)}</p>
                                </div>
                                <button onClick={() => move(idx, 0)} disabled={idx === 0} aria-label={tf('favTop', lang)} className={iconBtn}><ChevronsUp size={18} /></button>
                                <button onClick={() => move(idx, idx - 1)} disabled={idx === 0} aria-label={tf('favUp', lang)} className={iconBtn}><ChevronUp size={18} /></button>
                                <button onClick={() => move(idx, idx + 1)} disabled={idx === favs.length - 1} aria-label={tf('favDown', lang)} className={iconBtn}><ChevronDown size={18} /></button>
                                <button onClick={() => remove(idx)} aria-label={tf('favRemove', lang)} className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-600 active:bg-red-100"><X size={18} /></button>
                            </div>
                        ))}
                    </div>
                    {favs.length > 0 && <p className="text-xs text-gray-500 mt-2 px-1">{tf('favSaved', lang)}</p>}
                </section>

                {/* add more */}
                <section>
                    <h2 className="px-1 mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{tf('favAddHeading', lang)}</h2>

                    <div className="relative mb-3">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={tf('favSearch', lang)}
                            className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-300 bg-white outline-none focus:border-orange-400"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-3">
                        <button onClick={() => setCategory(null)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${category === null ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>{tf('favAll', lang)}</button>
                        {categories.map(c => (
                            <button key={c} onClick={() => setCategory(c)} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium ${category === c ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}>{translateCategory(c, lang)}</button>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                        {candidates.length === 0 && <p className="p-6 text-center text-gray-400 text-sm">{tf('favNoMatch', lang)}</p>}
                        {candidates.map(item => (
                            <div key={item.id} className="flex items-center gap-3 p-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{translateItemName(item.name, lang)}</p>
                                    <p className="text-xs text-gray-500 truncate">{translateCategory(item.category, lang)}{item.options?.[0] ? ` · ₹${item.options[0].price}` : ''}</p>
                                </div>
                                <button onClick={() => add(item)} className="h-10 px-4 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center gap-1 active:bg-orange-600">
                                    <Plus size={16} /> {tf('favAdd', lang)}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

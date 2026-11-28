import React, { useMemo, useState } from 'react';
import { X, Plus, ChevronLeft, ChevronRight, Trash2, Loader2, SlidersHorizontal } from 'lucide-react';
import { ts } from '../../../i18n/serveExtra';
import { t, translateCategory } from '../../../i18n/translations';
import { saveModifier, deleteModifier } from '../../../services/modifiersService';

/* Settings -> Modifiers.
   A modifier is a reusable preparation instruction (Spicy, Crispy, Extra Gravy ...) that applies
   to one or more menu categories and can be marked as conflicting with other modifiers. It never
   changes a bill amount.                                                                    */

const Chip = ({ on, onClick, children, tone = 'indigo', disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={on}
        className={`px-3.5 h-10 rounded-full border-2 text-sm font-semibold transition-colors disabled:opacity-40 ${on
            ? (tone === 'red' ? 'bg-red-500 border-red-500 text-white' : 'bg-indigo-600 border-indigo-600 text-white')
            : 'bg-white border-gray-300 text-gray-700 active:bg-gray-100'}`}
    >
        {children}
    </button>
);

function Editor({ lang, modifier, all, categories, onBack, onSaved }) {
    const isNew = !modifier;
    const [name, setName] = useState(modifier?.name || '');
    const [cats, setCats] = useState(modifier?.categories || []);
    // conflicts are two-way, so also show the ones that were set up from the other side
    const [conflicts, setConflicts] = useState(() => {
        if (!modifier) return [];
        const set = new Set(modifier.conflicts);
        all.forEach(m => { if (m.conflicts.includes(modifier.id)) set.add(m.id); });
        return [...set];
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const others = all.filter(m => m.id !== modifier?.id);

    const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

    const save = async () => {
        if (!name.trim()) return setError(ts('modNameRequired', lang));
        if (cats.length === 0) return setError(ts('modCategoryRequired', lang));
        setBusy(true);
        setError('');
        try {
            await saveModifier({ id: modifier?.id, name, categories: cats, conflicts }, all);
            onSaved();
        } catch (err) {
            console.error(err);
            setError(err?.code === '23505' ? ts('modNameTaken', lang) : t('saveFailed', lang));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm(ts('modDeleteConfirm', lang))) return;
        setBusy(true);
        try {
            await deleteModifier(modifier.id, all);
            onSaved();
        } catch (err) {
            console.error(err);
            setError(t('saveFailed', lang));
            setBusy(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-2 p-4 border-b">
                <button onClick={onBack} aria-label={t('close', lang)} className="p-1 -ml-1"><ChevronLeft size={24} /></button>
                <h2 className="text-lg font-bold flex-1">{isNew ? ts('addModifier', lang) : ts('editModifier', lang)}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <label className="block">
                    <span className="text-sm font-semibold text-gray-700">{ts('modName', lang)}</span>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Spicy"
                        className="mt-1 w-full h-12 border border-gray-300 rounded-xl px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </label>

                <div>
                    <p className="text-sm font-semibold text-gray-700">{ts('modCategories', lang)}</p>
                    <p className="text-xs text-gray-500 mb-2">{ts('modCategoriesHint', lang)}</p>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                            <Chip key={c} on={cats.includes(c)} onClick={() => toggle(cats, setCats, c)}>{translateCategory(c, lang)}</Chip>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-sm font-semibold text-gray-700">{ts('modConflicts', lang)}</p>
                    <p className="text-xs text-gray-500 mb-2">{ts('modConflictsHint', lang)}</p>
                    {others.length === 0 ? (
                        <p className="text-sm text-gray-400">{ts('modNoOthers', lang)}</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {others.map(m => (
                                <Chip key={m.id} tone="red" on={conflicts.includes(m.id)} onClick={() => toggle(conflicts, setConflicts, m.id)}>{m.name}</Chip>
                            ))}
                        </div>
                    )}
                </div>

                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            </div>

            <div className="border-t p-3 flex gap-2">
                {!isNew && (
                    <button onClick={remove} disabled={busy} aria-label={ts('modDelete', lang)} className="w-14 h-12 rounded-xl border border-red-200 text-red-600 flex items-center justify-center active:bg-red-50 disabled:opacity-50">
                        <Trash2 size={20} />
                    </button>
                )}
                <button onClick={save} disabled={busy} className="flex-1 h-12 rounded-xl bg-indigo-600 text-white font-bold active:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                    {busy && <Loader2 size={18} className="animate-spin" />} {t('save', lang)}
                </button>
            </div>
        </>
    );
}

export default function ModifierManager({ lang, modifiers, categories, onChanged, onClose }) {
    const [editing, setEditing] = useState(null); // null | 'new' | modifier
    const byId = useMemo(() => new Map(modifiers.map(m => [m.id, m])), [modifiers]);

    // two-way view of conflicts for the list
    const conflictNames = (m) => {
        const set = new Set(m.conflicts.map(id => byId.get(id)?.name).filter(Boolean));
        modifiers.forEach(o => { if (o.conflicts.includes(m.id)) set.add(o.name); });
        return [...set];
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[34rem] h-[94vh] md:h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                {editing ? (
                    <Editor
                        key={editing === 'new' ? 'new' : editing.id}
                        lang={lang}
                        modifier={editing === 'new' ? null : editing}
                        all={modifiers}
                        categories={categories}
                        onBack={() => setEditing(null)}
                        onSaved={async () => { await onChanged(); setEditing(null); }}
                    />
                ) : (
                    <>
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold flex items-center gap-2"><SlidersHorizontal size={20} /> {ts('modifiers', lang)}</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditing('new')} className="h-10 px-4 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center gap-1 active:bg-indigo-700">
                                    <Plus size={18} /> {t('add', lang)}
                                </button>
                                <button onClick={onClose} aria-label={t('close', lang)} className="p-1"><X size={24} /></button>
                            </div>
                        </div>

                        <p className="px-4 pt-3 text-xs text-gray-500">{ts('modIntro', lang)}</p>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {modifiers.length === 0 && <p className="text-center text-gray-400 py-12">{ts('modNone', lang)}</p>}
                            {modifiers.map(m => {
                                const conflicts = conflictNames(m);
                                return (
                                    <button key={m.id} onClick={() => setEditing(m)} className="w-full text-left rounded-xl border border-gray-200 p-3 flex items-center gap-3 active:bg-gray-50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900">{m.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{m.categories.map(c => translateCategory(c, lang)).join(' · ') || '—'}</p>
                                            {conflicts.length > 0 && (
                                                <p className="text-xs font-semibold text-red-600 mt-0.5 truncate">✕ {conflicts.join(', ')}</p>
                                            )}
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

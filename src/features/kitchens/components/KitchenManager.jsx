import React, { useMemo, useState } from 'react';
import { X, Plus, ChevronRight, Check, ChefHat, Loader2, AlertTriangle } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { createKitchen } from '../../../services/kitchensService';
import AddDishesScreen from './AddDishesScreen';
import KdsLayoutScreen from './KdsLayoutScreen';
import KitchenDishesScreen from './KitchenDishesScreen';
import KitchenOverview, { hasLayout } from './KitchenOverview';
import { inputCls } from './kitchenUi';

/* Settings -> Kitchen settings.

   Kitchens (this screen: list + add)
     └─ one kitchen (KitchenOverview)
          ├─ Dishes (KitchenDishesScreen) ─ Add dishes (AddDishesScreen)
          ├─ Kitchen screen layout (KdsLayoutScreen)
          └─ Kitchen details: rename / delete */

const nameTaken = (kitchens, name) =>
    kitchens.some(k => k.name.trim().toLowerCase() === name.trim().toLowerCase());
const isUniqueViolation = (err) => err?.code === '23505';

export default function KitchenManager({ lang, kitchens, onKitchensChange, items, onItemsChange, loadError, onClose }) {
    const [screen, setScreen] = useState({ name: 'list' }); // list | kitchen | dishes | add | layout
    const [adding, setAdding] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const counts = useMemo(() => {
        const m = {};
        items.forEach(i => { if (i.kitchenId) m[i.kitchenId] = (m[i.kitchenId] || 0) + 1; });
        return m;
    }, [items]);
    const unassigned = items.filter(i => !i.kitchenId).length;

    const startAdding = () => {
        setNameDraft(`Kitchen ${kitchens.length + 1}`);
        setError('');
        setAdding(true);
    };

    const handleCreate = async () => {
        const name = nameDraft.trim();
        if (!name) { setError(t('kitchenNameEmpty', lang)); return; }
        if (nameTaken(kitchens, name)) { setError(t('kitchenNameTaken', lang)); return; }
        setSaving(true);
        setError('');
        try {
            const nextSort = (kitchens.reduce((m, k) => Math.max(m, k.sortOrder), 0) || 0) + 10;
            const created = await createKitchen(name, nextSort);
            onKitchensChange([...kitchens, created]);
            setAdding(false);
            setScreen({ name: 'kitchen', id: created.id });
        } catch (e) {
            console.error(e);
            setError(isUniqueViolation(e) ? t('kitchenNameTaken', lang) : t('saveFailed', lang));
        } finally {
            setSaving(false);
        }
    };

    const current = screen.id ? kitchens.find(k => k.id === screen.id) : null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:w-[34rem] h-[94vh] md:h-[90vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden">
                {screen.name === 'layout' && current ? (
                    <KdsLayoutScreen
                        lang={lang}
                        kitchen={current}
                        items={items}
                        onSaved={(updated) => onKitchensChange(kitchens.map(k => (k.id === updated.id ? updated : k)))}
                        onBack={() => setScreen({ name: 'kitchen', id: current.id })}
                    />
                ) : screen.name === 'add' && current ? (
                    <AddDishesScreen
                        lang={lang}
                        kitchen={current}
                        kitchens={kitchens}
                        items={items}
                        onAssigned={(ids) => {
                            const set = new Set(ids);
                            onItemsChange(items.map(i => (set.has(i.id) ? { ...i, kitchenId: current.id } : i)));
                        }}
                        onBack={() => setScreen({ name: 'dishes', id: current.id })}
                    />
                ) : screen.name === 'dishes' && current ? (
                    <KitchenDishesScreen
                        lang={lang}
                        kitchen={current}
                        items={items}
                        onItemsChange={onItemsChange}
                        onAddDishes={() => setScreen({ name: 'add', id: current.id })}
                        onBack={() => setScreen({ name: 'kitchen', id: current.id })}
                    />
                ) : screen.name === 'kitchen' && current ? (
                    <KitchenOverview
                        key={current.id}
                        lang={lang}
                        kitchen={current}
                        kitchens={kitchens}
                        items={items}
                        onKitchensChange={onKitchensChange}
                        onItemsChange={onItemsChange}
                        onOpenDishes={() => setScreen({ name: 'dishes', id: current.id })}
                        onOpenLayout={() => setScreen({ name: 'layout', id: current.id })}
                        onBack={() => setScreen({ name: 'list' })}
                    />
                ) : (
                    <>
                        <div className="flex justify-between items-center p-4 border-b">
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold flex items-center gap-2"><ChefHat size={20} /> {ta('kTitle', lang)}</h2>
                                <p className="text-xs text-gray-500">{ta('kListNote', lang)}</p>
                            </div>
                            <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>
                        </div>

                        {loadError && (
                            <p className="mx-4 mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{t('kitchenSetupNeeded', lang)}</p>
                        )}

                        <div className="p-4 border-b space-y-3">
                            {adding ? (
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-500">{t('kitchenName', lang)}</label>
                                    <div className="flex gap-2">
                                        <input
                                            autoFocus
                                            value={nameDraft}
                                            onChange={(e) => setNameDraft(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                            className={inputCls}
                                        />
                                        <button onClick={handleCreate} disabled={saving} className="px-4 rounded-lg bg-green-600 text-white font-bold disabled:opacity-60 flex items-center">
                                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} />}
                                        </button>
                                        <button onClick={() => { setAdding(false); setError(''); }} className="px-3 rounded-lg bg-gray-100 text-gray-600" aria-label={t('cancel', lang)}><X size={18} /></button>
                                    </div>
                                    {error && <p className="text-sm text-red-600">{error}</p>}
                                </div>
                            ) : (
                                <button
                                    onClick={startAdding}
                                    className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center justify-center gap-2 active:bg-orange-600"
                                >
                                    <Plus size={18} /> {t('addKitchen', lang)}
                                </button>
                            )}

                            {kitchens.length > 0 && unassigned > 0 && (
                                <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    <span>{ta('kUnassigned', lang).replace('{n}', unassigned)}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {kitchens.length === 0 ? (
                                <div className="text-center text-gray-400 py-12 px-6">
                                    <ChefHat size={44} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{t('noKitchensYet', lang)}</p>
                                </div>
                            ) : (
                                kitchens.map(k => (
                                    <button
                                        key={k.id}
                                        onClick={() => setScreen({ name: 'kitchen', id: k.id })}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white active:bg-gray-50 text-left"
                                    >
                                        <span className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><ChefHat size={22} /></span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block font-bold text-gray-800 truncate">{k.name}</span>
                                            <span className="block text-xs text-gray-500">
                                                {counts[k.id] || 0} {ta((counts[k.id] || 0) === 1 ? 'kDishOne' : 'kDishWord', lang)}
                                                <span className="mx-1">·</span>
                                                {ta(hasLayout(k) ? 'kLayoutSet' : 'kLayoutDefault', lang)}
                                            </span>
                                        </span>
                                        <ChevronRight size={18} className="text-gray-300 shrink-0" />
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

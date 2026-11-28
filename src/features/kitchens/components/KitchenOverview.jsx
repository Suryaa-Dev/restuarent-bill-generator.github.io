import React, { useState } from 'react';
import { Check, LayoutDashboard, Pencil, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { deleteKitchen, renameKitchen } from '../../../services/kitchensService';
import { normalizeConfig } from '../../kds/utils/kds';
import { NavCard, ScreenHeader, inputCls } from './kitchenUi';

const nameTaken = (kitchens, name, exceptId) =>
    kitchens.some(k => k.id !== exceptId && k.name.trim().toLowerCase() === name.trim().toLowerCase());
const isUniqueViolation = (err) => err?.code === '23505';

// true once the owner has chosen anything for this kitchen's screen
export const hasLayout = (kitchen) => {
    const cfg = normalizeConfig(kitchen.kdsConfig);
    return cfg.featured.length > 0 || cfg.groups.length > 0;
};

/* Kitchens -> (one kitchen). Everything about this kitchen in three clear parts:
   1. Dishes            — which menu items are cooked here (their orders go to this kitchen's screen)
   2. Kitchen screen    — how this kitchen's display (KDS) is laid out
   3. Kitchen details   — rename / delete */
export default function KitchenOverview({ lang, kitchen, kitchens, items, onKitchensChange, onItemsChange, onOpenDishes, onOpenLayout, onBack }) {
    const [renaming, setRenaming] = useState(false);
    const [nameDraft, setNameDraft] = useState(kitchen.name);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const dishCount = items.filter(i => i.kitchenId === kitchen.id).length;
    const layoutDone = hasLayout(kitchen);

    const handleRename = async () => {
        const name = nameDraft.trim();
        if (!name) { setError(t('kitchenNameEmpty', lang)); return; }
        if (name === kitchen.name) { setRenaming(false); return; }
        if (nameTaken(kitchens, name, kitchen.id)) { setError(t('kitchenNameTaken', lang)); return; }
        setBusy(true);
        setError('');
        try {
            const saved = await renameKitchen(kitchen.id, name);
            onKitchensChange(kitchens.map(k => (k.id === saved.id ? saved : k)));
            setRenaming(false);
        } catch (e) {
            console.error(e);
            setError(isUniqueViolation(e) ? t('kitchenNameTaken', lang) : t('saveFailed', lang));
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(t('confirmDeleteKitchen', lang))) return;
        setBusy(true);
        setError('');
        try {
            await deleteKitchen(kitchen.id);
            onItemsChange(items.map(i => (i.kitchenId === kitchen.id ? { ...i, kitchenId: null } : i)));
            onKitchensChange(kitchens.filter(k => k.id !== kitchen.id));
            onBack();
        } catch (e) {
            console.error(e);
            setError(t('saveFailed', lang));
            setBusy(false);
        }
    };

    return (
        <>
            <ScreenHeader lang={lang} onBack={onBack} trail={[ta('kTitle', lang)]} title={kitchen.name} />

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <section className="space-y-2">
                    <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-gray-500">{ta('kSecCooks', lang)}</h3>
                    <NavCard
                        icon={UtensilsCrossed}
                        tint="bg-orange-50 text-orange-600"
                        title={ta('kDishesTitle', lang)}
                        desc={`${dishCount} ${ta(dishCount === 1 ? 'kDishOne' : 'kDishWord', lang)} · ${ta('kDishesRowDesc', lang)}`}
                        onClick={onOpenDishes}
                    />
                </section>

                <section className="space-y-2">
                    <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-gray-500">{ta('kSecScreen', lang)}</h3>
                    <NavCard
                        icon={LayoutDashboard}
                        tint="bg-indigo-50 text-indigo-600"
                        title={ta('kLayoutTitle', lang)}
                        desc={ta('kLayoutRowDesc', lang)}
                        chip={(
                            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${layoutDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {ta(layoutDone ? 'kLayoutSet' : 'kLayoutDefault', lang)}
                            </span>
                        )}
                        onClick={onOpenLayout}
                    />
                </section>

                <section className="space-y-2">
                    <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-gray-500">{ta('kSecDetails', lang)}</h3>
                    <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                        <div className="p-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-500">{t('kitchenName', lang)}</p>
                            {renaming ? (
                                <div className="flex gap-2">
                                    <input
                                        autoFocus
                                        value={nameDraft}
                                        onChange={(e) => setNameDraft(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                        className={`${inputCls} !py-2 min-w-0`}
                                    />
                                    <button onClick={handleRename} disabled={busy} className="px-3 rounded-lg bg-green-600 text-white" aria-label={t('save', lang)}><Check size={18} /></button>
                                    <button onClick={() => { setRenaming(false); setNameDraft(kitchen.name); setError(''); }} className="px-3 rounded-lg bg-gray-100 text-gray-600" aria-label={t('cancel', lang)}><X size={18} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <p className="flex-1 font-bold text-gray-900 truncate">{kitchen.name}</p>
                                    <button onClick={() => setRenaming(true)} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold flex items-center gap-1.5">
                                        <Pencil size={15} /> {t('renameKitchen', lang)}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-4 space-y-2">
                            <button onClick={handleDelete} disabled={busy} className="w-full h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                                <Trash2 size={16} /> {t('deleteKitchen', lang)}
                            </button>
                            <p className="text-xs text-gray-500">{ta('kDeleteNote', lang)}</p>
                        </div>
                    </div>
                </section>

                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
            </div>
        </>
    );
}

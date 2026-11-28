import React from 'react';
import { ChevronLeft, ChevronRight, UtensilsCrossed, X } from 'lucide-react';
import { t } from '../../../i18n/translations';

// Shared pieces of the Kitchen settings screens.

export const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-400';

export const Thumb = ({ src }) =>
    src ? (
        <img src={src} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 bg-gray-100" />
    ) : (
        <div className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <UtensilsCrossed size={16} className="text-orange-300" />
        </div>
    );

// Back arrow (or close) + a small "where am I" trail above the title, e.g.  Kitchens › Main kitchen
export function ScreenHeader({ lang, title, trail = [], onBack, onClose, actions }) {
    return (
        <div className="flex items-center gap-2 p-4 border-b">
            {onBack && <button onClick={onBack} className="p-1 -ml-1" aria-label={t('cancel', lang)}><ChevronLeft size={24} /></button>}
            <div className="min-w-0 flex-1">
                {trail.length > 0 && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                        {trail.map((part, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <ChevronRight size={12} className="shrink-0 text-gray-300" />}
                                <span className="truncate">{part}</span>
                            </React.Fragment>
                        ))}
                    </p>
                )}
                <h2 className="text-lg font-bold truncate">{title}</h2>
            </div>
            {actions}
            {onClose && <button onClick={onClose} aria-label={t('close', lang)}><X size={24} /></button>}
        </div>
    );
}

// one tappable row of the kitchen overview: icon, title, explanation, optional status chip
export function NavCard({ icon: Icon, tint, title, desc, chip, onClick }) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 p-4 text-left rounded-2xl border border-gray-200 bg-white active:bg-gray-50">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tint}`}><Icon size={22} /></span>
            <span className="flex-1 min-w-0">
                <span className="block font-bold text-gray-900">{title}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
                {chip && <span className="block mt-1.5">{chip}</span>}
            </span>
            <ChevronRight size={18} className="text-gray-300 shrink-0" />
        </button>
    );
}

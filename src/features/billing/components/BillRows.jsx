import React from 'react';
import { ShoppingBag, ClipboardList } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { ts } from '../../../i18n/serveExtra';

// thin purple "Parcel" divider shown between the dine-in and parcel lists (only when both exist)
export const ParcelDivider = ({ lang }) => (
    <div className="flex items-center gap-2 mt-3 px-2 py-1 rounded-lg bg-purple-50 text-purple-700">
        <ShoppingBag size={14} />
        <span className="text-xs font-bold">{t('parcel', lang)}</span>
    </div>
);

// Normal mode: one list, exactly as before. Kitchen mode: dine-in lines first, then the
// Parcel divider, then parcel lines. `idx` is always the line's real position in the bill.
export const renderBillRows = (bill, kitchen, lang, renderLine) => {
    if (!kitchen) return bill.map((item, idx) => renderLine(item, idx, idx + 1));
    const dine = [];
    const parcel = [];
    bill.forEach((item, idx) => (item.isParcel ? parcel : dine).push({ item, idx }));
    let n = 0;
    return [
        ...dine.map(({ item, idx }) => renderLine(item, idx, ++n)),
        ...(dine.length > 0 && parcel.length > 0 ? [<ParcelDivider key="__parcel" lang={lang} />] : []),
        ...parcel.map(({ item, idx }) => renderLine(item, idx, ++n)),
    ];
};

// shown on the Tokens view after "−" was refused on a line that is already with the kitchen
export const SentNotice = ({ lang }) => (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
        <ClipboardList size={18} className="mt-0.5 shrink-0" />
        <span>{ts('sentBlocked', lang)}</span>
    </div>
);

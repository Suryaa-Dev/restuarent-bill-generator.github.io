import React, { useState } from 'react';
import { Plus, Minus, ShoppingBag, ClipboardList } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { FULL_ACCESS } from '../utils/billingPermissions';
import { useLongPress } from '../../../shared/hooks/useLongPress';
import { mergeLines, pickPlusIndex, pickMinusIndex } from '../utils/customize';
import { computeSentQty } from '../../kitchens/utils/kitchenLogic';
import TokensPanel from './tokens/TokensPanel';
import { renderBillRows, SentNotice } from './BillRows';

// fixed bill section on desktop
// fixed bill panel on desktop. `perms` hides / disables what the logged-in user may not do.
const BillSection = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, onShowQr, isParcel, onToggleParcel, kitchen, onCustomizeLine, onAddUnit, perms = FULL_ACCESS, lang }) => {
    const press = useLongPress();
    const rows = mergeLines(currentBill);
    const sentNow = () => computeSentQty((kitchen?.tokens || []).filter(tk => tk.status === 'active'));
    const plusRow = (row) => {
        const i = pickPlusIndex(currentBill, row);
        if (i >= 0) onChangeQuantity(i, currentBill[i].qty + 1);
        else onAddUnit?.(row.idxs[0]);
    };
    const [view, setView] = useState('bill'); // 'bill' | 'tokens' (Kitchen System mode only)
    const [notice, setNotice] = useState(false);
    const showTokens = !!kitchen && view === 'tokens';
    const minus = async (idx, qty) => {
        const r = await onChangeQuantity(idx, qty);
        if (r === 'blocked' && kitchen) { setView('tokens'); setNotice(true); }
    };
    const canSend = !!kitchen && kitchen.unsentCount > 0 && !kitchen.sending && !!selectedTable;

    return (
        <div className="hidden md:flex w-[25%] bg-white p-4 flex-col border-l border-gray-400 bill-section-fixed">

            {/* current table info */}
            <h3 className="text-center text-xl font-bold text-gray-700 mb-3">
                {selectedTable ? `${t('billFor', lang)} ${selectedTable}` : t('billSelectTable', lang)}
            </h3>

            {/* scrollable bill items (or token cards) */}
            <div className="bill-scroll-area mb-3 overflow-y-auto">
                {showTokens && notice && <SentNotice lang={lang} />}
                {showTokens ? (
                    <TokensPanel
                        tokens={kitchen.tokens}
                        kitchens={kitchen.kitchens}
                        lang={lang}
                        onToggleServed={kitchen.onToggleServed}
                        onCancel={kitchen.onCancel}
                        onUpdate={kitchen.onUpdate}
                        onEditServed={kitchen.onEditServed}
                    />
                ) : renderBillRows(rows, kitchen, lang, (item, idx, num) => {
                    return (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-300">
                            <span
                                className={`flex-1 text-gray-800 ${onCustomizeLine ? 'select-none' : ''}`}
                                {...(onCustomizeLine ? press(() => onCustomizeLine(item.idxs[0])) : {})}
                            >
                                <span className="text-gray-400 mr-1">{num}.</span>
                                {translateItemName(item.name, lang)} ({translatePortion(item.portion, lang)})
                                <span className="block text-xs text-orange-600 font-medium">
                                    ₹{item.price} {t('each', lang)}
                                </span>
                            </span>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { const i = pickMinusIndex(currentBill, item, sentNow()); minus(i, currentBill[i].qty - 1); }}
                                    disabled={!perms.reduce}
                                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 disabled:opacity-30"
                                >
                                    <Minus size={14} />
                                </button>

                                <span className="w-6 text-center font-bold">
                                    {item.qty}
                                </span>

                                <button
                                    onClick={() => plusRow(item)}
                                    disabled={!perms.add}
                                    className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 disabled:opacity-30"
                                >
                                    <Plus size={14} />
                                </button>

                                <span className="min-w-15 text-right font-bold text-gray-800">
                                    ₹{item.price * item.qty}
                                </span>
                            </div>

                        </div>
                    );
                })}
            </div>

            {/* total + actions pinned at bottom */}
            <div className="bill-buttons bg-white pt-2 pb-2 shadow-[0_-2px_8px_rgba(0,0,0,0.1)] sticky bottom-0 z-10">
                <div className={kitchen ? 'grid grid-cols-2 gap-2 mb-2' : ''}>
                    <button
                        onClick={onToggleParcel}
                        disabled={(currentBill.length === 0 && !kitchen) || !perms.add}
                        aria-pressed={!!isParcel}
                        className={`w-full ${kitchen ? '' : 'mb-2'} py-2 rounded-lg font-semibold border flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${isParcel
                            ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        <ShoppingBag size={18} />
                        {t('parcel', lang)}
                    </button>

                    {kitchen && (
                        <button
                            onClick={() => { setNotice(false); setView(v => (v === 'tokens' ? 'bill' : 'tokens')); }}
                            aria-pressed={showTokens}
                            className={`relative w-full py-2 rounded-lg font-semibold border flex items-center justify-center gap-2 transition-colors ${showTokens
                                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                }`}
                        >
                            <ClipboardList size={18} />
                            {t('tokens', lang)}
                            {kitchen.pendingServe > 0 && (
                                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow">
                                    {kitchen.pendingServe}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {!showTokens && (
                    <>
                        <div className="bg-gray-800 text-white text-xl font-bold p-3 rounded-lg text-center mb-3">
                            {t('total', lang)}: ₹{total}
                        </div>

                        <div className={`flex ${kitchen ? 'gap-2' : 'gap-4'}`}>
                            {perms.clear && (
                            <button
                                onClick={onClearBill}
                                className={`flex-1 min-w-0 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-800 transition-all ${kitchen ? 'text-sm' : ''}`}
                            >
                                {t('clearBill', lang)}
                            </button>
                            )}
                            {perms.print && (
                            <button
                                onClick={onPrintBill}
                                className={`flex-1 min-w-0 bg-gray-700 text-white py-2 rounded-lg font-semibold hover:bg-black transition-all ${kitchen ? 'text-sm' : ''}`}
                            >
                                {t('printBill', lang)}
                            </button>
                            )}
                            {/* UPI QR for the current bill amount: next to Print Bill, before Send Token */}
                            {perms.qr && (
                            <button
                                onClick={onShowQr}
                                disabled={total <= 0}
                                title={ta('showQr', lang)}
                                className={`flex-1 min-w-0 bg-blue-600 text-white py-2 px-1 rounded-lg font-semibold hover:bg-blue-700 transition-all truncate disabled:opacity-40 ${kitchen ? 'text-sm' : ''}`}
                            >
                                {ta('showQr', lang)}
                            </button>
                            )}

                            {kitchen && perms.send && (
                                <button
                                    onClick={kitchen.onSend}
                                    disabled={!canSend}
                                    className={`relative flex-1 min-w-0 py-2 rounded-lg font-semibold text-sm transition-all ${canSend
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-200 text-gray-400'
                                        }`}
                                >
                                    {t('sendToken', lang)}
                                    {canSend && (
                                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow">
                                            {kitchen.unsentCount}
                                        </span>
                                    )}
                                </button>
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BillSection;

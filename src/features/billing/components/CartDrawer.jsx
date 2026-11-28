import React, { useState } from 'react';
import { X, ShoppingCart, Printer, Trash2, Plus, Minus, ArrowRightLeft, ListPlus, ShoppingBag, Send, ClipboardList, Info, QrCode } from 'lucide-react';
import { t, translateItemName, translatePortion } from '../../../i18n/translations';
import { ta } from '../../../i18n/adminExtra';
import { FULL_ACCESS } from '../utils/billingPermissions';
import { ts } from '../../../i18n/serveExtra';
import { useLongPress } from '../../../shared/hooks/useLongPress';
import { mergeLines, pickPlusIndex, pickMinusIndex } from '../utils/customize';
import { computeSentQty } from '../../kitchens/utils/kitchenLogic';
import TokensPanel from './tokens/TokensPanel';
import EtaChip from './EtaChip';
import ServiceTimeModal from './tokens/ServiceTimeModal';
import { renderBillRows, SentNotice } from './BillRows';

// bottom drawer for current table bill
// `kitchen` is null in Normal mode (UI stays exactly as before). In Kitchen System mode it
// carries the token data/handlers and adds: a 4th "Tokens" tab-switch button and a
// [Clear Bill] [Print Bill] [Show QR] [Send Token] footer.
// `perms` (see utils/billingPermissions.js) hides / disables what the logged-in user may not do.
const CartDrawer = ({ selectedTable, currentBill, total, onChangeQuantity, onPrintBill, onClearBill, onShowQr, onClose, onQuickAdd, onShiftTable, isParcel, onToggleParcel, kitchen, onCustomizeLine, onAddUnit, perms = FULL_ACCESS, lang }) => {
    const press = useLongPress(); // long-press an item -> customise it
    // One row per dish as always (customised portions are merged in); +/- map back to the stored lines
    const rows = mergeLines(currentBill);
    const sentNow = () => computeSentQty((kitchen?.tokens || []).filter(tk => tk.status === 'active'));
    const plusRow = (row) => {
        const i = pickPlusIndex(currentBill, row);
        if (i >= 0) onChangeQuantity(i, currentBill[i].qty + 1);
        else onAddUnit?.(row.idxs[0]);
    };
    const minusRow = (row) => {
        const i = pickMinusIndex(currentBill, row, sentNow());
        return minus(i, currentBill[i].qty - 1);
    };
    const [view, setView] = useState('bill'); // 'bill' | 'tokens'
    const [notice, setNotice] = useState(false);
    const [showTimes, setShowTimes] = useState(false); // service-time proof (Kitchen mode)
    const showTokens = !!kitchen && view === 'tokens';
    // "−" on a line already sent to the kitchen is refused: jump to the tokens to cancel / update it
    const minus = async (idx, qty) => {
        const r = await onChangeQuantity(idx, qty);
        if (r === 'blocked' && kitchen) { setView('tokens'); setNotice(true); }
    };
    const canSend = !!kitchen && kitchen.unsentCount > 0 && !kitchen.sending && !!selectedTable;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col ${kitchen ? 'h-[85vh]' : ''}`}>
                {/* Title + close kept on their own row, away from the action buttons
                    below, so closing the drawer is never at risk of a mis-tap. */}
                <div className="flex justify-between items-center px-4 pt-4 pb-2 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-xl font-bold truncate">
                            {selectedTable ? `${t('tableLabel', lang)} ${selectedTable}` : t('cart', lang)}
                        </h2>
                        {kitchen && selectedTable && (
                            <button
                                onClick={() => setShowTimes(true)}
                                aria-label={ts('serviceTimes', lang)}
                                className="p-1.5 rounded-full bg-blue-50 text-blue-600 active:bg-blue-100 shrink-0"
                            >
                                <Info size={18} />
                            </button>
                        )}
                        {kitchen && <EtaChip eta={kitchen.eta} lang={lang} />}
                    </div>
                    <button onClick={onClose} className="p-1 -mr-1 shrink-0" aria-label={t('close', lang)}>
                        <X size={24} />
                    </button>
                </div>

                {/* Action row: add more items / shift table / parcel / (kitchen mode) tokens.
                    Parcel is a toggle: white while off, purple once this order is marked as a parcel.
                    Tokens is a tab switch: it swaps the bill list for the token cards. */}
                <div className="flex items-stretch gap-2 px-4 pb-3 border-b sticky top-[52px] bg-white z-10">
                    {perms.add && (
                    <button
                        onClick={onQuickAdd}
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-green-50 text-green-700 active:bg-green-100"
                    >
                        <ListPlus size={18} />
                        <span className="text-[10px] font-semibold leading-tight text-center">{t('addMore', lang)}</span>
                    </button>
                    )}

                    {perms.shift && (
                    <button
                        onClick={onShiftTable}
                        className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100"
                    >
                        <ArrowRightLeft size={18} />
                        <span className="text-[10px] font-semibold leading-tight text-center">{t('shiftTable', lang)}</span>
                    </button>
                    )}

                    <button
                        onClick={onToggleParcel}
                        disabled={(currentBill.length === 0 && !kitchen) || !perms.add}
                        aria-pressed={!!isParcel}
                        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border transition-colors disabled:opacity-40 ${isParcel
                            ? 'bg-purple-600 text-white border-purple-600 active:bg-purple-700'
                            : 'bg-white text-gray-700 border-gray-300 active:bg-gray-100'
                            }`}
                    >
                        <ShoppingBag size={18} />
                        <span className="text-[10px] font-semibold leading-tight text-center">{t('parcel', lang)}</span>
                    </button>

                    {kitchen && (
                        <button
                            onClick={() => { setNotice(false); setView(v => (v === 'tokens' ? 'bill' : 'tokens')); }}
                            aria-pressed={showTokens}
                            className={`relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border transition-colors ${showTokens
                                ? 'bg-indigo-600 text-white border-indigo-600 active:bg-indigo-700'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100 active:bg-indigo-100'
                                }`}
                        >
                            <ClipboardList size={18} />
                            <span className="text-[10px] font-semibold leading-tight text-center">{t('tokens', lang)}</span>
                            {kitchen.pendingServe > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                                    {kitchen.pendingServe}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
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
                    ) : currentBill.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                            <p>{t('noItemsAdded', lang)}</p>
                        </div>
                    ) : (
                        renderBillRows(rows, kitchen, lang, (item, idx, num) => {
                            return (
                                <div key={idx} className="flex justify-between items-center py-3 border-b">
                                    <div
                                        className={onCustomizeLine ? 'flex-1 min-w-0 select-none [-webkit-touch-callout:none]' : undefined}
                                        {...(onCustomizeLine ? press(() => onCustomizeLine(item.idxs[0])) : {})}
                                    >
                                        <p className="font-medium">
                                            <span className="text-gray-400 font-normal mr-1">{num}.</span>
                                            {translateItemName(item.name, lang)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {translatePortion(item.portion, lang)}
                                            <span className="mx-1">·</span>
                                            <span className="text-orange-600 font-medium">₹{item.price} {t('each', lang)}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => minusRow(item)}
                                            disabled={!perms.reduce}
                                            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 disabled:opacity-30"
                                        >
                                            <Minus size={16} />
                                        </button>

                                        <span className="font-bold w-8 text-center text-gray-800">
                                            {item.qty}
                                        </span>

                                        <button
                                            onClick={() => plusRow(item)}
                                            disabled={!perms.add}
                                            className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center active:bg-orange-600 disabled:opacity-30"
                                        >
                                            <Plus size={16} />
                                        </button>

                                        <span className="font-bold w-16 text-right text-gray-800">
                                            ₹{item.price * item.qty}
                                        </span>
                                    </div>

                                </div>
                            );
                        })
                    )}
                </div>

                {!showTokens && (
                    <div className="border-t p-4 space-y-3">
                        <div className="flex justify-between font-bold text-xl">
                            <span>{t('total', lang)}</span>
                            <span className="text-orange-600">₹{total}</span>
                        </div>

                        <div className="flex gap-2">
                            {perms.clear && (
                            <button
                                onClick={onClearBill}
                                className="flex-1 min-w-0 py-3 rounded-xl font-bold text-sm
               bg-red-500 text-white
               active:bg-red-600
               shadow-md flex items-center justify-center gap-1.5"
                            >
                                <Trash2 size={kitchen ? 18 : 20} className={kitchen ? 'hidden min-[480px]:block shrink-0' : ''} />
                                <span className="truncate">{t('clearBill', lang)}</span>
                            </button>
                            )}

                            {perms.print && (
                            <button
                                onClick={onPrintBill}
                                className="flex-1 min-w-0 py-3 rounded-xl font-bold text-sm
               bg-gray-800 text-white
               active:bg-black
               shadow-md flex items-center justify-center gap-1.5"
                            >
                                <Printer size={kitchen ? 18 : 20} className={kitchen ? 'hidden min-[480px]:block shrink-0' : ''} />
                                <span className="truncate">{t('printBill', lang)}</span>
                            </button>
                            )}

                            {/* UPI QR for the current bill amount: next to Print Bill, before Send Token */}
                            {/* Kitchen mode has four buttons: on narrow phones the QR button shrinks to its icon */}
                            {perms.qr && (
                            <button
                                onClick={onShowQr}
                                disabled={total <= 0}
                                aria-label={ta('showQr', lang)}
                                title={ta('showQr', lang)}
                                className={`${kitchen ? 'flex-none w-12 min-[480px]:flex-1 min-[480px]:w-auto' : 'flex-1'} min-w-0 py-3 rounded-xl font-bold text-sm
               bg-blue-600 text-white
               active:bg-blue-700
               shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:shadow-none`}
                            >
                                <QrCode size={kitchen ? 18 : 20} className="shrink-0" />
                                <span className={`truncate ${kitchen ? 'hidden min-[480px]:inline' : ''}`}>{ta('showQr', lang)}</span>
                            </button>
                            )}
                            {kitchen && perms.send && (
                                <button
                                    onClick={kitchen.onSend}
                                    disabled={!canSend}
                                    className={`relative flex-[1.25] min-w-0 py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-1.5 transition-colors ${canSend
                                        ? 'bg-green-600 text-white active:bg-green-700'
                                        : 'bg-gray-200 text-gray-400 shadow-none'
                                        }`}
                                >
                                    <Send size={18} />
                                    <span className="truncate">{t('sendToken', lang)}</span>
                                    {canSend && (
                                        <span className="absolute -top-2 -right-1.5 bg-orange-500 text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow">
                                            {kitchen.unsentCount}
                                        </span>
                                    )}
                                </button>
                            )}

                        </div>

                    </div>
                )}
            </div>
            {showTimes && (
                <ServiceTimeModal
                    table={selectedTable}
                    bill={currentBill}
                    tokens={kitchen?.tokens || []}
                    lang={lang}
                    onClose={() => setShowTimes(false)}
                />
            )}
        </div>
    );
};

export default CartDrawer;

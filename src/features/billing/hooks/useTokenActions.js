import { useRef, useState } from 'react';
import { createToken } from '../../../services/tokensService';
import { tokenEcho } from '../../../shared/utils/syncQueue';
import { t } from '../../../i18n/translations';
import { PERMISSIONS as P } from '../../auth/permissions';
import { analyzeBill } from '../../kitchens/utils/kitchenLogic';

/* Kitchen order tokens from the billing screen: send, serve, cancel, update, edit served.
   Every action checks its permission first (`allow`). */
export function useTokenActions(ctx) {
    const {
        branch, lang, kitchenLookup,
        bills: { billsRef, parcelsRef, setParcelsBoth, enqueueSave, applyBillDelta },
        kitchen: { tokensRef, tokensOfTable, upsertToken, tokenQueueRef, archiveChainRef },
        allow,
    } = ctx;

    const [sendingToken, setSendingToken] = useState(false);
    const sendingTokenRef = useRef(false);

    // Fires a token with ONLY the quantities the kitchen doesn't have yet
    const sendToken = async (table) => {
        if (!table || sendingTokenRef.current || !allow(P.TOKENS_SEND)) return;

        const bill = billsRef.current[table] || [];
        const tableTokens = tokensOfTable(table);
        const { items } = analyzeBill(bill, tableTokens, kitchenLookup);
        if (items.length === 0) return;

        sendingTokenRef.current = true;
        setSendingToken(true);
        try {
            await archiveChainRef.current;

            // new dine-in items and new parcel items are fired as SEPARATE tokens
            let existing = tableTokens;
            for (const parcelGroup of [false, true]) {
                const group = items
                    .filter(i => !!i.isParcel === parcelGroup)
                    .map(({ isParcel, ...rest }) => rest); // eslint-disable-line no-unused-vars
                if (group.length === 0) continue;
                const created = await createToken({ branch, table, items: group, isParcel: parcelGroup, existing });
                tokenEcho.remember(created.id, Date.parse(created.updatedAt)); // ignore its own INSERT echo
                upsertToken(created);
                existing = [...existing, created];
            }

            // Table + parcel mix: the Parcel button was only for this batch, so switch it off.
            // A fully-parcel order (no dine-in lines) keeps it on for the next items.
            const billNow = billsRef.current[table] || [];
            if (parcelsRef.current[table] && billNow.some(l => !l.isParcel)) {
                setParcelsBoth({ ...parcelsRef.current, [table]: false });
                await enqueueSave(table, billNow);
            }
        } catch (err) {
            console.error('Send token failed:', err);
            alert(t('tokenSendFailed', lang));
        } finally {
            sendingTokenRef.current = false;
            setSendingToken(false);
        }
    };

    // Serve / Served toggle on a single item of a token. -> true when saved
    const toggleServed = async (tokenId, idx) => {
        if (!allow(P.TOKENS_SERVE)) return false;
        const tk = tokensRef.current.find(x => x.id === tokenId);
        if (!tk || tk.status !== 'active') return undefined;

        const prevItems = tk.items;
        const nextItems = prevItems.map((it, i) => {
            if (i !== idx) return it;
            return it.served
                ? { ...it, served: false, servedAt: null }
                : { ...it, served: true, servedAt: new Date().toISOString() };
        });
        upsertToken({ ...tk, items: nextItems }); // optimistic
        try {
            await tokenQueueRef.current.enqueue(tokenId, { items: nextItems });
            return true;
        } catch (err) {
            console.error('Serve toggle failed:', err);
            upsertToken({ ...tk, items: prevItems }); // roll back
            alert(t('tokenSaveFailed', lang));
            return false;
        }
    };

    // removeFromBill: also take the unserved quantities off the bill
    const cancelToken = async (tk, removeFromBill) => {
        if (!tk || !allow(P.TOKENS_CANCEL)) return false;
        try {
            const saved = await tokenQueueRef.current.enqueue(tk.id, { status: 'cancelled' });
            upsertToken(saved);
            if (removeFromBill) {
                // served items were eaten — they stay on the bill; everything else goes
                const deltas = tk.items
                    .filter(i => !i.removed && !i.served)
                    .map(i => ({ name: i.name, portion: i.portion, category: i.category, price: i.price, isParcel: !!tk.isParcel, mods: i.mods, delta: -i.qty }));
                if (deltas.length) await applyBillDelta(tk.tableNumber, deltas);
            }
            return true;
        } catch (err) {
            console.error('Cancel token failed:', err);
            alert(t('tokenSaveFailed', lang));
            return false;
        }
    };

    // All dishes served, but the customer was not happy and sent some back: reduce quantities.
    // The reduced plates leave the token AND the bill. The KDS is NOT involved (nothing is added,
    // cancelled or notified there) — any redo of the food is handled by hand.
    // actions: [{ idx, newQty }]  (idx = position in token.items, newQty 0 = remove the line)
    const editServedToken = async (token, actions) => {
        if (!allow(P.TOKENS_EDIT)) return;
        const tk = tokensRef.current.find(x => x.id === token.id) || token;
        if (!tk || tk.status !== 'active' || !actions?.length) return;

        const items = tk.items.map(it => ({ ...it }));
        const deltas = [];

        actions.forEach(({ idx, newQty }) => {
            const it = items[idx];
            if (!it || it.removed || !it.served) return;
            const q = Math.max(0, Math.min(it.qty, Number(newQty) || 0));
            if (q >= it.qty) return;
            const diff = it.qty - q;

            if (q === 0) items[idx] = { ...it, removed: true, change: 'removed' };
            else items[idx] = { ...it, qty: q, change: 'qty', prevQty: it.change === 'qty' && it.prevQty != null ? it.prevQty : it.qty };

            deltas.push({ name: it.name, portion: it.portion, category: it.category, price: it.price, isParcel: !!tk.isParcel, mods: it.mods, delta: -diff });
        });
        if (!deltas.length) return;

        const patch = { items };
        if (!items.some(i => !i.removed)) patch.status = 'cancelled'; // nothing left on this token

        const saved = await tokenQueueRef.current.enqueue(tk.id, patch);
        upsertToken(saved);
        await applyBillDelta(tk.tableNumber, deltas);
    };

    const saveTokenUpdate = async (tk, newItems, deltas, makeParcel) => {
        if (!tk || !allow(P.TOKENS_EDIT)) return false;
        const patch = { items: newItems, revision: (tk.revision || 0) + 1 };
        // the waiter flipped Parcel on / off for this token (the bill deltas already move the quantities)
        if (makeParcel !== undefined && !!makeParcel !== !!tk.isParcel) patch.is_parcel = !!makeParcel;
        const saved = await tokenQueueRef.current.enqueue(tk.id, patch);
        upsertToken(saved);
        if (deltas.length) await applyBillDelta(tk.tableNumber, deltas);
        return true;
    };

    return { sendingToken, sendToken, toggleServed, cancelToken, editServedToken, saveTokenUpdate };
}

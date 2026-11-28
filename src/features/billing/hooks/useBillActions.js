import { insertCompletedBill, markBillCleared } from '../../../services/billsService';
import { moveTokens, fetchActiveTokens } from '../../../services/tokensService';
import { saveTimelineRows } from '../../../services/timelineService';
import { t } from '../../../i18n/translations';
import { toISTParts } from '../../../shared/utils/time';
import { hasUsedKitchenMode } from '../../../shared/utils/devicePrefs';
import { PERMISSIONS as P } from '../../auth/permissions';
import { computeSentQty, lineKey } from '../../kitchens/utils/kitchenLogic';
import { applyQuantityChange } from '../utils/billOps';
import { applyUnits, groupIndexes } from '../utils/customize';
import { buildTimelineRows, newUuid, stampCartTimes } from '../utils/timeline';
import { billTotal } from '../utils/billMath';

/* Everything a waiter / cashier does to a table's bill: add, change quantity, customise,
   parcel, shift table, clear. Each action first checks the permission (`allow`), so a
   restricted account cannot do it even if a button is reached some other way.

   `ctx` is rebuilt on every render, so the handlers always see the current screen state;
   bill / token data is read from the always-fresh refs. */
export function useBillActions(ctx) {
    const {
        branch, lang, kitchenMode, selectedTable, viewingTable, modifiers,
        bills: { billsRef, commitBills, setTableBill, parcelsRef, setParcelsBoth, enqueueSave, saveQueueRef, billEchoRef, billRowIdRef },
        kitchen: { tokensRef, tokensOfTable, updateTokens, resetTokensForTable },
        allow, onRequireTable, onClosed, onShiftStarted, onTableMoved, refreshItemFrequency,
    } = ctx;

    // the table whose cart is open: from All Tables, or the one selected on Home
    const activeTable = () => viewingTable || selectedTable;

    // adds an item to the selected table's bill (optimistic: the screen updates at once)
    const addItemToBill = async (name, portion, price, category) => {
        if (!selectedTable) {
            onRequireTable();
            return;
        }
        if (!allow(P.BILLING_ADD_ITEMS)) return;

        // read from the ref, not the `bills` state variable, so a burst of quick
        // taps always builds on the latest bill instead of a stale render snapshot
        const bill = [...(billsRef.current[selectedTable] || [])];

        // an empty table getting its first item is a NEW order: any tokens still lingering
        // from a previous order (bill emptied by minus, failed archive, etc.) must not count
        // as "already sent" for it
        if (bill.length === 0 && tokensRef.current.some(tk => tk.tableNumber === selectedTable)) {
            resetTokensForTable(selectedTable);
        }

        // same item + portion already on the bill?
        // (category is part of the match: e.g. "Combination" exists under both Rice and Noodles.
        //  Lines saved before categories were recorded have none and match on name + portion.)
        // Kitchen mode: with the Parcel button on, new items go into the parcel section; the
        // same dish can sit in both sections as two separate lines.
        const parcelMode = kitchenMode && !!parcelsRef.current[selectedTable];
        const existingIndex = bill.findIndex(
            b => b.name === name && b.portion === portion && (!b.category || !category || b.category === category)
                && (!kitchenMode || !!b.isParcel === parcelMode)
                && !(b.mods && b.mods.length) // a plain tap adds to the plain line, never to a customised one
        );

        if (existingIndex >= 0) {
            const existing = bill[existingIndex];
            bill[existingIndex] = { ...existing, qty: existing.qty + 1 };
        } else {
            bill.push({ name, portion, price, qty: 1, category, ...(parcelMode ? { isParcel: true } : {}) });
        }

        // timing log: remember when this dish went into the cart
        const stamped = stampCartTimes(billsRef.current[selectedTable] || [], bill, tokensOfTable(selectedTable));
        setTableBill(selectedTable, stamped);

        // sync with backend (queued if offline; serialized per table)
        await enqueueSave(selectedTable, stamped);
    };

    // updates a quantity or removes the line when it reaches 0
    // -> 'blocked' when the quantity already went to the kitchen, 'denied' without permission
    const changeQuantity = async (index, value) => {
        const table = activeTable();
        if (!table) return undefined;

        const line = (billsRef.current[table] || [])[index];
        const wanted = parseInt(value);
        const newQty = isNaN(wanted) ? 0 : Math.max(0, wanted);
        if (line && !allow(newQty < line.qty ? P.BILLING_REDUCE_ITEMS : P.BILLING_ADD_ITEMS)) return 'denied';

        // Kitchen mode: quantity that already went to the kitchen (even if served) can't be
        // reduced from the bill. The waiter has to cancel / update the token, which fixes the
        // token and the bill together, so they can never disagree.
        if (kitchenMode && line && newQty < line.qty) {
            const sentQty = computeSentQty(tokensOfTable(table))[lineKey(line)] || 0;
            if (newQty < sentQty) return 'blocked';
        }

        // Kitchen mode + Parcel button ON: extra plates added with "+" on a dine-in line go to the
        // parcel section instead (see utils/billOps.js). Otherwise it changes the tapped line only.
        const current = billsRef.current[table] || [];
        const bill = stampCartTimes(
            current,
            applyQuantityChange(current, index, value, { kitchenMode, parcelOn: !!parcelsRef.current[table] }),
            tokensOfTable(table)
        );
        setTableBill(table, bill);

        // an emptied table is no longer a parcel order
        if (bill.length === 0 && parcelsRef.current[table]) {
            setParcelsBoth({ ...parcelsRef.current, [table]: false });
        }

        await enqueueSave(table, bill);
        return undefined;
    };

    // "+" on a row whose portions are ALL customised: add one plain portion (same section as the row)
    const addPlainUnit = async (index) => {
        const table = activeTable();
        const old = (table && billsRef.current[table]) || [];
        const line = old[index];
        if (!line) return;
        if (!allow(P.BILLING_ADD_ITEMS)) return;
        const toParcel = kitchenMode && !!parcelsRef.current[table] && !line.isParcel; // Parcel button ON sends new portions to parcel
        const plain = { name: line.name, portion: line.portion, price: line.price, qty: 1, category: line.category, ...((line.isParcel || toParcel) ? { isParcel: true } : {}) };
        const samePlain = old.findIndex(l => !(l.mods && l.mods.length) && l.name === plain.name && l.portion === plain.portion
            && (l.category || '') === (plain.category || '') && !!l.isParcel === !!plain.isParcel);
        let merged;
        if (samePlain >= 0) merged = old.map((l, i) => (i === samePlain ? { ...l, qty: l.qty + 1 } : l));
        else {
            const idxs = groupIndexes(old, line);
            const at = toParcel ? old.length : idxs[idxs.length - 1] + 1;
            merged = [...old.slice(0, at), plain, ...old.slice(at)];
        }
        const next = stampCartTimes(old, merged, tokensOfTable(table));
        setTableBill(table, next);
        await enqueueSave(table, next);
    };

    // Customisation (preparation instructions) of one cart line: saves the edited portions
    const saveCustomization = async (customizing, units) => {
        const c = customizing;
        if (!c || !allow(P.BILLING_CUSTOMIZE)) return;
        const old = billsRef.current[c.table] || [];
        const merged = applyUnits(old, c.line, [...c.locked.map((u, i) => ({ id: `l${i}`, mods: u.mods })), ...units], modifiers);
        const next = stampCartTimes(old, merged, tokensOfTable(c.table));
        setTableBill(c.table, next);
        await enqueueSave(c.table, next);
    };

    // marks / unmarks the open order as a parcel (saved with the bill, so every device sees it)
    const toggleParcel = async (table) => {
        if (!table || !allow(P.BILLING_ADD_ITEMS)) return;
        const items = billsRef.current[table] || [];
        const nextParcel = !parcelsRef.current[table];

        if (kitchenMode) {
            // Kitchen mode: the button only decides where NEW items go (dine-in or parcel section).
            // Nothing that is already on the bill ever moves between the two sections.
            setParcelsBoth({ ...parcelsRef.current, [table]: nextParcel });
            await enqueueSave(table, items);
            return;
        }

        // Normal mode: the whole order is marked / unmarked as a parcel
        if (items.length === 0) return;
        setParcelsBoth({ ...parcelsRef.current, [table]: nextParcel });
        await enqueueSave(table, items);
    };

    // clears the table's bill and moves it to completed_bills (history + dashboard)
    const clearBill = async () => {
        const table = activeTable();
        if (!table || !allow(P.BILLING_CLEAR)) return;

        const billItems = billsRef.current[table];
        if (!billItems || billItems.length === 0) {
            // Kitchen mode: an emptied bill can still have old tokens hanging around
            const leftover = tokensOfTable(table);
            if (kitchenMode && leftover.length > 0) {
                if (window.confirm(t('clearTokensConfirm', lang))) await resetTokensForTable(table);
                return;
            }
            alert('No items to clear');
            return;
        }

        if (!window.confirm(`Clear all items for Table ${table}?`)) return;
        try {
            const now = new Date();
            // day / hour / date are always the IST (Asia/Kolkata) values, whatever the device's
            // own timezone is. completed_at itself stays a UTC instant (the column is
            // `timestamp without time zone`, so it holds UTC wall-clock time).
            const ist = toISTParts(now);

            // id made here so the timing log can point to it
            const completedBillId = newUuid();
            await insertCompletedBill({
                id: completedBillId,
                table_number: table,
                items: billItems,
                total: billTotal(billItems),
                branch,
                completed_at: now.toISOString(),
                day_of_week: ist.weekday,
                hour_of_day: ist.hour,
                date: ist.dateKey,
                // Kitchen mode: parcel only if EVERY line is a parcel line (a mixed order is not)
                is_parcel: kitchenMode
                    ? billItems.length > 0 && billItems.every(i => i.isParcel)
                    : !!parcelsRef.current[table],
            });

            // timing log: one row per dish with cart / sent / served / cleared times (never blocks the clear)
            await saveTimelineRows(buildTimelineRows({
                billId: completedBillId,
                branch,
                table,
                bill: billItems,
                tokens: tokensOfTable(table),
                clearedAt: now,
            }));

            // let any in-flight saves for this table finish first, so none can land AFTER the
            // clear and bring the bill back to life; then remember the clear so its realtime
            // echo is recognised as ours
            await saveQueueRef.current.whenIdle(String(table));
            billEchoRef.current.rememberClear(String(table));
            delete billRowIdRef.current[table];

            await markBillCleared(branch, table);

            commitBills(prev => ({ ...prev, [table]: [] }));
            setParcelsBoth({ ...parcelsRef.current, [table]: false });
            onClosed();

            // this order just fed into "Fav" — refresh so it reflects the latest counts
            refreshItemFrequency();

            // tokens end with the bill: next order on this table starts again at #T?_01
            if (kitchenMode || hasUsedKitchenMode()) resetTokensForTable(table);
        } catch (error) {
            console.error('Error clearing bill:', error);
            alert('Failed to clear bill. Please try again.');
        }
    };

    // Moves an entire order to another (empty) table. The modal already blocks occupied tables,
    // but we re-check here in case something changed in the meantime.
    const shiftTable = async (destTable) => {
        const sourceTable = activeTable();
        if (!sourceTable || destTable === sourceTable || !allow(P.BILLING_SHIFT_TABLE)) return false;

        const sourceItems = billsRef.current[sourceTable] || [];
        const destItems = billsRef.current[destTable] || [];
        if (destItems.length > 0) {
            alert(`Table ${destTable} already has an active order. Please clear it first.`);
            return false;
        }

        commitBills(prev => ({ ...prev, [destTable]: sourceItems, [sourceTable]: [] }));
        setParcelsBoth({ ...parcelsRef.current, [destTable]: !!parcelsRef.current[sourceTable], [sourceTable]: false });
        onShiftStarted();

        // tokens move with the order right away (only the table part of the number changes: #T7_02 -> #T9_02)
        const movingTokens = tokensOfTable(sourceTable);
        const hadDestTokens = tokensRef.current.some(tk => tk.tableNumber === destTable);
        if (movingTokens.length > 0 || hadDestTokens) {
            updateTokens(list => list
                .filter(tk => tk.tableNumber !== destTable)
                .map(tk => (tk.tableNumber === sourceTable
                    ? { ...tk, tableNumber: destTable, tokenNo: `T${destTable}_${String(tk.seq).padStart(2, '0')}` }
                    : tk)));
        }

        // persist: bills (serialized per table) and tokens in parallel
        const tokenMove = (movingTokens.length > 0 || hadDestTokens)
            ? moveTokens(branch, sourceTable, destTable, movingTokens).catch(async (err) => {
                console.error('Move tokens failed:', err);
                alert(t('tokenSaveFailed', lang));
                try { const fresh = await fetchActiveTokens(branch); updateTokens(() => fresh); } catch (e) { console.error(e); }
            })
            : Promise.resolve();
        await Promise.all([enqueueSave(destTable, sourceItems), enqueueSave(sourceTable, []), tokenMove]);

        // follow the order to its new table so the cart view doesn't go stale
        onTableMoved(sourceTable, destTable);
        return true;
    };

    return { addItemToBill, changeQuantity, addPlainUnit, saveCustomization, toggleParcel, clearBill, shiftTable };
}

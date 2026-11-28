import { lineKey } from '../../kitchens/utils/kitchenLogic';
import { modsSig, sortModNames } from '../../menu/utils/modifiers';

/* Customising the portions of one cart item (see components/billing/CustomizeModal.jsx).

   A bill line is "dish + portion + same modifiers" with a quantity, e.g. 2 x Half Manchurian
   [Spicy]. Customising 3 Half Manchurian as 1 Spicy / 1 Not Spicy / 1 plain therefore turns the
   single line into three lines of quantity 1. Quantity already sent to the kitchen is locked:
   a KOT can't be changed by the cart, only by Update Token.                                */

// lines of the same dish, portion and section (dine-in / parcel) — whatever their modifiers
export const sameGroup = (a, b) =>
    a.name === b.name && a.portion === b.portion && (a.category || '') === (b.category || '') && !!a.isParcel === !!b.isParcel;

export const groupIndexes = (bill, line) => bill.map((l, i) => (sameGroup(l, line) ? i : -1)).filter(i => i >= 0);

// sentMap = computeSentQty(tokens of the table)
export function buildUnits(groupLines, sentMap) {
    const used = { ...sentMap };
    const locked = [];
    const editable = [];
    let id = 0;
    groupLines.forEach(l => {
        const k = lineKey(l);
        const sent = Math.min(used[k] || 0, l.qty);
        used[k] = (used[k] || 0) - sent;
        for (let i = 0; i < sent; i++) locked.push({ mods: l.mods || [] });
        for (let i = 0; i < l.qty - sent; i++) editable.push({ id: id++, mods: [...(l.mods || [])] });
    });
    return { locked, editable };
}

// Puts the customised units back into the bill: units with the same modifiers become one line.
export function applyUnits(bill, line, units, modifiers) {
    const idxs = groupIndexes(bill, line);
    if (idxs.length === 0) return bill;
    const group = idxs.map(i => bill[i]);
    const first = idxs[0];

    const earliest = (field) => {
        const v = group.map(l => l[field]).filter(Boolean).sort()[0];
        return v ? { [field]: v } : {};
    };

    const buckets = new Map();
    units.forEach(u => {
        const sig = modsSig(u.mods);
        if (!buckets.has(sig)) buckets.set(sig, { mods: sortModNames(u.mods, modifiers), qty: 0 });
        buckets.get(sig).qty += 1;
    });
    // plain first, then the customised ones in the order they were met
    const ordered = [...buckets.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : 0)).map(([, v]) => v);

    const made = ordered.map(b => ({
        name: line.name,
        portion: line.portion,
        price: line.price,
        qty: b.qty,
        category: line.category,
        ...(line.isParcel ? { isParcel: true } : {}),
        ...(b.mods.length ? { mods: b.mods } : {}),
        ...earliest('addedAt'),
        ...earliest('pendingSince'),
    }));

    const out = [];
    bill.forEach((l, i) => {
        if (i === first) out.push(...made);
        if (!idxs.includes(i)) out.push(l);
    });
    return out;
}

/* A customised dish is stored as several lines (one per set of modifiers) because the kitchen needs
   them apart, but the bill must look as it always did: one row per dish, portion and section
   (dine-in / parcel), with the total quantity. These helpers build that view and map a "+" / "-"
   on the merged row back to the right stored line.                                              */

// merged rows in order of first appearance; `idxs` = indexes of the stored lines behind a row
export function mergeLines(bill) {
    const rows = [];
    (bill || []).forEach((l, i) => {
        const row = rows.find(r => sameGroup(r, l));
        if (row) { row.qty += l.qty; row.idxs.push(i); return; }
        const { mods, ...rest } = l; // eslint-disable-line no-unused-vars
        rows.push({ ...rest, idxs: [i] });
    });
    return rows;
}

// "+" on a merged row adds a plain portion: the plain line if there is one, otherwise -1 (a new line is needed)
export const pickPlusIndex = (bill, row) => row.idxs.find(i => !(bill[i].mods && bill[i].mods.length)) ?? -1;

// "-" removes one portion: prefer a portion that is not in a KOT yet (plain ones first),
// otherwise the last line (the quantity guard then sends the waiter to Update Token)
export function pickMinusIndex(bill, row, sentMap) {
    const unsent = row.idxs.filter(i => bill[i].qty > Math.min(sentMap[lineKey(bill[i])] || 0, bill[i].qty));
    const plain = unsent.find(i => !(bill[i].mods && bill[i].mods.length));
    if (plain !== undefined) return plain;
    if (unsent.length) return unsent[unsent.length - 1];
    return row.idxs[row.idxs.length - 1];
}
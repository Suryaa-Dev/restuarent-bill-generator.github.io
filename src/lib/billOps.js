/* Pure helpers for changing a bill (no React, easy to test). */

const sameDish = (a, b) =>
    a.name === b.name && a.portion === b.portion && (!a.category || !b.category || a.category === b.category);

/* + / - / typed quantity on one bill line.

   Kitchen mode + Parcel button ON + a DINE-IN line gets MORE quantity:
   the extra plates are not added to the dine-in line (it keeps its quantity) — they go to the
   PARCEL line of the same dish (created if needed). Same rule as tapping the dish in the menu.
   Everything else (minus, removing, changing a parcel line, Parcel button OFF, Normal mode)
   changes exactly the line that was tapped, as before.                                      */
export function applyQuantityChange(bill, index, value, { kitchenMode = false, parcelOn = false } = {}) {
    const next = [...bill];
    const qty = parseInt(value);
    const line = next[index];
    if (!line) return next;

    if (kitchenMode && parcelOn && !line.isParcel && !isNaN(qty) && qty > line.qty) {
        const extra = qty - line.qty;
        const pIdx = next.findIndex(b => b.isParcel && sameDish(b, line));
        if (pIdx >= 0) next[pIdx] = { ...next[pIdx], qty: next[pIdx].qty + extra };
        else next.push({ name: line.name, portion: line.portion, price: line.price, qty: extra, category: line.category, isParcel: true });
        return next;
    }

    if (isNaN(qty) || qty <= 0) next.splice(index, 1);
    else next[index] = { ...line, qty };
    return next;
}

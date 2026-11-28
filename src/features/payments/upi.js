/* UPI "intent" links for a QR code with the amount already filled in.
   Any UPI app (GPay, PhonePe, Paytm, BHIM …) can scan it. No payment gateway is involved:
   the money goes straight to the UPI ID, so check your UPI app to confirm it arrived. */

// keep '@' readable in the UPI ID; some UPI apps do not decode %40
const enc = (v) => encodeURIComponent(String(v ?? '').trim()).replace(/%40/g, '@');

export const formatUpiAmount = (amount) => (Math.round(Number(amount || 0) * 100) / 100).toFixed(2);

export function buildUpiLink({ upiId, payeeName, amount, note }) {
    const parts = [`pa=${enc(upiId)}`];
    if (payeeName) parts.push(`pn=${enc(payeeName)}`);
    parts.push(`am=${formatUpiAmount(amount)}`, 'cu=INR');
    if (note) parts.push(`tn=${enc(String(note).slice(0, 50))}`);
    return `upi://pay?${parts.join('&')}`;
}

// name@bank — letters, digits, dot, dash, underscore before the @
export const isValidUpiId = (value) => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,64}$/.test(String(value || '').trim());

export const formatRupees = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

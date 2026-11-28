// Totals of a bill (a list of lines { price, qty, ... }).
export const billTotal = (items) => (items || []).reduce((sum, item) => sum + item.price * item.qty, 0);
export const billQuantity = (items) => (items || []).reduce((sum, item) => sum + item.qty, 0);

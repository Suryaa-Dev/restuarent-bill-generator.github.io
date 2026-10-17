// IST (Asia/Kolkata, UTC+05:30, no DST) helpers.
//
// Why this file exists:
//   `completed_bills.completed_at` is a `timestamp WITHOUT time zone`. The app
//   writes `new Date().toISOString()` into it, so the column holds UTC wall-clock
//   time. When Supabase returns it ("2026-10-17T09:05:00") there is no "Z", and
//   `new Date(...)` would wrongly treat it as device-local time. Everything that
//   reads those timestamps goes through parseDbTimestamp() + the IST helpers below,
//   so the result is the same on every device, whatever its timezone setting.

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_MON_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

// Treat a DB timestamp with no timezone marker as UTC.
export function parseDbTimestamp(value) {
    if (value instanceof Date) return value;
    if (typeof value !== 'string') return new Date(value);
    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
    return new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`);
}

// Break an instant into IST calendar parts.
export function toISTParts(value) {
    const d = parseDbTimestamp(value);
    const s = new Date(d.getTime() + IST_OFFSET_MS); // shift, then read with the UTC getters
    const year = s.getUTCFullYear();
    const month = s.getUTCMonth() + 1;
    const day = s.getUTCDate();
    const hour = s.getUTCHours();
    const minute = s.getUTCMinutes();
    const weekdayIdx = s.getUTCDay();
    return {
        year, month, day, hour, minute, weekdayIdx,
        weekday: WEEKDAYS[weekdayIdx],
        dateKey: `${year}-${pad(month)}-${pad(day)}`,
    };
}

export const nowIST = () => toISTParts(new Date());
export const todayISTKey = () => nowIST().dateKey;

// 'YYYY-MM-DD' arithmetic (pure calendar math, no timezone involved)
export function addDaysToKey(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function daysBetweenKeys(startKey, endKey) {
    const [y1, m1, d1] = startKey.split('-').map(Number);
    const [y2, m2, d2] = endKey.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function eachDateKey(startKey, endKey) {
    const out = [];
    const n = daysBetweenKeys(startKey, endKey);
    for (let i = 0; i <= n; i++) out.push(addDaysToKey(startKey, i));
    return out;
}

// IST midnight of a date key, expressed as the UTC ISO string the DB stores.
export const istDayStartISO = (key) => new Date(`${key}T00:00:00+05:30`).toISOString();

export function weekdayOfKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// ---- Date ranges (shared by Dashboard + Order History) ----
// Returns { startKey, endKey, start, endExclusive, days } or null when no filter applies.
// `start` / `endExclusive` are UTC ISO strings, ready for .gte() / .lt() on completed_at.
export function resolveRange(rangeId, customStart, customEnd) {
    const today = todayISTKey();
    let startKey, endKey;

    switch (rangeId) {
        case 'today': startKey = endKey = today; break;
        case 'yesterday': startKey = endKey = addDaysToKey(today, -1); break;
        case 'last7days': startKey = addDaysToKey(today, -6); endKey = today; break;
        case 'last30days': startKey = addDaysToKey(today, -29); endKey = today; break;
        case 'custom':
            if (!customStart || !customEnd) return null;
            startKey = customStart <= customEnd ? customStart : customEnd;
            endKey = customStart <= customEnd ? customEnd : customStart;
            break;
        case 'all': return null;
        default: startKey = endKey = today;
    }

    return {
        startKey,
        endKey,
        start: istDayStartISO(startKey),
        endExclusive: istDayStartISO(addDaysToKey(endKey, 1)),
        days: daysBetweenKeys(startKey, endKey) + 1,
    };
}

// The equally long window immediately before `range` (for "vs previous period").
export function previousRange(range) {
    if (!range) return null;
    const endKey = addDaysToKey(range.startKey, -1);
    const startKey = addDaysToKey(range.startKey, -range.days);
    return {
        startKey,
        endKey,
        start: istDayStartISO(startKey),
        endExclusive: istDayStartISO(addDaysToKey(endKey, 1)),
        days: range.days,
    };
}

// ---- Formatting (all IST) ----
export function formatHour(h) {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12} ${suffix}`;
}

export function formatISTTime(value) {
    const p = toISTParts(value);
    const suffix = p.hour >= 12 ? 'PM' : 'AM';
    const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
    return `${pad(h12)}:${pad(p.minute)} ${suffix}`;
}

export function formatDateKey(key, withYear = true) {
    const [y, m, d] = key.split('-').map(Number);
    return `${pad(d)} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

export function formatISTDateLabel(value) {
    const key = toISTParts(value).dateKey;
    const today = todayISTKey();
    if (key === today) return 'Today';
    if (key === addDaysToKey(today, -1)) return 'Yesterday';
    return formatDateKey(key);
}

export const formatISTDateTime = (value) => `${formatDateKey(toISTParts(value).dateKey)}, ${formatISTTime(value)}`;
export const monthLabel = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

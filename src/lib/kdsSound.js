// Tiny Web-Audio alerts (no sound files). Browsers only allow audio after a tap,
// so unlockAudio() is called on the first interaction with the KDS.
const SOUND_KEY = 'restaurant_kds_sound';
let ctx = null;

export const isSoundOn = () => localStorage.getItem(SOUND_KEY) !== 'off';
export const setSoundOn = (on) => localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');

export function unlockAudio() {
    try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
    } catch { /* audio unavailable */ }
}

function tone(freq, start, dur, type = 'sine', vol = 0.3) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = ctx.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
}

// new order: bright rising two-note chime
export function playNewOrder() {
    tone(660, 0, 0.18);
    tone(880, 0.18, 0.28);
}
// cancellation: lower falling buzz so it can't be mistaken for a new order
export function playCancelled() {
    tone(380, 0, 0.22, 'triangle', 0.35);
    tone(260, 0.22, 0.34, 'triangle', 0.35);
}

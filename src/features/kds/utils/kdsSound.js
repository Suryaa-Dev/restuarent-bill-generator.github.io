// Web-Audio alerts (no sound files), tuned for a noisy kitchen and small phone speakers:
//  - high pitches (1.3–2.1 kHz) — phone/tablet speakers are weak below ~800 Hz
//  - bell-like tones (fundamental + overtones) that ring out, played twice
//  - everything goes through a compressor so it's as loud as the device allows
// Browsers only allow audio after a tap, so unlockAudio() runs on the first interaction.
const SOUND_KEY = 'restaurant_kds_sound';
let ctx = null;
let master = null;

export const isSoundOn = () => localStorage.getItem(SOUND_KEY) !== 'off';
export const setSoundOn = (on) => localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');

function ensure() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 18;
        comp.ratio.value = 6;
        comp.attack.value = 0.003;
        comp.release.value = 0.2;
        master = ctx.createGain();
        master.gain.value = 1;
        master.connect(comp);
        comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

export function unlockAudio() {
    try { ensure(); } catch { /* audio unavailable */ }
}

// one bell strike: fundamental + 2x + 3x overtones, instant attack, long ring
function bell(freq, start, dur, vol = 0.5) {
    const t0 = ctx.currentTime + start;
    [[1, 1], [2, 0.45], [3, 0.2]].forEach(([mult, amp]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq * mult;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g).connect(master);
        o.start(t0);
        o.stop(t0 + dur + 0.05);
    });
}

// harsh short pulse (sawtooth, low-passed) — deliberately unlike the bell
function buzz(freq, start, dur, vol = 0.4) {
    const t0 = ctx.currentTime + start;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = 3000;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.setValueAtTime(vol, t0 + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(f).connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
}

const buzzPhone = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* not supported */ } };

// NEW ORDER: bright rising "ding-ding-dong", repeated once (~1.6 s)
export function playNewOrder() {
    try {
        ensure();
        [0, 0.85].forEach(offset => {
            bell(1319, offset + 0.0, 0.55); // E6
            bell(1568, offset + 0.17, 0.55); // G6
            bell(2093, offset + 0.34, 0.75); // C7
        });
        buzzPhone([180, 80, 180]);
    } catch { /* audio unavailable */ }
}

// CANCELLED: four harsh alternating pulses — impossible to mistake for a new order (~0.9 s)
export function playCancelled() {
    try {
        ensure();
        [720, 480, 720, 480].forEach((hz, i) => buzz(hz, i * 0.2, 0.17));
        buzzPhone([400]);
    } catch { /* audio unavailable */ }
}
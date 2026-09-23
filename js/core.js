// Core math: easing, keyframes, springs, deterministic noise.

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, invLerp(a, b, v));
export const smooth = (t) => t * t * (3 - 2 * t);

// ---- easing ---------------------------------------------------------------
export const ease = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  in3: (t) => t * t * t,
  out3: (t) => 1 - Math.pow(1 - t, 3),
  inOut3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out5: (t) => 1 - Math.pow(1 - t, 5),
  in5: (t) => Math.pow(t, 5),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  // anticipation-in: dips below 0 first
  back: (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
  outBack: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outBackSoft: (t) => { const c = 1.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  step: (t) => (t < 1 ? 0 : 1),
  hold: (t) => 0,
};

// ---- keyframes ------------------------------------------------------------
// frames: [[time, value, easeName?], ...]  ease applies to the segment ending at that key.
// values: number | array | plain object of numbers (non-numbers step at segment end)
function mix(a, b, k) {
  if (typeof a === 'number') return a + (b - a) * k;
  if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], k));
  if (a && typeof a === 'object') {
    const o = {};
    for (const key in a) o[key] = key in b ? mix(a[key], b[key], k) : a[key];
    for (const key in b) if (!(key in o)) o[key] = b[key];
    return o;
  }
  return k < 1 ? a : b;
}
export function key(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  const last = frames[frames.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i];
    if (t < f[0]) {
      const p = frames[i - 1];
      const e = ease[f[2] || 'inOut'] || f[2];
      const k = (t - p[0]) / (f[0] - p[0]);
      return mix(p[1], f[1], typeof e === 'function' ? e(k) : k);
    }
  }
  return last[1];
}

// ---- springs ----------------------------------------------------------------
// Damped oscillation that starts at `from` and settles to `to` from time t0.
export function spring(t, t0, from, to, freq = 3, damp = 0.3) {
  if (t <= t0) return from;
  const dt = t - t0;
  const w = TAU * freq;
  return to + (from - to) * Math.exp(-damp * w * dt) * Math.cos(w * Math.sqrt(1 - damp * damp) * dt);
}
// Impulse wobble: 0 before t0, kicks to amp and decays oscillating to 0.
export function wobble(t, t0, amp = 1, freq = 3, damp = 0.25) {
  if (t <= t0) return 0;
  const dt = t - t0;
  const w = TAU * freq;
  return amp * Math.exp(-damp * w * dt) * Math.sin(w * dt);
}
// Squash impulse: returns scaleY multiplier (1 = rest) for a landing at t0.
export function landSquash(t, t0, amt = 0.35, freq = 4, damp = 0.28) {
  if (t < t0) return 1;
  const dt = t - t0;
  const w = TAU * freq;
  return 1 - amt * Math.exp(-damp * w * dt) * Math.cos(w * dt);
}

// Accumulate several impulse events: events = [t0, t0, ...]
export function sumWobble(t, times, amp, freq, damp) {
  let s = 0;
  for (const t0 of times) if (t > t0) s += wobble(t, t0, amp, freq, damp);
  return s;
}

// ballistic hop from p0 to p1 (x,y) over [t0,t0+dur] with apex `h` above the higher point
export function hop(t, t0, dur, x0, y0, x1, y1, h) {
  const k = clamp((t - t0) / dur);
  const x = lerp(x0, x1, k);
  const base = lerp(y0, y1, k);
  const y = base - h * 4 * k * (1 - k);
  return { x, y, k, air: t > t0 && t < t0 + dur };
}

// ---- deterministic noise ---------------------------------------------------
export function hash(n) {
  n = (n | 0) ^ 0x9e3779b9;
  n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
export const hash2 = (a, b) => hash((a | 0) * 374761393 + (b | 0) * 668265263);
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash2(i, seed), b = hash2(i + 1, seed);
  return lerp(a, b, smooth(f)) * 2 - 1;
}
export function fbm(x, seed = 0) {
  return noise1(x, seed) * 0.6 + noise1(x * 2.1, seed + 17) * 0.3 + noise1(x * 4.3, seed + 31) * 0.1;
}
export function rng(seed) {
  let s = seed | 0;
  return () => hash(s++);
}

// window helpers
export const within = (t, a, b) => t >= a && t < b;
export const pulse = (t, a, b) => (t >= a && t < b ? 1 : 0);
// fade in over [a, a+fi], out over [b-fo, b]
export function envelope(t, a, b, fi = 0.3, fo = 0.3) {
  return Math.min(invLerp(a, a + fi, t), 1 - invLerp(b - fo, b, t));
}

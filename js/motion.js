// Waypoint choreography for the little friend, with automatic squash/stretch,
// anticipation before hops, landing impacts, leg cycles and facing.
import { clamp, lerp, ease, landSquash, wobble, TAU } from './core.js';

// pts: [{ t, x, y, z, m: mode, h: hop height, e: ease }]; the mode of point i describes how we ARRIVE at it.
// modes: 'walk' 'tiptoe' 'run' 'hop' 'slide' 'fall' 'jump' (= big hop) 'ease' 'lin' 'hold'
export function track(t, pts) {
  const n = pts.length;
  if (t <= pts[0].t) return { ...pos(pts[0]), i: 0, k: 0, mode: 'hold', air: false, moving: false, vx: 0, vz: 0, dist: 0 };
  let dist = 0;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (t < b.t) {
      const k = (t - a.t) / (b.t - a.t);
      const m = b.m || 'ease';
      let x, y, z, air = false;
      if (m === 'hop' || m === 'jump') {
        const kk = b.e ? ease[b.e](k) : k;
        x = lerp(a.x, b.x, kk); z = lerp(a.z, b.z, kk);
        const h = b.h ?? 2;
        y = lerp(a.y, b.y, k) + h * 4 * k * (1 - k);
        air = true;
      } else if (m === 'fall') {
        const kk = k * k;
        x = lerp(a.x, b.x, k); z = lerp(a.z, b.z, k); y = lerp(a.y, b.y, kk);
        air = true;
      } else if (m === 'hold') {
        x = a.x; y = a.y; z = a.z;
      } else {
        const fn = m === 'run' || m === 'lin' ? ease.linear : m === 'slide' ? ease.out3 : ease[b.e || 'inOut'];
        const kk = fn(k);
        x = lerp(a.x, b.x, kk); y = lerp(a.y, b.y, kk); z = lerp(a.z, b.z, kk);
      }
      const d = dist + segLen * clamp(k);
      const dt = b.t - a.t;
      return { x, y, z, i, k, mode: m, air, moving: m !== 'hold', vx: (b.x - a.x) / dt, vz: (b.z - a.z) / dt, dist: d, seg: [a, b] };
    }
    dist += segLen;
  }
  return { ...pos(pts[n - 1]), i: n - 1, k: 1, mode: 'hold', air: false, moving: false, vx: 0, vz: 0, dist };
}
const pos = (p) => ({ x: p.x, y: p.y, z: p.z });

// Automatic body mechanics from a track. Returns partial cube state.
export function autoBody(t, pts, size = 5, o = {}) {
  const tr = track(t, pts);
  const st = { x: tr.x, y: tr.y, z: tr.z, size, ground: tr.y };
  let sq = 0, tuck = 0, walk = 0, walkAmt = 0, lean = 0, rot = 0;
  // hops: anticipation, stretch, landing
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (b.m !== 'hop' && b.m !== 'jump' && b.m !== 'fall') continue;
    const big = b.m === 'jump' ? 1.6 : 1;
    const ant = b.ant ?? (b.m === 'fall' ? 0 : 0.14 * big);
    // anticipation crouch
    if (ant > 0 && t > a.t - ant && t <= a.t) sq += 0.28 * big * Math.sin(((t - (a.t - ant)) / ant) * Math.PI * 0.5);
    // air
    if (t > a.t && t < b.t) {
      const k = (t - a.t) / (b.t - a.t);
      sq += -0.22 * big * (1 - k) + 0.08 * k;
      tuck = Math.max(tuck, 0.55 * Math.sin(k * Math.PI));
      if (b.spin) rot += b.spin * ease.inOut(k);
    }
    // landing
    if (t >= b.t && t < b.t + 0.8) sq += (1 - landSquash(t, b.t, 0.32 * big * (b.land ?? 1), 3.6, 0.3));
  }
  // walk cycles
  if (tr.moving && !tr.air && tr.mode !== 'slide' && tr.mode !== 'ease' && tr.mode !== 'lin') {
    const stride = tr.mode === 'run' ? 0.5 : tr.mode === 'tiptoe' ? 0.16 : 0.28;
    walk = tr.dist / (size * stride);
    walkAmt = tr.mode === 'run' ? 1.2 : tr.mode === 'tiptoe' ? 0.7 : 1;
    const bob = Math.abs(Math.sin(walk * Math.PI));
    sq += (tr.mode === 'run' ? -0.06 : 0.04) * bob - (tr.mode === 'tiptoe' ? 0.08 : 0);
    lean = clamp(tr.vx / (size * 3), -1, 1) * (tr.mode === 'run' ? 0.35 : 0.12);
    st.y += bob * size * (tr.mode === 'run' ? 0.08 : tr.mode === 'tiptoe' ? 0.05 : 0.03);
  }
  // facing follows horizontal travel
  st.sq = sq; st.tuck = tuck; st.walk = walk; st.walkAmt = walkAmt; st.lean = lean; st.rot = rot;
  st._track = tr;
  return st;
}

// facing track helper: smooth turn between key facings [[t, f], ...]
export function facingAt(t, keys) {
  let f = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, fk] = keys[i];
    const d = 0.18;
    if (t >= tk) f = fk;
    else if (t > tk - d) { const k = (t - (tk - d)) / d; f = lerp(keys[i - 1][1], fk, ease.inOut(k)); break; }
    else break;
  }
  return f;
}

// eye darts: returns lookX via keyed jumps with fast transitions (saccades)
export function saccade(t, keys, dur = 0.07) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, vk] = keys[i];
    if (t >= tk + dur) v = vk;
    else if (t > tk) { v = lerp(keys[i - 1][1], vk, ease.out((t - tk) / dur)); break; }
    else break;
  }
  return v;
}

// value switch at times: [[t, value], ...] → last value whose time <= t
export function sw(t, keys) {
  let v = keys[0][1];
  for (const [tk, vk] of keys) { if (t >= tk) v = vk; else break; }
  return v;
}

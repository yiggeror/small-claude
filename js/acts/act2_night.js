// Act 2 — the room is dark and still. Then: an orange glow at the seam, two eyes, a squeeze, a pop.
import { C, dust, line, circle } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, TAU } from '../core.js';
import { Cam, camLerp } from '../world.js';
import { POS, DY } from '../render.js';
import { LAPTOP } from '../props.js';
import { drawCube, autoBlink } from '../cube.js';
import { addGlow } from '../light.js';
import { autoBody, saccade, sw } from '../motion.js';
import { worldShot } from './cams.js';
import { T, WIDE } from './times.js';

const LX = POS.laptop.x;             // laptop centre x
const SEAM_Y = POS.laptop.y + LAPTOP.base;
const LAND = { x: 6, z: 31.5 };

// lid crack angle over time
function lidAngle(t) {
  if (t < T.crack) return 0;
  if (t < T.squeeze) return key(t, [[T.crack, 0], [T.crack + 0.9, 0.05, 'out'], [T.eyes - 0.2, 0.05], [T.eyes, 0.058, 'out']]);
  if (t < T.pop) {
    // strained pushes
    return key(t, [[T.squeeze, 0.058], [T.squeeze + 0.35, 0.075, 'out'], [T.squeeze + 0.7, 0.07], [T.squeeze + 1.05, 0.1, 'out'], [T.squeeze + 1.35, 0.095], [T.pop, 0.12, 'in']]);
  }
  // pop: lid springs up, then drops shut
  return Math.max(0, key(t, [[T.pop, 0.12], [T.pop + 0.08, 0.2, 'out'], [T.pop + 0.3, 0, 'in']]) + (t > T.pop + 0.3 ? Math.abs(wobble(t, T.pop + 0.3, 0.02, 7, 0.3)) : 0));
}

function seamGlow(t) {
  if (t < T.seamOn) return 0;
  const flick = key(t, [[T.seamOn, 0], [T.seamOn + 0.08, 0.35], [T.seamOn + 0.2, 0.02], [T.seamOn + 0.5, 0.02], [T.seamOn + 0.58, 0.5], [T.seamOn + 0.7, 0.15], [T.seamOn + 1.2, 0.6, 'inOut']]);
  const breathe = t > T.seamOn + 1.2 ? 0.6 + 0.15 * Math.sin((t - T.seamOn) * 2.4) : flick;
  if (t > T.pop + 0.15) return 0;
  if (t > T.crack) return 0.85 + 0.1 * Math.sin(t * 3);
  return breathe;
}

// what we see inside the gap: the little friend's eyes, then its squashed face
function gapFn(t) {
  return (c, yDeck, yLid, w) => {
    const gap = yDeck - yLid;
    // warm light inside
    const g = c.createLinearGradient(0, yLid, 0, yDeck);
    g.addColorStop(0, 'rgba(40,18,10,1)'); g.addColorStop(1, 'rgba(150,70,30,1)');
    c.fillStyle = g; c.fillRect(-w / 2, yLid, w, gap);
    if (t >= T.eyes - 0.1 && t < T.squeeze) {
      const up = key(t, [[T.eyes - 0.1, 0], [T.eyes + 0.25, 1, 'out'], [T.eyes + 3.1, 1], [T.eyes + 3.35, 0, 'in']]);
      const lx = saccade(t, [[T.eyes, 0], [T.eyes + 0.6, -1], [T.eyes + 1.2, 1], [T.eyes + 1.55, -1], [T.eyes + 1.9, 0.1]], 0.06);
      const eyes = t > T.eyes + 2.3 && t < T.eyes + 3.1 ? 'sly' : 'normal';
      const blink = Math.max(autoBlink(t, 5, 1.6), t > T.eyes + 0.3 && t < T.eyes + 0.45 ? 1 : 0);
      const size = 5;
      const eyeY = (0.2 + 0.64 * 0.6) * size; // eye height above feet
      const yc = yLid + gap * 0.52;
      const feet = yc + eyeY + (1 - up) * 3;
      const xo = -2 + lx * 0.6 * 0; // body stays; eyes dart
      drawCube(c, { x: xo, y: feet, size, lookX: lx, lookY: -0.1, eyes, blink, alpha: 1 });
    }
    if (t >= T.squeeze && t < T.pop + 0.02) {
      // squashed face pushing through
      const k = (t - T.squeeze) / (T.pop - T.squeeze);
      const push = 0.5 + 0.5 * Math.sin(k * TAU * 2.5 - 1);
      const size = 5 + push * 0.4;
      const sq = 0.55 - gap * 0.05;
      const feet = yDeck + 0.2;
      drawCube(c, { x: -2 + Math.sin(t * 40) * 0.12 * push, y: feet, size, sq, eyes: push > 0.5 ? 'squeeze' : 'normal', mouth: push > 0.6 ? 'o' : null, mouthK: 0.5, lookY: 0.2 });
    }
  };
}

// the little friend as a world object once it's out
function cubeWorld(t) {
  if (t < T.pop) return null;
  const pts = [
    { t: T.pop, x: LX - 2, y: SEAM_Y + 0.2, z: POS.laptop.z - 0.3 },
    { t: T.land, x: LAND.x, y: DY, z: LAND.z, m: 'jump', h: 6, spin: -TAU, ant: 0, land: 0.9 },
    { t: 99.4, x: LAND.x, y: DY, z: LAND.z, m: 'hold' },
    { t: 99.9, x: LAND.x, y: DY, z: LAND.z, m: 'hold' },
  ];
  const c = autoBody(t, pts, 5);
  c.eyes = 'normal'; c.blink = autoBlink(t, 13, 2.2);
  if (t < T.land) { c.eyes = 'squeeze'; c.mouth = 'o'; c.armL = { a: 1.2 }; c.armR = { a: 1.2 }; c.tuck = 0.8; }
  // flattened and dizzy
  const flat = key(t, [[T.land, 0], [T.land + 0.05, 0.55], [T.land + 0.8, 0.4], [T.land + 0.95, -0.2, 'out'], [T.land + 1.15, 0, 'out']]);
  if (t >= T.land && t < T.land + 1.4) { c.sq = Math.max(c.sq, flat); if (flat < 0) c.sq = flat; }
  if (t >= T.land && t < T.land + 0.95) { c.eyes = 'dizzy'; c.legSpread = 1; c.armL = { a: -0.3 }; c.armR = { a: -0.3 }; }
  // head shake (follow-through)
  const shakeT = T.land + 1.1;
  if (t >= shakeT && t < shakeT + 0.9) { c.rot = wobble(t, shakeT, 0.22, 5, 0.18); c.eyes = 'squeeze'; c.lean = wobble(t, shakeT + 0.05, 0.1, 5, 0.2); }
  // look around the giant new world
  const tl = T.land + 2.0;
  if (t >= tl) {
    c.lookX = saccade(t, [[tl, 0], [tl + 0.3, -1], [tl + 0.9, 1], [tl + 1.5, 0.2]]);
    c.lookY = saccade(t, [[tl, 0], [tl + 1.5, -1]]);
    if (t > tl + 1.5) c.eyes = 'wide';
  }
  if (t >= T.awe) {
    c.eyes = 'star'; c.lookY = -0.3; c.lookX = 0; c.mouth = 'o'; c.mouthK = 0.8; c.blush = 0.4;
    c.armL = { a: key(t, [[T.awe, 0], [T.awe + 0.25, 1.1, 'outBack']]) };
    c.armR = { a: key(t, [[T.awe, 0], [T.awe + 0.25, 1.1, 'outBack']]) };
    c.emote = { type: 'sparkle', k: clamp((t - T.awe - 0.1) * 4), dx: -0.55 };
    c.emote2 = { type: 'sparkle', k: clamp((t - T.awe - 0.25) * 4), dx: 0.62 };
    // little hop of delight
    const hk = (t - (T.awe + 0.5)) / 0.4;
    if (hk > 0 && hk < 1) { c.y += 1.4 * 4 * hk * (1 - hk); c.tuck = 0.5 * Math.sin(hk * Math.PI); }
    c.sq += (1 - landSquash(t, T.awe + 0.9, 0.2)) + (t > T.awe + 0.38 && t < T.awe + 0.5 ? 0.15 : 0);
  }
  if (t >= 98.4) { // "...everyone's asleep. Let's go." sneaky face
    c.eyes = sw(t, [[98.4, 'normal'], [98.9, 'sly']]); c.mouth = t > 98.9 ? 'cat' : null; c.emote = null; c.emote2 = null;
    c.lookX = saccade(t, [[98.4, 0], [98.6, -1], [98.95, 1], [99.4, 0.3]]);
    c.lookY = 0; c.armL = { a: 0 }; c.armR = { a: 0 }; c.blush = 0;
  }
  return c;
}

export function state(t, S) {
  if (t >= T.silence && t < T.lightsOn) { S.lit = 0; S.switchOn = 0; S.screen = 0; S.laptop = { a: 0 }; }
  if (t < T.silence || t >= 100) return;
  S.laptop = { a: lidAngle(t), gapFn: gapFn(t) };
  S.seam = seamGlow(t);
  const c = cubeWorld(t);
  if (c) {
    S.cube = c;
    // landing dust
    const dk = (t - T.land) / 0.6;
    if (dk > 0 && dk < 1) S.extras.push({ x: c.x, y: DY, z: c.z - 0.5, order: 3, draw: (cx) => dust(cx, 0, 0, 2.2, dk, 21, 1.1) });
  }
}

// ------------------------------------------------------------------ shots
const PUSH_END = { x: 8, y: DY + 34, z: -70, f: 1300, hy: 150 };
export const shots = [
  { t0: T.silence, t1: T.seamShot, name: 'dark-room',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.pushIn) / (T.seamShot - T.pushIn)));
      worldShot(ctx, t, camLerp(new Cam({ ...WIDE, x: WIDE.x - 20, z: WIDE.z - 20, f: 1120 }), new Cam(PUSH_END), k * 0.55));
    } },
  { t0: T.seamShot, t1: T.crackShot, name: 'laptop-dark',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.seamShot) / 6));
      worldShot(ctx, t, new Cam({ x: LX, y: DY + 14, z: lerp(-30, -18, k), f: 1400, hy: 360 + k * 20 }));
    } },
  { t0: T.crackShot, t1: T.pop + 0.35, name: 'seam-close',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.crackShot) / 8));
      const shake = t > T.squeeze && t < T.pop ? Math.sin(t * 60) * 2 : 0;
      worldShot(ctx, t, new Cam({ x: LX - 1.6, y: DY + 8.3, z: lerp(17.5, 20, k), f: 1300, hy: lerp(560, 575, k), near: 3, shakeX: shake }));
    } },
  { t0: T.pop + 0.35, t1: 97.2, name: 'landing-low',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - (T.land + 1.5)) / 3));
      worldShot(ctx, t, new Cam({ x: lerp(6.4, 5.8, k), y: DY + lerp(3.4, 3.0, k), z: lerp(26.0, 26.4, k), f: 620, hy: lerp(502, 520, k), near: 1 }));
    } },
  { t0: 97.2, t1: T.kb, name: 'reveal',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - 97.2) / 2.8));
      worldShot(ctx, t, new Cam({ x: lerp(10, 14, k), y: DY + lerp(44, 50, k), z: lerp(-14, -22, k), f: 1250, hy: lerp(-560, -620, k) }));
    } },
];

export const cues = [];

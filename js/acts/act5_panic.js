// Act 5 — footsteps! Tidy up, fix the cookie (sort of), rescue the pen, sprint, fail, try again, dive in.
import { C, dust, line, circle, speedLines } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, TAU, hash2 } from '../core.js';
import { Cam } from '../world.js';
import { POS, DY } from '../render.js';
import { LAPTOP, KB, BOOKS_H } from '../props.js';
import { drawCube, autoBlink } from '../cube.js';
import { autoBody, saccade, sw } from '../motion.js';
import { keyW, pressedKeys } from './act3_adventure.js';
import { BITE_A } from './act4_cookie.js';
import { worldShot } from './cams.js';
import { T } from './times.js';

const PLATE_Y = DY + 0.7;
const KTOP = DY + KB.h + KB.cap;
const BOOK_TOP = DY + BOOKS_H;
const LEDGE_Z = 36.6;             // standing strip on the books in front of the laptop
const LZ = POS.laptop.z;

const kF = keyW(4, 6), kM = keyW(2, 6), kB = keyW(0, 6);
const PATH = [
  { t: T.panic, x: 53.9, y: PLATE_Y, z: 11 },
  // sweep crumbs: quick back-and-forth
  { t: 165.8, x: 56.2, y: PLATE_Y, z: 9.2, m: 'run' },
  { t: 166.2, x: 53.4, y: PLATE_Y, z: 10.2, m: 'run' },
  { t: 166.6, x: 57.4, y: PLATE_Y, z: 15.4, m: 'run' },
  { t: 167.0, x: 55.4, y: PLATE_Y, z: 12, m: 'run' },
  // rotate the cookie
  { t: 167.2, x: 55.4, y: PLATE_Y, z: 12, m: 'hold' },
  { t: 168.6, x: 55.6, y: PLATE_Y, z: 11.4, m: 'walk' },
  { t: 169.3, x: 55.6, y: PLATE_Y, z: 11.4, m: 'hold' },
  // hop off and dash to the pen
  { t: 169.6, x: 52, y: DY, z: 8, m: 'hop', h: 1.2, ant: 0.08 },
  { t: 171.6, x: -3.5, y: DY, z: 0.5, m: 'run' },
  { t: 171.8, x: -3.5, y: DY, z: 0.5, m: 'hold' },
  { t: 173.0, x: -3.5, y: DY, z: 6.4, m: 'walk' },
  { t: 173.9, x: -3.5, y: DY, z: 6.4, m: 'hold' },
  // up onto the keyboard and across it
  { t: 174.25, x: kF.x, y: KTOP, z: kF.z, m: 'hop', h: 2, ant: 0.1 },
  { t: 175.2, x: kB.x, y: KTOP, z: kB.z, m: 'run' },
  { t: 175.4, x: kB.x, y: KTOP, z: kB.z, m: 'hold' },
  // jump for the books... SPLAT
  { t: T.fail, x: kB.x, y: BOOK_TOP - 3.2, z: 35.7, m: 'jump', h: 3, ant: 0.18, land: 0 },
  { t: 176.6, x: kB.x, y: BOOK_TOP - 3.2, z: 35.7, m: 'hold' },
  { t: 176.95, x: kB.x + 0.3, y: DY, z: 33.5, m: 'fall' },
  { t: 177.8, x: kB.x + 0.3, y: DY, z: 33.5, m: 'hold' },
  // back up for a run-up
  { t: 178.15, x: kB.x, y: KTOP, z: kB.z, m: 'hop', h: 2.2, ant: 0.1 },
  { t: 178.6, x: kM.x, y: KTOP, z: kM.z, m: 'run' },
  { t: 178.8, x: kM.x, y: KTOP, z: kM.z, m: 'hold' },
  { t: 179.3, x: kB.x, y: KTOP, z: kB.z, m: 'run' },
  // leap — grab the edge
  { t: T.grab, x: kB.x + 0.4, y: BOOK_TOP - 3.9, z: 35.8, m: 'jump', h: 3.8, ant: 0.02, land: 0 },
  { t: 180.6, x: kB.x + 0.4, y: BOOK_TOP - 3.9, z: 35.8, m: 'hold' },
  { t: 181.0, x: kB.x + 0.4, y: BOOK_TOP, z: LEDGE_Z, m: 'ease' },
  { t: T.dive, x: kB.x + 0.4, y: BOOK_TOP, z: LEDGE_Z, m: 'hold' },
  { t: T.inLaptop + 1, x: kB.x + 0.4, y: BOOK_TOP, z: LEDGE_Z, m: 'hold' },
];

function lidAngle(t) {
  if (t < T.lift) return 0;
  const lift = key(t, [[T.lift, 0], [T.lift + 0.25, 0.03, 'out'], [T.lift + 0.5, 0.025], [T.lift + 0.75, 0.07, 'out'], [T.dive + 0.7, 0.075], [T.inLaptop - 0.15, 0.05], [T.inLaptop, 0, 'in']]);
  return lift + (t > T.lift + 0.3 && t < T.dive ? Math.sin(t * 60) * 0.004 : 0) + (t > T.inLaptop ? Math.abs(wobble(t, T.inLaptop, 0.015, 7, 0.3)) : 0);
}

function cubeState(t) {
  const c = autoBody(t, PATH, 5);
  const tr = c._track;
  c.blink = 0; c.crumb = 1; c.zBias = 3;
  c.eyes = 'wide'; c.mouth = 'o'; c.mouthK = 0.6;
  c.emote = { type: 'sweat', k: 1, dx: -0.55 };
  // sweeping
  if (t < 167.2) {
    c.armL = { a: Math.sin(t * 32) * 1.2, len: 1.4 }; c.armR = { a: -Math.sin(t * 32) * 1.2, len: 1.4 };
    c.eyes = 'squeeze';
  }
  // spinning the cookie so the bite is at the back
  if (t >= 167.2 && t < 168.6) {
    c.facing = 0.8; c.lookX = 1; c.armR = { a: 0.1, len: 1.9, front: true }; c.armL = { a: 0.1, len: 1.9, front: true };
    c.lean = 0.2; c.walk = t * 8; c.walkAmt = 0.9; c.eyes = 'squeeze'; c.mouth = 'grin';
  }
  if (t >= 168.6 && t < 169.0) { c.eyes = 'happy'; c.mouth = 'smile'; c.armR = { a: 1.4 }; c.emote = null; }
  if (t >= 169.0 && t < 169.3) { c.eyes = 'wide'; c.lookX = -1; c.emote = { type: '!', k: clamp((t - 169) * 6), dx: 0.3 }; c.armL = { a: 1.3 }; c.armR = { a: 1.3 }; }
  if (t >= 169.6 && t < 171.6) { c.facing = -0.9; c.lookX = -1; c.armL = { a: Math.sin(t * 28) * 1.2 }; c.armR = { a: -Math.sin(t * 28) * 1.2 }; c.lean = -0.3; }
  // push the pen away from the edge
  if (t >= 171.6 && t < 173.0) {
    c.facing = 0; c.eyes = 'squeeze'; c.mouth = 'grin';
    c.armL = { a: 0.2, len: 1.6, front: true }; c.armR = { a: 0.2, len: 1.6, front: true };
    c.lean = -0.1; c.emote = { type: 'sweat', k: 1, dx: 0.55 };
  }
  // footsteps closer!!
  if (t >= 173.0 && t < 173.9) { c.eyes = 'tiny'; c.lookX = -1; c.lookY = -0.6; c.armL = { a: 1.4 }; c.armR = { a: 1.4 }; c.emote = { type: '!', k: 1, dx: 0.3 }; c.shake = t * 40; }
  if (t >= 173.9 && t < T.fail) {
    c.eyes = 'wide'; c.lookY = -0.6; c.armL = { a: tr.air ? 1.4 : Math.sin(t * 30) }; c.armR = { a: tr.air ? 1.4 : -Math.sin(t * 30) };
  }
  // splat against the books, slide down
  if (t >= T.fail && t < 177.8) {
    const f = t < 176.6;
    c.eyes = f ? 'squeeze' : 'dizzy'; c.mouth = f ? 'o' : 'wave';
    c.sx = f ? 1.25 : 1; c.sy = f ? 0.82 : 1; c.armL = { a: f ? 1.5 : -0.3 }; c.armR = { a: f ? 1.5 : -0.3 };
    if (!f) c.sq = 1 - landSquash(t, 176.95, 0.35);
    c.zBias = 1;
  }
  // determined
  if (t >= 177.3 && t < 177.8) { c.eyes = 'normal'; c.brows = -0.9; c.mouth = 'line'; c.rot = Math.sin((t - 177.3) * 30) * 0.08 * (1 - (t - 177.3) / 0.5); c.emote = { type: 'puff', k: 1, dx: 0.5 }; }
  if (t >= 177.8 && t < T.grab) { c.eyes = 'normal'; c.brows = -0.9; c.mouth = 'line'; c.emote = null; if (tr.air) { c.armL = { a: 1.4 }; c.armR = { a: 1.4 }; } }
  // hanging on the ledge, legs scrabbling, pull up
  if (t >= T.grab && t < 181.0) {
    c.armL = { a: 1.5, len: 1.5 }; c.armR = { a: 1.5, len: 1.5 };
    c.walk = t * 12; c.walkAmt = 1.3; c.eyes = 'squeeze'; c.mouth = 'grin';
    c.emote = { type: 'sweat', k: 1, dx: 0.55 };
    c.zBias = 1;
  }
  // lift the lid
  if (t >= 181.0 && t < T.dive) {
    c.facing = 0; c.eyes = t < T.lift ? 'wide' : 'squeeze'; c.mouth = 'grin';
    c.armL = { a: 1.45, len: 1.6 }; c.armR = { a: 1.45, len: 1.6 };
    c.sq = t > T.lift ? 0.1 + Math.sin(t * 40) * 0.03 : 0;
    c.shake = t > T.lift ? t * 60 : 0;
    c.zBias = 3;
  }
  if (t >= T.dive) c.alpha = 0; // now drawn inside the gap
  return c;
}

// the dive: seen from the front, its back end wriggling under the lid
function gapFn(t) {
  return (c, yDeck, yLid, w) => {
    const gap = yDeck - yLid;
    const g = c.createLinearGradient(0, yLid, 0, yDeck);
    g.addColorStop(0, 'rgba(40,18,10,1)'); g.addColorStop(1, 'rgba(150,70,30,1)');
    c.fillStyle = g; c.fillRect(-w / 2, yLid, w, gap);
    if (t >= T.dive && t < T.inLaptop - 0.1) {
      const k = (t - T.dive) / (T.inLaptop - 0.1 - T.dive);
      const size = lerp(5.2, 3.6, k);
      drawCube(c, { x: 0.4 - 3.6 + 0.4 + (Math.sin(t * 30) * 0.15), y: yDeck + 0.05, size, sq: 0.62, eyes: 'none', walk: t * 12, walkAmt: 1.4, alpha: 1 - clamp((k - 0.85) / 0.15) });
    }
  };
}

export function state(t, S) {
  // tidy-up results persist until the end of the film
  if (t >= T.panic) {
    const clean = key(t, [[T.panic, 0], [167.1, 1, 'linear']]);
    const rotK = ease.inOut(clamp((t - 167.3) / 1.2));
    S.cookie = { ...S.cookie, crumbs: (S.cookie.crumbs ?? 1) * (1 - clean), missA: BITE_A + rotK * Math.PI * 0.5 };
  }
  if (t < T.panic || t >= T.doorOpen2) return;
  const c = cubeState(t);
  S.cube = c;
  S.kb = { pressed: pressedKeys(t, c._track) };
  if (t >= T.lift) S.laptop = { a: lidAngle(t), gapFn: gapFn(t) };
  S.seam = t > T.lift && t < T.inLaptop + 0.1 ? 0.6 : 0;
  // hallway light under the door, with feet shadows moving closer
  if (t >= T.hallOn) {
    S.hallLight = key(t, [[T.hallOn, 0], [T.hallOn + 0.1, 1]]);
    const sh = [];
    if (t > 176.9) sh.push(-18 + Math.sin(t * 5) * 6, 14 - Math.sin(t * 5) * 6);
    S.hallShadow = sh;
  }
  S.handleRot = key(t, [[182.4, 0], [182.9, 0.7, 'out'], [T.doorOpen2, 0.7]]);
  // dust puffs: panic tidy
  const dk = (t - T.panic) / 1.8;
  if (dk > 0 && dk < 1) S.extras.push({ x: 56, y: PLATE_Y, z: 11, order: 4, draw: (cx) => dust(cx, 0, 0, 3.4, (dk * 3) % 1, 61 + Math.floor(dk * 3), 1.4) });
  if (t >= 169.6 && t < 171.6) c.draw = (cx, cs) => speedLines(cx, cs.size * 0.9, -cs.size * 0.45, cs.size * 0.6, 1, 1, 7, 3, 1.2);
}

// ------------------------------------------------------------------ shots
const cubeAt = (t) => autoBody(t, PATH, 5);
const shake = (t, a = 3) => ({ shakeX: Math.sin(t * 23) * a, shakeY: Math.cos(t * 19) * a * 0.6 });
const DOOR_C = { x: (-205 + -120) / 2 };

export const shots = [
  { t0: T.panic, t1: 169.3, name: 'tidy',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 56, y: DY + 7, z: -8, f: 1300, hy: 330, ...shake(t, 3) })); } },
  { t0: 169.3, t1: 171.6, name: 'dash',
    draw(ctx, t) { const c = cubeAt(t); worldShot(ctx, t, new Cam({ x: c.x - 4, y: DY + 4.5, z: -9, f: 1050, hy: 480, ...shake(t, 4) })); } },
  { t0: 171.6, t1: T.hallOn, name: 'pen-push',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: -3.5, y: DY + 6, z: -9, f: 1200, hy: 420, ...shake(t, 2) })); } },
  { t0: T.hallOn, t1: 173.9, name: 'door-light',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: DOOR_C.x + 10, y: 34, z: -10, f: 1000, hy: 380 })); } },
  { t0: 173.9, t1: 176.9, name: 'kb-sprint',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 4, y: DY + 14, z: -12, f: 1150, hy: 150, ...shake(t, 2.5) })); } },
  { t0: 176.9, t1: 177.8, name: 'door-feet',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: DOOR_C.x - 5, y: 22, z: 20, f: 1150, hy: 420 })); } },
  { t0: 177.8, t1: T.lift, name: 'second-try',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 5, y: DY + 10, z: 6, f: 1050, hy: 300, near: 1, ...shake(t, 2) })); } },
  { t0: T.lift, t1: 182.35, name: 'lift',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 4.8, y: DY + 11, z: 18.5, f: 1300, hy: 356, near: 1, ...shake(t, 1.5) })); } },
  { t0: 182.35, t1: 182.95, name: 'handle',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: -190, y: 106, z: 25, f: 1500, hy: 540 })); } },
  { t0: 182.95, t1: T.doorOpen2, name: 'dive',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 3, y: DY + 9.4, z: 22, f: 1350, hy: 420, near: 1 })); } },
];

export const cues = [];

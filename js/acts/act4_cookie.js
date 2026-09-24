// Act 4 — the last cookie. Temptation, hesitation, a growling tummy, one small piece. Nom.
import { C, dust, line, circle, shape, emote } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, TAU, hash2 } from '../core.js';
import { Cam } from '../world.js';
import { POS, DY } from '../render.js';
import { drawCookiePiece, drawCrumbs } from '../props.js';
import { autoBlink, CUBE_DIMS } from '../cube.js';
import { addGlow } from '../light.js';
import { autoBody, saccade, sw, facingAt } from '../motion.js';
import { worldShot } from './cams.js';
import { T } from './times.js';

const PAD_Y = DY + 0.9;
const PLATE_Y = DY + 0.7;
const CK = { x: POS.plate.x, z: POS.plate.z };
const STAND = { x: 54.6, z: 11 };      // on the plate, next to the cookie
export const BITE_A = Math.PI;         // the missing chunk faces the little friend (left)

const PATH = [
  { t: T.cookie, x: 46.6, y: PAD_Y, z: 5.4 },
  { t: 143.3, x: 46.6, y: PAD_Y, z: 5.4, m: 'hold' },
  // tiptoe to the far corner of the sticky pad, then hop straight across onto the plate
  { t: 144.6, x: 47.9, y: PAD_Y, z: 8.6, m: 'tiptoe' },
  { t: 144.7, x: 47.9, y: PAD_Y, z: 8.6, m: 'hold' },
  { t: 145.0, x: STAND.x, y: PLATE_Y, z: STAND.z, m: 'hop', h: 1.4 },
  { t: 154.2, x: STAND.x, y: PLATE_Y, z: STAND.z, m: 'hold' },
  { t: 154.6, x: STAND.x + 1.1, y: PLATE_Y, z: STAND.z, m: 'tiptoe' },
  { t: T.snap, x: STAND.x + 1.1, y: PLATE_Y, z: STAND.z, m: 'hold' },
  { t: T.snap + 0.4, x: STAND.x - 0.6, y: PLATE_Y, z: STAND.z, m: 'slide' },
  { t: T.steps + 1, x: STAND.x - 0.6, y: PLATE_Y, z: STAND.z, m: 'hold' },
];

// how much of the broken-off piece is left (1 → 0 while munching)
function pieceLeft(t) { return 1 - clamp((t - (T.munch + 0.3)) / 2.3); }

export function cubeState(t) {
  const c = autoBody(t, PATH, 5);
  // while standing on the sticky pad (sorted at its front edge) it must stay in front of it
  c.zBias = t < 145.0 ? 6 : 3;
  c.blink = autoBlink(t, 41, 2.5);
  c.eyes = 'normal';
  // --- sniff sniff
  if (t < 140.6) {
    const k = key(t, [[T.cookie, 0], [139.5, 1, 'out'], [140.4, 1], [140.6, 0]]);
    c.eyes = 'content'; c.mouth = 'o'; c.mouthK = 0.3; c.sq = -0.14 * k + Math.sin(t * 14) * 0.02 * k; c.blush = 0.3 * k; c.y += 0.25 * k;
  }
  // eyes first... then the body follows
  if (t >= 140.6 && t < 143.3) {
    c.lookX = key(t, [[140.7, 0], [140.85, 1, 'out']]);
    c.facing = key(t, [[141.1, 0], [141.5, 0.8, 'outBack']]);
    c.lean = key(t, [[141.1, 0], [141.5, 0.1, 'out']]);
    if (t > 141.5) { c.eyes = 'star'; c.mouth = 'drool'; c.mouthK = clamp((t - 141.6) * 2); c.lookX = 1; }
  }
  if (t >= 143.3 && t < 145.2) { c.eyes = 'normal'; c.facing = 0.8; c.lookX = 1; c.mouth = 'cat'; }
  // --- reach #1 ... and pull back
  if (t >= T.reach1 && t < 147.9) {
    c.facing = 0.7; c.lookX = 1;
    const ext = key(t, [[T.reach1, 0], [146.6, 1, 'inOut'], [146.85, 1], [146.95, -0.2, 'out'], [147.3, -0.3]]);
    c.armR = ext >= 0 ? { a: 0.12, len: 1 + 1.7 * ext, front: true } : { a: -1.1, len: 0.6 };
    c.lean = 0.12 * clamp(ext);
    c.eyes = ext > 0.95 && t < 146.95 ? 'wide' : 'normal';
    c.mouth = t < 146.9 ? 'cat' : 'wave';
    if (t >= 146.95) {
      c.lookX = saccade(t, [[146.95, 1], [147.1, -1], [147.45, 0.6], [147.7, -0.2]]);
      c.emote = { type: 'sweat', k: clamp((t - 147.0) * 4), dx: 0.55 };
      c.blush = 0.4;
    }
  }
  // --- looks straight at us.
  if (t >= 147.9 && t < 148.9) { c.facing = 0; c.lookX = 0; c.lookY = 0; c.eyes = 'normal'; c.mouth = 'line'; c.emote = { type: 'dots', k: clamp((t - 148.0) * 2), dx: 0.4 }; c.blink = 0; }
  // --- no. no no no.
  if (t >= 148.9 && t < T.growl) {
    if (t < 149.6) { c.rot = Math.sin((t - 148.9) * 26) * 0.14; c.eyes = 'squeeze'; c.mouth = 'frown'; }
    else {
      c.facing = key(t, [[149.6, 0], [149.9, -0.9, 'outBack']]);
      c.eyes = 'flat'; c.mouth = 'line'; c.brows = -0.4;
      c.armL = { a: -0.35, len: 1.4, front: true }; c.armR = { a: -0.35, len: 1.4, front: true };
      c.sy = 1.04;
    }
  }
  // --- grumble (tummy)
  if (t >= T.growl && t < 153.0) {
    c.facing = -0.9;
    const g = t < T.growl + 0.9;
    c.sq = g ? Math.sin((t - T.growl) * 40) * 0.05 * (1 - (t - T.growl) / 0.9) : 0;
    c.eyes = g ? 'wide' : 'normal'; c.lookY = g ? 0.9 : 0; c.blush = 0.6; c.mouth = g ? 'o' : 'wave'; c.mouthK = 0.4;
    c.armL = { a: -0.35, len: 1.4, front: true }; c.armR = { a: -0.35, len: 1.4, front: true };
    if (t >= 151.5) {
      c.lookX = key(t, [[151.5, 0], [152.1, 1, 'inOut']]); c.lookY = 0;
      c.facing = key(t, [[152.2, -0.9], [153.0, 0.6, 'inOut']]);
      c.armL = { a: 0 }; c.armR = { a: 0 }; c.mouth = 'drool'; c.mouthK = clamp((t - 152.3) * 1.5);
    }
  }
  // --- anyone around?
  if (t >= 153.0 && t < T.reach2) {
    c.facing = 0.2; c.eyes = 'sly'; c.mouth = 'cat';
    c.lookX = saccade(t, [[153.0, 1], [153.15, -1], [153.6, 1], [153.9, -1], [154.05, 0.8]], 0.05);
  }
  // --- the heist
  if (t >= T.reach2 && t < T.snap) {
    c.facing = 0.8; c.lookX = 1; c.eyes = 'sly'; c.mouth = 'cat';
    if (t >= 154.6) {
      const pull = clamp((t - 154.6) / (T.snap - 154.6));
      c.armL = { a: -0.15, len: 1.9, front: true }; c.armR = { a: -0.05, len: 1.9, front: true };
      c.lean = -0.08 - 0.22 * pull + Math.sin(t * 45) * 0.03 * pull;
      c.eyes = 'squeeze'; c.mouth = 'grin'; c.blush = 0.3 + 0.5 * pull;
      c.walk = t * 9; c.walkAmt = 0.9 * pull; // legs scrabbling
      c.shake = pull > 0.5 ? t * 50 : 0;
      c.emote = { type: 'sweat', k: clamp(pull * 3), dx: -0.5 };
    }
  }
  // --- CRACK — falls back with the prize
  if (t >= T.snap && t < T.munch) {
    const f = key(t, [[T.snap, 0], [T.snap + 0.15, 1, 'out'], [157.6, 1], [157.9, 0, 'inOut']]);
    c.rot = -0.5 * f; c.sq = 0.15 * f + (1 - landSquash(t, T.snap + 0.15, 0.25));
    // hugging the prize to its chest (arms wrapped in front)
    c.armL = { a: 0.45, len: 1.25, front: true }; c.armR = { a: 0.45, len: 1.25, front: true };
    c.eyes = t < T.snap + 0.2 ? 'squeeze' : 'tiny'; c.mouth = 'o'; c.mouthK = 0.5;
    c.lookX = t > T.snap + 0.4 ? -1 : 0; c.blink = 0;
    if (t > 157.9) { c.eyes = 'star'; c.lookX = 0.2; c.lookY = -0.8; c.mouth = 'grin'; c.lookX = 0; c.armL = { a: 0.3, len: 1.25, front: true }; c.armR = { a: 0.3, len: 1.25, front: true }; }
    c.hold = {};
  }
  // --- nom nom nom
  if (t >= T.munch && t < T.steps) {
    const tm = t - T.munch;
    const eating = tm > 0.3 && tm < 2.6;
    c.armL = { a: 0.35, len: 1.25, front: true }; c.armR = { a: 0.35, len: 1.25, front: true };
    c.mouth = 'munch'; c.mouthK = eating ? Math.abs(Math.sin(tm * 11)) : 0;
    c.eyes = 'content'; c.blush = 0.8;
    c.sq = eating ? Math.abs(Math.sin(tm * 11)) * 0.06 : 0;
    c.crumb = clamp(tm * 2);
    c.hold = { up: false, left: pieceLeft(t) };
    if (tm >= 2.6) {
      c.hold = null; c.mouth = 'smile'; c.armL = { a: 0 };
      c.armR = { a: -0.4, len: 1.2, front: true, dy: 0.1 + Math.abs(Math.sin(tm * 7)) * 0.03 };
      c.rot = Math.sin(tm * 2.6) * 0.06; c.sq = 0.1;
      c.emote = { type: 'heart', k: clamp((tm - 2.7) * 3), dx: 0.5 };
      c.emote2 = { type: 'heart', k: clamp((tm - 3.3) * 3), dx: -0.45, seed: 9 };
    }
  }
  // --- what was that?!
  if (t >= T.steps) {
    c.hold = null; c.crumb = 1; c.rot = 0; c.blush = 0.2;
    c.eyes = t < T.steps + 0.25 ? 'content' : 'wide'; c.mouth = t < T.steps + 0.25 ? 'smile' : 'o';
    c.armL = { a: 1.3 }; c.armR = { a: 1.3 }; c.sq = t > T.steps + 0.25 ? -0.12 : 0;
    c.emote = t > T.steps + 0.3 ? { type: '!', k: clamp((t - T.steps - 0.3) * 6), dx: 0.3 } : null;
    c.emote2 = null; c.lookX = -0.8; c.blink = 0;
  }
  // the piece in its hands
  if (c.hold) {
    const h = c.hold;
    c.draw = (cx, cs) => {
      const s = 1.3 * (h.left ?? 1);
      if (s <= 0.05) return;
      cx.save();
      // follow the body: same pivot / rotation / squash as the cube
      const sz = cs.size, cyc = -sz * (CUBE_DIMS.L + CUBE_DIMS.H / 2);
      cx.translate(cs.x ?? 0, (cs.y ?? 0) + cyc); cx.rotate(cs.rot || 0); cx.translate(0, -cyc);
      cx.translate(0, -sz * 0.42 * (1 - (cs.sq || 0)));
      drawCookiePiece(cx, s);
      cx.restore();
    };
  }
  return c;
}

// cookie state (persists after the bite)
export function cookieState(t) {
  const miss = key(t, [[T.snap, 0], [T.snap + 0.02, 0.5]]);
  const crumbs = key(t, [[T.snap, 0], [T.snap + 0.3, 0.8], [T.munch + 0.3, 0.8], [T.munch + 2.5, 1]]);
  return { miss, missA: BITE_A, crumbs, crumbSeed: 5 };
}

// flying crumbs at the snap
function crumbBurst(t, S) {
  const tb = t - T.snap;
  if (tb < 0 || tb > 0.7) return;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (hash2(i, 3) - 0.5) * 2.4;
    const v = 6 + hash2(i, 4) * 8;
    const x = CK.x - 4 + Math.cos(a) * v * tb * 0.6;
    const y = DY + 1.6 + (-Math.sin(a) * v * tb - 25 * tb * tb);
    if (y < PLATE_Y) continue;
    S.extras.push({ x, y, z: CK.z - 1.5, order: 4, draw: (c) => circle(c, 0, 0, 0.18 + hash2(i, 5) * 0.2, { fill: '#c98d4c', lw: 1, seed: 900 + i }) });
  }
}

// wavy smell lines drifting from the cookie to the little friend
function smellLines(t) {
  return (ctx, cam) => {
    const a = key(t, [[T.cookie - 0.4, 0], [T.cookie + 0.4, 1], [141.2, 1], [142, 0]]);
    if (a <= 0) return;
    for (let j = 0; j < 3; j++) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const k = i / 24;
        const X = lerp(CK.x - 2, 48.5, k), Z = lerp(CK.z, 5.4, k);
        const Y = DY + 2.2 + j * 1.0 + Math.sin(k * 9 - t * 5 + j) * 0.45 + Math.sin(k * Math.PI) * 2.5;
        const p = cam.project(X, Y, Z);
        pts.push([p.x, p.y]);
      }
      const head = clamp((t - T.cookie + 0.4 - j * 0.15) / 1.0);
      const cut = pts.slice(0, Math.max(2, Math.floor(pts.length * head)));
      line(ctx, cut, { lw: 3, stroke: `rgba(255,236,200,${0.8 * a})`, seed: 950 + j });
    }
  };
}

export function state(t, S) {
  if (t >= T.snap) S.cookie = { ...S.cookie, ...cookieState(t) };
  if (t < T.cookie || t >= T.panic) return;
  const c = cubeState(t);
  S.cube = c;
  crumbBurst(t, S);
  if (t < 142.2) S.overlays = [smellLines(t)];
  // the cookie glows a little in the moonlight when first seen
  if (t >= 141.2 && t < 145.2) {
    const g = key(t, [[141.2, 0], [141.7, 1], [144.5, 1], [145.2, 0]]);
    S.extraGlows = (ctx, cam) => {
      const p = cam.project(CK.x, DY + 2, CK.z);
      addGlow(ctx, p.x, p.y, 9 * p.s, '255,240,200', 0.35 * g, 1.2, 0.8);
    };
    S.extras.push({ x: CK.x, y: DY + 3, z: CK.z - 2, order: 6, draw: (cx) => {
      for (let i = 0; i < 4; i++) {
        const ph = ((t - 141.2) * 0.9 + i / 4) % 1;
        const a = i * 1.7;
        emote(cx, 'sparkle', Math.cos(a) * 5.2, Math.sin(a) * 1.5 - ph * 2.5, 1.4 * g * Math.sin(ph * Math.PI), 1, 70 + i);
      }
    } });
  }
  if (t >= T.snap - 0.3 && t < T.snap + 0.3) {
    // the cookie shudders while being pulled
    S.cookie = { ...S.cookie };
  }
}

// ------------------------------------------------------------------ shots
export const shots = [
  { t0: T.cookie, t1: 141.4, name: 'sniff',
    draw(ctx, t) { const k = ease.inOut(clamp((t - T.cookie) / 2.4)); worldShot(ctx, t, new Cam({ x: lerp(50, 51, k), y: DY + 6, z: -12, f: 1250, hy: 430 })); } },
  { t0: 141.4, t1: 143.1, name: 'cookie-pov',
    draw(ctx, t) { const k = ease.out(clamp((t - 141.4) / 1.7)); worldShot(ctx, t, new Cam({ x: 60, y: DY + 3.4, z: lerp(-1, 1.2, k), f: 1200, hy: 380, near: 1 })); } },
  { t0: 143.1, t1: 147.9, name: 'approach',
    draw(ctx, t) { const k = ease.inOut(clamp((t - 143.1) / 4.8)); worldShot(ctx, t, new Cam({ x: lerp(54, 57, k), y: DY + 7, z: lerp(-9, -7, k), f: 1300, hy: 330 })); } },
  { t0: 147.9, t1: 148.9, name: 'look-at-us',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 55.2, y: DY + 3.4, z: 3.6, f: 1050, hy: 470, near: 1 })); } },
  { t0: 148.9, t1: 153.3, name: 'resist',
    draw(ctx, t) { const k = ease.inOut(clamp((t - 148.9) / 4.4)); worldShot(ctx, t, new Cam({ x: lerp(56.5, 55.5, k), y: DY + 6, z: lerp(-7, -4, k), f: 1300, hy: 380 })); } },
  { t0: 153.3, t1: 154.2, name: 'door-check',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: -150, y: 115, z: -130, f: 1050, hy: 520 })); } },
  { t0: 154.2, t1: 158.6, name: 'heist',
    draw(ctx, t) {
      const sh = t > T.snap && t < T.snap + 0.25 ? Math.sin(t * 95) * 9 * (1 - (t - T.snap) / 0.25) : 0;
      const k = ease.inOut(clamp((t - 154.2) / 2.3));
      worldShot(ctx, t, new Cam({ x: 57.5, y: DY + lerp(5.5, 5, k), z: lerp(-4, -2.5, k), f: 1350, hy: 440, shakeX: sh, shakeY: sh * 0.6 }));
    } },
  { t0: 158.6, t1: T.steps + 0.3, name: 'munch',
    draw(ctx, t) { const k = ease.inOut(clamp((t - 158.6) / 5.8)); worldShot(ctx, t, new Cam({ x: 54.5, y: DY + 3.6, z: lerp(3, 4.2, k), f: 1100, hy: 470, near: 1 })); } },
  { t0: T.steps + 0.3, t1: T.panic, name: 'uh-oh',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 54.2, y: DY + 3.8, z: 6.2, f: 1250, hy: 450, near: 1 })); } },
];

export const cues = [];

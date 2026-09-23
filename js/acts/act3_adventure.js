// Act 3 — the desk is a playground: keyboard hopscotch, a laptop that almost wakes up,
// a runaway pen, and a sticky note with a surprise on it.
import { C, dust, line, circle, rect, shape, text, ellipse, speedLines } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, TAU, hash2 } from '../core.js';
import { Cam, camLerp } from '../world.js';
import { POS, DY } from '../render.js';
import { KB, LAPTOP, drawPen } from '../props.js';
import { drawCube, cube, autoBlink } from '../cube.js';
import { addGlow } from '../light.js';
import { autoBody, track, saccade, sw } from '../motion.js';
import { worldShot } from './cams.js';
import { T } from './times.js';

// ------------------------------------------------------------------ geometry helpers
const KTOP = DY + KB.h + KB.cap;          // top of the keycaps
export function keyW(r, c) {
  const x = POS.kb.x + (-KB.w / 2 + 1.2 + (c + 0.5) * ((KB.w - 2.4) / KB.cols));
  const z = POS.kb.z + (KB.d - 1.4 - r * ((KB.d - 2.6) / (KB.rows - 1)));
  return { x, z, y: KTOP };
}
const SPACE = { x: POS.kb.x, z: POS.kb.z + 1.2, y: KTOP, r: 4, c: 4 };
const PAD_Y = DY + 0.9;
const PEN_R = 0.55;

// hop list on the keyboard: [takeoff, land, r, c]
const HOPS = [
  [103.7, 104.15, 1, 8], [104.3, 104.75, 1, 10], [104.9, 105.35, 2, 9], [105.5, 105.95, 2, 7],
  [106.1, 106.55, 3, 5], [106.7, 107.15, 3, 7], [107.3, 107.75, 3, 9],
];

function buildPath() {
  const k0 = keyW(0, 7);
  const P = [
    { t: T.kb, x: 6, y: DY, z: 31.5 },
    { t: 101.1, x: k0.x, y: DY, z: 26.2, m: 'tiptoe' },
    { t: 101.2, x: k0.x, y: DY, z: 26.2, m: 'hold' },
    { t: 101.55, x: k0.x, y: KTOP, z: k0.z, m: 'hop', h: 2.2 },
    { t: 103.1, x: k0.x, y: KTOP, z: k0.z, m: 'hold' },
    { t: 103.45, x: k0.x, y: KTOP, z: k0.z, m: 'hop', h: 1.4 },
  ];
  let last = k0;
  for (const [t0, t1, r, c] of HOPS) {
    const k = keyW(r, c);
    P.push({ t: t0, x: last.x, y: KTOP, z: last.z, m: 'hold' });
    P.push({ t: t1, x: k.x, y: KTOP, z: k.z, m: 'hop', h: 1.8 });
    last = k;
  }
  P.push({ t: 108.9, x: last.x, y: KTOP, z: last.z, m: 'hold' });
  P.push({ t: T.spacebar, x: SPACE.x + 0.5, y: KTOP, z: SPACE.z, m: 'jump', h: 5.5, ant: 0.5, land: 1.4 });
  P.push({ t: 109.75, x: SPACE.x + 0.5, y: KTOP, z: SPACE.z, m: 'hold' });
  P.push({ t: 110.15, x: SPACE.x + 0.3, y: KTOP, z: SPACE.z, m: 'hop', h: 1.0, ant: 0.02 });
  P.push({ t: 115.8, x: SPACE.x + 0.3, y: KTOP, z: SPACE.z, m: 'hold' });
  P.push({ t: 116.2, x: 0, y: DY, z: 9.4, m: 'hop', h: 1.2 });
  P.push({ t: 117.3, x: -3, y: DY, z: 5.0, m: 'walk' });
  P.push({ t: 119.6, x: -3, y: DY, z: 5.0, m: 'hold' });
  P.push({ t: 120.3, x: -3.5, y: DY, z: 1.7, m: 'run' });
  P.push({ t: 121.2, x: -3.5, y: DY, z: 1.7, m: 'hold' });
  P.push({ t: 121.9, x: -4, y: DY + 2 * PEN_R, z: 0.9, m: 'jump', h: 5, ant: 0.18, land: 0.8 });
  P.push({ t: 123.6, x: -4, y: DY + 2 * PEN_R, z: 0.9, m: 'hold' });
  P.push({ t: 124.0, x: -4, y: DY, z: 4.2, m: 'hop', h: 1.6 });
  P.push({ t: 124.9, x: -4, y: DY, z: 4.2, m: 'hold' });
  P.push({ t: 129.8, x: 41.5, y: DY, z: 4.6, m: 'walk', e: 'linear' });
  P.push({ t: 130.3, x: 41.5, y: DY, z: 4.6, m: 'hold' });
  P.push({ t: 130.6, x: 44.8, y: PAD_Y, z: 5.2, m: 'hop', h: 1.4 });
  P.push({ t: 131.0, x: 46.6, y: PAD_Y, z: 5.4, m: 'walk' });
  P.push({ t: T.cookie, x: 46.6, y: PAD_Y, z: 5.4, m: 'hold' });
  return P;
}
const PATH = buildPath();
export const ACT3_END = { x: 46.6, y: PAD_Y, z: 5.4 };

// the pen: resting on the top key row; jostled by the spacebar landing; later rolls toward the edge
function penState(t) {
  const y0 = KTOP + PEN_R, z0 = keyW(0, 3).z, x = -6;
  if (t < T.penRoll) {
    const j = t > T.spacebar ? wobble(t, T.spacebar, 0.35, 5, 0.25) : 0;
    const hop = t > T.spacebar && t < T.spacebar + 0.15 ? Math.sin(((t - T.spacebar) / 0.15) * Math.PI) * 0.4 : 0;
    return { x, y: y0 + hop, z: z0 - (t > T.spacebar ? 0.5 : 0), rot: j };
  }
  const zA = z0 - 0.5;
  const t1 = 119.9, t2 = 120.1, t3 = 121.9;
  let z, y;
  if (t < t1) {
    const k = (t - T.penRoll) / (t1 - T.penRoll);
    z = lerp(zA, POS.kb.z + 0.2, k * k);
    y = y0 + Math.abs(Math.sin(((zA - z) / 2.6) * Math.PI)) * 0.25;
  } else if (t < t2) {
    const k = (t - t1) / (t2 - t1);
    z = lerp(POS.kb.z + 0.2, POS.kb.z - 1, k); y = lerp(y0, DY + PEN_R, k * k);
  } else if (t < t3) {
    const k = (t - t2) / (t3 - t2);
    z = lerp(POS.kb.z - 1, 0.6, ease.out(k)); y = DY + PEN_R;
  } else {
    // rocking at the very edge with a passenger, then rolls back to safety
    const rock = t < 123.2 ? Math.sin((t - t3) * 7) * 0.35 * (1 - (t - t3) / 1.5) : 0;
    const back = key(t, [[123.1, 0], [123.6, 0.9, 'out']]);
    z = 0.6 + rock + back; y = DY + PEN_R;
  }
  const dist = zA - z;
  return { x, y, z, rot: -dist / PEN_R };
}

// panic: pushed back from the edge toward the keyboard
function penPanic(t) {
  const p = penState(124.5);
  const k = ease.inOut(clamp((t - 171.8) / 1.2));
  const z = lerp(p.z, 8.2, k);
  return { ...p, z, rot: p.rot - (z - p.z) / PEN_R };
}

// which key is under the cube (pressed)
export function pressedKeys(t, tr) {
  const out = [];
  if (tr.air || Math.abs(tr.y - KTOP) > 0.01) return out;
  // find nearest key to the cube position
  if (t >= T.spacebar - 0.02 && t < 115.9) { out.push({ r: 4, c: 4, k: 1 }); return out; }
  let best = null, bd = 1e9;
  for (let r = 0; r < 4; r++) for (let c = 0; c < KB.cols; c++) {
    const k = keyW(r, c); const d = Math.hypot(k.x - tr.x, k.z - tr.z);
    if (d < bd) { bd = d; best = { r, c }; }
  }
  if (best && bd < 2) out.push({ ...best, k: 1 });
  return out;
}

function cubeState(t) {
  const c = autoBody(t, PATH, 5);
  const tr = c._track;
  c.blink = autoBlink(t, 31, 2.6);
  c.eyes = 'normal';
  // --- sneaking in
  if (t < 101.55) {
    c.eyes = 'sly'; c.mouth = 'cat'; c.armL = { a: 0.9 }; c.armR = { a: 0.9 }; c.lean = 0.08; c.facing = -0.3;
    c.lookX = saccade(t, [[100, 0.4], [100.5, -0.6], [100.9, 0]]);
  }
  // --- first key: click! freeze.
  if (t >= 101.55 && t < 103.1) {
    const fr = t < 102.8;
    c.eyes = fr ? 'wide' : 'content'; c.armL = { a: fr ? 1.3 : 0.2 }; c.armR = { a: fr ? 1.3 : 0.2 };
    c.lookY = fr && t > 101.8 ? -1 : 0; c.lookX = fr && t > 101.8 ? 0.3 : 0;
    if (!fr) { c.sq += 0.12 * Math.sin(clamp((t - 102.8) / 0.3) * Math.PI); c.mouth = 'smile'; }
    c.blink = 0;
  }
  // --- joyful hopscotch
  if (t >= 103.1 && t < 108.4) {
    c.eyes = 'happy'; c.mouth = 'grin'; c.blush = 0.5;
    const up = tr.air ? 1.2 : 0.3;
    c.armL = { a: up }; c.armR = { a: up };
  }
  if (t >= 107.9 && t < 108.9) { c.eyes = 'star'; c.lookY = 1; c.mouth = 'o'; c.mouthK = 0.6; c.armL = { a: -0.3 }; c.armR = { a: -0.3 }; }
  if (t >= 108.9 && t < 110.3) { c.eyes = 'happy'; c.mouth = 'grin'; c.armL = { a: 1.4 }; c.armR = { a: 1.4 }; c.blush = 0.6; }
  // --- the laptop wakes: FREEZE
  if (t >= T.wake && t < T.sleep) {
    c.eyes = 'tiny'; c.mouth = null; c.armL = { a: 1.35 }; c.armR = { a: 1.2 }; c.blink = 0; c.sq = -0.06; c.lean = 0;
    c.lookX = key(t, [[111.9, 0], [112.7, 0.35, 'inOut']]);
    c.lookY = key(t, [[111.9, 0], [112.7, -1, 'inOut']]);
    if (t > 112.5) c.emote = { type: 'sweat', k: clamp((t - 112.5) * 3), dx: 0.55 };
    c.shake = t > 113.0 ? t * 30 : 0;
  }
  // --- phew
  if (t >= T.sleep && t < 115.8) {
    const m = key(t, [[T.sleep, 0], [T.sleep + 0.5, 1, 'out']]);
    c.sq = 0.3 * m; c.armL = { a: -0.9 * m }; c.armR = { a: -0.9 * m };
    c.eyes = 'closed'; c.mouth = 'wave';
    if (t > 115.0) { c.armR = { a: 1.35, len: 1.9, front: true, dy: -0.12 }; c.eyes = 'content'; c.mouth = 'smile'; c.sq = 0.1; }
  }
  if (t >= 115.8 && t < 118.8) {
    c.eyes = t > 117.3 ? 'content' : 'normal'; c.mouth = t > 117.3 ? 'smile' : null;
    if (t > 117.4) { c.emote = { type: 'note', k: clamp((t - 117.4) * 4), dx: 0.62 }; c.sq += 0.05 * Math.sin(t * 9); c.rot = Math.sin(t * 4.5) * 0.06; }
  }
  // --- tk-tk-tk ... what's that?
  if (t >= 118.8 && t < 119.6) {
    c.lookY = -0.7; c.lookX = 0.2;
    if (t > 119.0 && t < 119.35) { c.eyes = 'none'; c.mouth = null; c.blush = 0; }
    if (t >= 119.25) c.emote = { type: '!', k: clamp((t - 119.25) * 6), dx: 0.3 };
    if (t >= 119.35) { c.eyes = 'wide'; c.mouth = 'o'; c.armL = { a: 1.4 }; c.armR = { a: 1.4 }; c.lookY = 0; }
  }
  // --- RUN
  if (t >= 119.6 && t < 120.3) {
    c.eyes = 'wide'; c.mouth = 'o'; c.mouthK = 1;
    c.armL = { a: Math.sin(t * 30) * 1.2 }; c.armR = { a: -Math.sin(t * 30) * 1.2 };
    c.emote = { type: '!', k: 1, dx: 0.3 };
  }
  // --- the edge!
  if (t >= 120.3 && t < 121.05) {
    c.eyes = 'tiny'; c.lookY = 1; c.mouth = 'wave';
    c.armL = { a: Math.sin(t * 22) * 1.5 }; c.armR = { a: Math.cos(t * 22) * 1.5 };
    c.lean = Math.sin((t - 120.3) * 11) * 0.12 * (1 - (t - 120.3) / 0.9);
    c.emote = { type: 'sweat', k: 1, dx: -0.5 };
    if (t > 120.8) { c.lookY = -0.8; c.eyes = 'wide'; c.emote = { type: '!', k: 1, dx: 0.3 }; }
  }
  if (t >= 121.05 && t < 121.9) { c.eyes = 'squeeze'; c.mouth = 'o'; c.armL = { a: 1.4 }; c.armR = { a: 1.4 }; }
  // --- surfing the pen
  if (t >= 121.9 && t < 123.6) {
    const pen = penState(t);
    c.z = pen.z; c.y = pen.y + PEN_R;
    const bal = t < 123.1;
    c.eyes = bal ? 'wide' : 'content'; c.mouth = bal ? 'wave' : 'smile';
    c.armL = { a: bal ? Math.sin(t * 16) * 1.4 : 0.3 }; c.armR = { a: bal ? -Math.sin(t * 16 + 1) * 1.4 : 0.3 };
    c.lean = bal ? Math.sin((t - 121.9) * 8) * 0.18 : 0;
    c.rot = bal ? Math.sin((t - 121.9) * 8 + 0.6) * 0.1 : 0;
  }
  if (t >= 123.6 && t < 124.9) {
    c.eyes = t > 124.1 ? 'content' : 'normal';
    if (t > 124.2 && t < 124.8) { c.armR = { a: 1.35, len: 1.9, front: true, dy: -0.12 }; c.mouth = 'smile'; }
  }
  // --- stroll to the yellow thing
  if (t >= 124.9 && t < 130.3) {
    c.eyes = 'content'; c.mouth = 'smile'; c.facing = 0.7;
    c.y += Math.abs(Math.sin(tr.dist * 0.9)) * 0.35; // a little skip in the step
    if (t > 129.4) { c.eyes = 'normal'; c.mouth = null; c.lookY = 0.6; c.lookX = 0.6; }
  }
  if (t >= 130.3 && t < T.note) { c.facing = 0.3; c.lookY = 1; c.lookX = 0.2; }
  if (t >= T.note && t < T.noteReact) { c.lookY = 1; }
  if (tr.y > DY + 0.5 || t > 130.45) c.zBias = 2.5;
  // --- reaction to the note
  if (t >= T.noteReact && t < T.cookie) {
    const tt = t - T.noteReact;
    c.facing = 0; c.lookY = 0.2;
    c.eyes = tt < 1.2 ? 'wide' : 'shy'; c.blush = clamp(tt / 0.8);
    if (tt > 1.2) {
      c.eyes = tt < 2.4 ? 'shy' : 'content'; c.mouth = 'smile';
      c.armL = { a: -0.2, len: 1.3, front: true }; c.armR = { a: -0.2, len: 1.3, front: true };
      c.rot = Math.sin(tt * 6) * 0.07 * clamp(tt - 1.4);
      c.sq = 0.05 * Math.sin(tt * 12);
      c.emote = { type: 'heart', k: clamp((tt - 1.6) * 3), dx: 0.5 };
      c.emote2 = { type: 'heart', k: clamp((tt - 2.1) * 3), dx: -0.45, seed: 9 };
    }
  }
  return c;
}

export function state(t, S) {
  S.pen = penState(Math.min(t, 124.5));
  if (t >= 171.8) S.pen = penPanic(t);
  if (t < T.kb || t >= T.cookie) return;
  const c = cubeState(t);
  S.cube = c;
  S.kb = { pressed: pressedKeys(t, c._track) };
  // laptop wake-up: LED + light leaking from the seam
  const wake = t >= T.wake && t < T.sleep + 0.4;
  if (wake) {
    const on = t < T.sleep - 0.5 ? clamp((t - T.wake) / 0.15) : sw(t, [[T.sleep - 0.5, 0], [T.sleep - 0.35, 1], [T.sleep - 0.2, 0], [T.sleep - 0.05, 0.6], [T.sleep + 0.1, 0]]);
    S.laptop = { a: 0, led: on };
    S.seam = 0;
    S.extraLights = (L, cam) => {
      const p = cam.project(POS.laptop.x, POS.laptop.y + 1.4, POS.laptop.z - 2);
      L.point(p.x, p.y, 30 * p.s, '220,230,255', 0.8 * on, 1.8, 0.7);
    };
    S.extraGlows = (ctx, cam) => {
      const p = cam.project(POS.laptop.x, POS.laptop.y + LAPTOP.base + 0.1, POS.laptop.z);
      addGlow(ctx, p.x, p.y, 13 * p.s, '230,240,255', 0.9 * on, 1.6, 0.1);
      const q = cam.project(POS.laptop.x + LAPTOP.w * 0.4, POS.laptop.y + LAPTOP.base * 0.5, POS.laptop.z);
      addGlow(ctx, q.x, q.y, 3 * q.s, '255,255,240', on, 1, 1);
    };
  }
  // landing dust puffs
  for (const [t0, t1] of [[0, 101.55], [0, 109.6], [0, 116.2], [0, 124.0]]) {
    const dk = (t - t1) / 0.5;
    if (dk > 0 && dk < 1) S.extras.push({ x: c.x, y: c.y, z: c.z - 0.3, order: 3, draw: (cx) => dust(cx, 0, 0, 2.6, dk, 31 + t1, 1) });
  }
  // speed lines while running at the camera: drawn around the cube
  if (t >= 119.6 && t < 120.3) c.draw = (cx, cs) => { speedLines(cx, -cs.size * 0.9, -cs.size * 0.45, cs.size * 0.6, -1, 1, 3, 3, 0.8); speedLines(cx, cs.size * 0.9, -cs.size * 0.45, cs.size * 0.6, 1, 1, 5, 3, 0.8); };
}

// ------------------------------------------------------------------ the sticky note (top-down insert)
function noteInsert(ctx, t) {
  const k = clamp((t - T.note) / (T.noteReact - T.note));
  // dark desk
  ctx.fillStyle = '#5b5866'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.save();
  ctx.translate(960, 560 - ease.inOut(k) * 60);
  const z = 1.0 + k * 0.08;
  ctx.scale(z, z);
  ctx.rotate(-0.035);
  // shadow + paper
  ctx.fillStyle = 'rgba(20,15,30,0.35)'; ctx.fillRect(-470, -430, 960, 960);
  shape(ctx, [[-480, -450], [480, -450], [480, 450], [-480, 452]], { fill: '#f7df7e', lw: 4, seed: 7001 });
  // written lines appear as if we read them
  const Z = '"ZCOOL KuaiLe"';
  const col = '#4a3a2a';
  text(ctx, '明天要做：', -380, -330, { size: 78, align: 'left', font: Z, color: col, seed: 1 });
  text(ctx, '1. 修登录 bug', -350, -200, { size: 64, align: 'left', font: Z, color: col, seed: 2 });
  line(ctx, [[-360, -200], [70, -196]], { lw: 5, stroke: '#4a3a2a', seed: 7002 });
  text(ctx, '✓', 110, -205, { size: 70, font: Z, color: '#5f9d5a', seed: 3 });
  text(ctx, '2. 早点睡！！', -350, -80, { size: 64, align: 'left', font: Z, color: col, seed: 4 });
  text(ctx, '3. 买饼干', -350, 40, { size: 64, align: 'left', font: Z, color: col, seed: 5 });
  text(ctx, '(最后一块了)', -60, 44, { size: 44, align: 'left', font: Z, color: '#8a6a4a', seed: 6 });
  // doodle of the little friend with a speech bubble
  ctx.save();
  ctx.translate(-150, 330);
  drawCube(ctx, { x: 0, y: 0, size: 190, eyes: 'happy', mouth: 'smile', blush: 0.8, armR: { a: 1.2 } , fill: '#ef8a4f' });
  ctx.restore();
  shape(ctx, [[20, 150], [420, 150], [420, 300], [80, 300], [30, 340], [50, 300], [20, 300]], { fill: '#fff7d6', lw: 3.4, seed: 7003 });
  text(ctx, '明天也拜托啦', 220, 225, { size: 52, font: Z, color: col, seed: 7 });
  text(ctx, '♥', 400, 150, { size: 60, color: '#e2574c', font: Z, seed: 8 });
  ctx.restore();
  // night tint + the little friend's warm glow from the bottom edge
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgb(120,128,178)'; ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
  addGlow(ctx, 960, 1180, 900, '255,160,90', 0.55);
  addGlow(ctx, 1500, 150, 900, '140,160,230', 0.25);
}

// ------------------------------------------------------------------ shots
const cubeAt = (t) => { const c = autoBody(t, PATH, 5); return c; };

export const shots = [
  // peeking over the keyboard, first hop, the scary click
  { t0: T.kb, t1: 103.6, name: 'kb-sneak',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.kb) / 3.6));
      worldShot(ctx, t, new Cam({ x: lerp(5.5, 4.2, k), y: DY + 15, z: lerp(-9, -6, k), f: 1250, hy: lerp(40, 60, k) }));
    } },
  // hopscotch — the camera drifts along
  { t0: 103.6, t1: 109.9, name: 'kb-hops',
    draw(ctx, t) {
      const c = cubeAt(Math.min(t, 108.9));
      const x = lerp(c.x, 4, 0.35);
      worldShot(ctx, t, new Cam({ x, y: DY + 14, z: -8, f: 1150, hy: 80, yaw: -0.06 }));
    } },
  // freeze — the laptop wakes
  { t0: 109.9, t1: 111.9, name: 'wake-wide',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 3, y: DY + 13, z: -16, f: 1250, hy: 260 })); } },
  { t0: 111.9, t1: 113.5, name: 'wake-face',
    draw(ctx, t) { const k = ease.inOut(clamp((t - 111.9) / 1.6)); worldShot(ctx, t, new Cam({ x: 2.6, y: DY + 7.5, z: lerp(2, 3.5, k), f: 1100, hy: 420, near: 1 })); } },
  { t0: 113.5, t1: T.sleep + 0.5, name: 'wake-led',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 14, y: DY + 11, z: 4, f: 1150, hy: 420, near: 1, yaw: -0.12 })); } },
  { t0: T.sleep + 0.5, t1: 118.8, name: 'phew',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - (T.sleep + 0.5)) / 4));
      worldShot(ctx, t, new Cam({ x: lerp(2, -2, k), y: DY + lerp(12, 7, k), z: lerp(-10, -12, k), f: 1300, hy: lerp(220, 420, k) }));
    } },
  // the pen is coming!
  { t0: 118.8, t1: 119.6, name: 'pen-roll',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: -4, y: DY + 13, z: -15, f: 1150, hy: 200, near: 1 })); } },
  { t0: 119.6, t1: 124.9, name: 'chase-edge',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - 121.9) / 2));
      const sh = t > 121.9 && t < 122.05 ? 6 : 0;
      worldShot(ctx, t, new Cam({ x: lerp(-4.5, -4.2, k), y: DY + lerp(2.2, 3.2, k), z: lerp(-9, -7, k), f: 950, hy: 600, near: 1, shakeY: sh * Math.sin(t * 90) }));
    } },
  // stroll along the front of the desk
  { t0: 124.9, t1: 130.2, name: 'stroll',
    draw(ctx, t) {
      const c = cubeAt(t);
      worldShot(ctx, t, new Cam({ x: c.x + 2, y: DY + 5, z: -12, f: 1100, hy: 530 }));
    } },
  { t0: 130.2, t1: T.note, name: 'pad-climb',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ x: 45, y: DY + 7, z: -15, f: 1250, hy: 330 })); } },
  { t0: T.note, t1: T.noteReact, name: 'note-insert', draw: noteInsert },
  { t0: T.noteReact, t1: T.cookie, name: 'note-react',
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.noteReact) / 3.6));
      worldShot(ctx, t, new Cam({ x: 46.6, y: DY + 4.2, z: lerp(-5, -3, k), f: 1300, hy: 560, near: 1 }));
    } },
];

export const cues = [];

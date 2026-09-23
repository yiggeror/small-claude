// The little orange friend. Drawn after the character sheet:
// wide orange block, two tall rectangular eyes, stubby side arms, four little legs.
import { C, shape, rect, line, ellipse, circle, curScale, rectPts, emote } from './draw.js';
import { clamp, TAU, hash2 } from './core.js';

const W = 1;          // body width (unit)
const H = 0.64;       // body height
const L = 0.2;        // leg length
const LEG_X = [-0.37, -0.23, 0.23, 0.37];
const LEG_W = 0.085;

export const CUBE_DEFAULT = {
  x: 0, y: 0, size: 40,
  sq: 0, sx: 1, sy: 1, rot: 0, lean: 0, facing: 0,
  lookX: 0, lookY: 0, blink: 0, eyes: 'normal', eyeS: 1, brows: 0, browY: 0,
  mouth: null, mouthK: 1, blush: 0, crumb: 0,
  armL: null, armR: null,
  walk: 0, walkAmt: 0, tuck: 0, legSpread: 0,
  alpha: 1, flip: 1, shake: 0, fill: null,
};

export function cube(over) { return { ...CUBE_DEFAULT, ...over }; }

// arm: { a: radians (0 = straight out, + = up), len: multiplier, front: bool, dy: shoulder shift }
function drawArm(ctx, side, arm, lw, seed) {
  const a = arm?.a ?? 0;
  const len = arm?.len ?? 1;
  const sy = -L - H * 0.43 + (arm?.dy ?? 0);
  const sx = side * (W / 2 - 0.02);
  const al = 0.15 * len, th = 0.13;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-a * side);
  ctx.scale(side, 1);
  rect(ctx, -0.03, -th / 2, al + 0.03, th, { r: 0.02, fill: C.orange, lw, seed, seg: 8 });
  ctx.restore();
}

function eyePair(ctx, s, lw) {
  const face = clamp(s.facing, -1, 1);
  const spread = 0.17 - Math.abs(face) * 0.035;
  const cx = face * 0.13 + s.lookX * 0.045;
  const cy = -L - H * 0.6 + s.lookY * 0.045;
  const ew = 0.075 * s.eyeS, eh = 0.2 * s.eyeS;
  const blink = clamp(s.blink);
  for (let i = -1; i <= 1; i += 2) {
    const ex = cx + i * spread;
    const seed = 40 + i * 3;
    const type = s.eyes;
    if (type === 'none') continue;
    if (type === 'normal' || type === 'wide' || type === 'tiny' || type === 'sly' || type === 'look') {
      let w = ew, h = eh;
      if (type === 'wide') { w *= 1.25; h *= 1.2; }
      if (type === 'tiny') { w *= 0.55; h *= 0.4; }
      let top = cy - h / 2;
      if (type === 'sly') { top = cy - h * 0.05; h *= 0.55; }
      h = Math.max(0.018, h * (1 - blink));
      if (blink > 0.001) top = cy - h / 2 + (type === 'sly' ? eh * 0.25 : 0);
      rect(ctx, ex - w / 2, top, w, h, { r: w * 0.35, fill: C.ink, lw: lw * 0.5, seed, seg: 6 });
      if (type === 'wide' && blink < 0.5) circle(ctx, ex - w * 0.12, top + h * 0.28, w * 0.2, { fill: C.white, noStroke: true, seed });
      if (type === 'sly') line(ctx, [[ex - w * 1.1, top - 0.01], [ex + w * 1.1, top - 0.02]], { lw: lw * 0.8, seed: seed + 1 });
    } else if (type === 'happy') { // ^ ^
      line(ctx, [[ex - 0.065, cy + 0.035], [ex, cy - 0.04], [ex + 0.065, cy + 0.035]], { lw: lw * 1.05, seed });
    } else if (type === 'content') { // ∪ ∪ (smiling closed)
      line(ctx, [[ex - 0.06, cy - 0.01], [ex - 0.03, cy + 0.03], [ex + 0.03, cy + 0.03], [ex + 0.06, cy - 0.01]], { lw: lw * 1.05, seed });
    } else if (type === 'closed' || type === 'shy' || type === 'flat') { // — —
      line(ctx, [[ex - 0.06, cy + 0.01], [ex + 0.06, cy + 0.01]], { lw: lw * 1.05, seed });
    } else if (type === 'squeeze') { // > <
      const d = i;
      line(ctx, [[ex + d * 0.06, cy - 0.05], [ex - d * 0.04, cy], [ex + d * 0.06, cy + 0.05]], { lw: lw * 1.05, seed });
    } else if (type === 'dizzy') {
      const pts = [];
      for (let k = 0; k < 26; k++) {
        const a = k * 0.55 + i;
        const r = 0.008 + k * 0.0028;
        pts.push([ex + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      line(ctx, pts, { lw: lw * 0.8, seed, subdiv: false });
    } else if (type === 'star') {
      const pts = [];
      const r0 = 0.085 * s.eyeS;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU - Math.PI / 2;
        const r = k % 2 === 0 ? r0 : r0 * 0.38;
        pts.push([ex + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      shape(ctx, pts, { fill: C.ink, lw: lw * 0.4, seed, subdiv: false });
      circle(ctx, ex - 0.018, cy - 0.02, 0.012, { fill: C.white, noStroke: true, seed });
    }
    // brows: + = worried (inner up), - = angry (inner down)
    if (s.brows) {
      const by = cy - eh * 0.75 - 0.015 + s.browY;
      const tilt = s.brows * 0.035;
      line(ctx, [[ex - 0.055, by + (i < 0 ? tilt : -tilt)], [ex + 0.055, by + (i < 0 ? -tilt : tilt)]], { lw: lw * 0.85, seed: seed + 9 });
    }
  }
  // blush
  if (s.blush > 0.01) {
    for (let i = -1; i <= 1; i += 2) {
      ellipse(ctx, cx + i * (spread + 0.07), cy + 0.13, 0.055, 0.03, { fill: `rgba(245,140,130,${0.75 * s.blush})`, noStroke: true, seed: 70 + i });
    }
  }
  // mouth
  const mx = cx, my = cy + 0.12;
  const k = s.mouthK;
  switch (s.mouth) {
    case 'smile':
      line(ctx, [[mx - 0.045, my - 0.01], [mx - 0.02, my + 0.018], [mx + 0.02, my + 0.018], [mx + 0.045, my - 0.01]], { lw: lw * 0.9, seed: 81 });
      break;
    case 'grin':
      shape(ctx, [[mx - 0.06, my - 0.015], [mx + 0.06, my - 0.015], [mx + 0.035, my + 0.035], [mx - 0.035, my + 0.035]], { fill: '#7a2e1c', lw: lw * 0.8, seed: 82 });
      break;
    case 'o':
      ellipse(ctx, mx, my + 0.005, 0.025 * k + 0.008, 0.032 * k + 0.008, { fill: '#7a2e1c', lw: lw * 0.8, seed: 83 });
      break;
    case 'line':
      line(ctx, [[mx - 0.035, my], [mx + 0.035, my]], { lw: lw * 0.9, seed: 84 });
      break;
    case 'wave':
      line(ctx, [[mx - 0.06, my], [mx - 0.03, my - 0.012], [mx, my + 0.004], [mx + 0.03, my - 0.012], [mx + 0.06, my]], { lw: lw * 0.85, seed: 85 });
      break;
    case 'cat':
      line(ctx, [[mx - 0.05, my - 0.01], [mx - 0.025, my + 0.015], [mx, my - 0.004], [mx + 0.025, my + 0.015], [mx + 0.05, my - 0.01]], { lw: lw * 0.85, seed: 86 });
      break;
    case 'munch': { // k in 0..1 open amount
      const o = clamp(k);
      if (o < 0.2) line(ctx, [[mx - 0.04, my], [mx - 0.015, my + 0.01], [mx + 0.015, my], [mx + 0.04, my + 0.01]], { lw: lw * 0.85, seed: 87 });
      else ellipse(ctx, mx, my + 0.005, 0.035, 0.03 * o + 0.006, { fill: '#7a2e1c', lw: lw * 0.8, seed: 87 });
      break;
    }
    case 'frown':
      line(ctx, [[mx - 0.045, my + 0.015], [mx - 0.02, my - 0.008], [mx + 0.02, my - 0.008], [mx + 0.045, my + 0.015]], { lw: lw * 0.9, seed: 88 });
      break;
    case 'drool':
      line(ctx, [[mx - 0.045, my - 0.01], [mx - 0.02, my + 0.018], [mx + 0.02, my + 0.018], [mx + 0.045, my - 0.01]], { lw: lw * 0.9, seed: 81 });
      shape(ctx, [[mx + 0.03, my + 0.01], [mx + 0.042, my + 0.01 + 0.05 * k], [mx + 0.03, my + 0.02 + 0.06 * k], [mx + 0.02, my + 0.01 + 0.05 * k]], { fill: '#bfe0f2', lw: lw * 0.5, seed: 89 });
      break;
  }
  if (s.crumb > 0.01) {
    ctx.save(); ctx.globalAlpha *= clamp(s.crumb);
    const cxr = mx + 0.075;
    circle(ctx, cxr, my + 0.005, 0.016, { fill: '#b07a3e', lw: lw * 0.4, seed: 91 });
    circle(ctx, cxr + 0.025, my + 0.03, 0.01, { fill: '#b07a3e', lw: lw * 0.3, seed: 92 });
    ctx.restore();
  }
}

export function drawCube(ctx, st) {
  const s = { ...CUBE_DEFAULT, ...st };
  if (s.alpha <= 0) return;
  ctx.save();
  if (s.alpha < 1) ctx.globalAlpha *= s.alpha;
  ctx.translate(s.x + (s.shake ? Math.sin(s.shake * 97.3) * s.size * 0.03 : 0), s.y);
  ctx.scale(s.size * s.flip, s.size);
  // squash & stretch about the feet
  const sy = (1 - s.sq) * s.sy;
  const sx = (1 + s.sq * 0.75) * s.sx;
  // rotation about body center
  const cyc = -(L * (1 - s.tuck) + H / 2);
  ctx.translate(0, cyc);
  ctx.rotate(s.rot);
  ctx.translate(0, -cyc);
  ctx.transform(1, 0, -s.lean, 1, 0, 0);
  ctx.scale(sx, sy);

  const scr = curScale(ctx);
  const lw = 3.3 * clamp(scr / 150, 0.4, 1.15);
  const fill = s.fill || C.orange;

  // legs
  const legLen = L * (1 - s.tuck);
  const lift = s.walkAmt;
  for (let i = 0; i < 4; i++) {
    const g = i % 2;
    const ph = s.walk * TAU + g * Math.PI;
    const up = Math.max(0, Math.sin(ph)) * lift * 0.09;
    const fwd = Math.cos(ph) * lift * 0.035;
    const spread = (LEG_X[i] < 0 ? -1 : 1) * s.legSpread * 0.05;
    const lx = LEG_X[i] + fwd + spread;
    const top = -legLen - 0.03;
    const h = Math.max(0.02, legLen + 0.03 - up);
    rect(ctx, lx - LEG_W / 2, top, LEG_W, h, { r: 0.012, fill, lw, seed: 10 + i, seg: 8 });
  }
  ctx.translate(0, -legLen + L);

  // arms behind
  if (!s.armL?.front && !s.armL?.hide) drawArm(ctx, -1, s.armL, lw, 21);
  if (!s.armR?.front && !s.armR?.hide) drawArm(ctx, 1, s.armR, lw, 22);

  // body
  rect(ctx, -W / 2, -L - H, W, H, { r: 0.035, fill, lw, seed: 1, seg: 12 });
  // subtle top highlight stroke, like a crayon pass
  ctx.save();
  ctx.globalAlpha *= 0.28;
  line(ctx, [[-W / 2 + 0.07, -L - H + 0.06], [W / 2 - 0.2, -L - H + 0.055]], { lw: lw * 1.4, stroke: C.orangeLight, seed: 3 });
  ctx.restore();

  eyePair(ctx, s, lw);

  if (s.armL?.front && !s.armL?.hide) drawArm(ctx, -1, s.armL, lw, 21);
  if (s.armR?.front && !s.armR?.hide) drawArm(ctx, 1, s.armR, lw, 22);
  ctx.restore();
}

// world-space anchor helpers
export function cubeTop(st) { return st.y - st.size * (L * (1 - (st.tuck || 0)) + H) * (1 - (st.sq || 0)); }
export function cubeCenter(st) { return { x: st.x, y: st.y - st.size * (L + H / 2) * (1 - (st.sq || 0)) }; }
export const CUBE_DIMS = { W, H, L };

// standard emote position above the cube
export function cubeEmote(ctx, st, type, k, dx = 0.35, seed = 7) {
  const top = cubeTop(st);
  emote(ctx, type, st.x + st.size * dx * (st.flip || 1), top - st.size * 0.12, st.size * 0.45, k, seed);
}

// walk helpers: legs phase from distance travelled
export function walkPhase(dist, size, stride = 0.28) { return dist / (size * stride); }
export function blinkAt(t, times, dur = 0.14) {
  for (const b of times) {
    const d = t - b;
    if (d >= 0 && d < dur) return Math.sin((d / dur) * Math.PI);
  }
  return 0;
}
// automatic idle blinking (deterministic)
export function autoBlink(t, seed = 1, every = 3.2) {
  const i = Math.floor(t / every);
  const off = hash2(i, seed) * (every - 0.3);
  const d = t - i * every - off;
  if (d >= 0 && d < 0.15) return Math.sin((d / 0.15) * Math.PI);
  return 0;
}

// cube + its emotes ({type, k, dx}) in one call
export function drawCubeFx(ctx, st) {
  drawCube(ctx, st);
  for (const e of [st.emote, st.emote2]) {
    if (!e || !(e.k > 0)) continue;
    cubeEmote(ctx, { ...CUBE_DEFAULT, ...st }, e.type, e.k, e.dx ?? 0.35, e.seed ?? 7);
  }
}

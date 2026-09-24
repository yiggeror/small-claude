// The human: a tired young programmer in a soft sage hoodie, tousled dark-brown hair, grey trousers, slippers.
// Drawn in the same flat doodle language as the rest of the film: soft rounded outlines, simple features.
// Three rigs: seated back view (wide shots), side view (standing/walking), front bust (close-ups).
import { C, shape, line, ellipse, circle, limb, ik } from './draw.js';
import { clamp, lerp, TAU, hash2 } from './core.js';

// ---------------------------------------------------------------- helpers
// closed Catmull-Rom spline through control points → dense smooth outline (drawn with subdiv:false)
function spline(pts, closed = true, per = 6) {
  const n = pts.length, out = [];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a0 = closed || i > 0 ? p0 : p1, a3 = closed || i < n - 2 ? p3 : p2;
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-a0[k] + p2[k]) * t + (2 * a0[k] - 5 * p1[k] + 4 * p2[k] - a3[k]) * t2 + (-a0[k] + 3 * p1[k] - 3 * p2[k] + a3[k]) * t3)));
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
const soft = (ctx, pts, o) => shape(ctx, spline(pts, o.closed !== false), { ...o, subdiv: false });
// rounded outline of a hair mass: ellipse arc with gentle tufts (not spikes)
function tuftArc(cx, cy, rx, ry, a0, a1, n, bump, seed) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    const r = 1 + (i % 2 ? bump * (0.6 + hash2(i, seed) * 0.8) : 0);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
}
const HAIR = { fill: C.hair, lw: 2.6 };
const HAIR_HI = '#5a4a40';

// =============================================================== BACK VIEW (seated)
// origin: hip centre on the seat. p: { lean, hunch, headTilt, headTurn, headDrop, armsUp, typeK, typePh, rub, stand }
export function drawHumanBack(ctx, p = {}) {
  const lean = p.lean || 0, hunch = p.hunch || 0;
  const armsUp = clamp(p.armsUp || 0);
  const stand = clamp(p.stand || 0);
  ctx.save();
  ctx.translate(0, -stand * 40);
  // legs when standing (seen from behind)
  if (stand > 0.05) {
    for (const s of [-1, 1]) {
      limb(ctx, [[s * 7.5, -4], [s * 8, 20 + stand * 18]], 12.5, C.pants, { seed: 3001 + s });
      ellipse(ctx, s * 8.2, 21 + stand * 18.5, 5.2, 2.4, { fill: C.slipper, seed: 3003 + s, lw: 2.2 });
    }
  }
  ctx.rotate(lean);
  const torsoH = 47 - hunch * 4;
  const shW = 18.5;
  const typeJ = p.typeK ? Math.sin((p.typePh || 0) * 18) * 0.45 * p.typeK : 0;
  const shY = -torsoH + typeJ;
  const shoulderRaise = armsUp * 3;
  const armPath = (s) => {
    if (armsUp > 0.01) {
      const sh = [s * (shW - 4), shY + 5 - shoulderRaise];
      const hand = [lerp(s * (shW + 5), s * 4, armsUp), lerp(shY + 42, shY - 58, armsUp)];
      const j = ik(sh, hand, 25, 25, s > 0 ? 1 : -1);
      return [sh, j.joint, j.end];
    }
    if (p.rub && s === 1) {
      const k = clamp(p.rub);
      const sh = [s * (shW - 4), shY + 5];
      const hand = [lerp(s * 19, s * 7, k), lerp(shY + 30, shY - 12, k)];
      const j = ik(sh, hand, 25, 23, 1);
      return [sh, j.joint, j.end];
    }
    // relaxed: upper arms hang at the sides, forearms go forward to the keyboard (hidden)
    const sh = [s * (shW - 3.5), shY + 5];
    return [sh, [s * (shW + 0.5), shY + 24], [s * (shW - 3), shY + 33]];
  };
  // torso: soft hoodie back — sloped shoulders, a little slouch, hem at the seat
  const tp = [
    [-6.5, shY - 1.5 - shoulderRaise * 0.3], [-13, shY + 0.5 - shoulderRaise], [-shW + 0.5, shY + 5], [-shW - 0.8, shY + 16], [-shW + 0.2, -8], [-shW + 1.6, -1],
    [shW - 1.6, -1], [shW - 0.2, -8], [shW + 0.8, shY + 16], [shW - 0.5, shY + 5], [13, shY + 0.5 - shoulderRaise], [6.5, shY - 1.5 - shoulderRaise * 0.3],
  ];
  if (armsUp > 0.01) {
    for (const s of [-1, 1]) {
      const ap = armPath(s);
      limb(ctx, ap, 10.5, C.hoodie, { seed: 3010 + s });
      circle(ctx, ap[2][0], ap[2][1], 3.6, { fill: C.skin, seed: 3015 + s, lw: 2.4 });
    }
  }
  soft(ctx, tp, { fill: C.hoodie, seed: 3020, lw: 3 });
  // hem band + back seam
  line(ctx, [[-shW + 1.4, -6.5], [shW - 1.4, -6.5]], { lw: 1.6, stroke: C.hoodieShade, seed: 3022 });
  line(ctx, [[0, shY + 20], [0.4, -9]], { lw: 1.2, stroke: C.hoodieShade, seed: 3021 });
  if (armsUp <= 0.01) {
    for (const s of [-1, 1]) {
      const ap = armPath(s);
      limb(ctx, ap, 10, C.hoodie, { seed: 3030 + s });
      if (p.rub && s === 1) circle(ctx, ap[2][0], ap[2][1], 3.6, { fill: C.skin, seed: 3035, lw: 2.4 });
    }
  }
  // hood, lying on the upper back
  soft(ctx, [[-10, shY - 0.5], [-10.5, shY + 6], [-6, shY + 11.5], [0, shY + 12.8], [6, shY + 11.5], [10.5, shY + 6], [10, shY - 0.5], [0, shY + 2]], { fill: C.hoodie, seed: 3040, lw: 2.6 });
  line(ctx, [[-6, shY + 4], [0, shY + 8.6], [6, shY + 4]], { lw: 1.4, stroke: C.hoodieShade, seed: 3041 });
  // head
  const hy = shY - 2 + hunch * 4 + (p.headDrop || 0) * 6;
  ctx.save();
  ctx.translate(0, hy);
  ctx.rotate(p.headTilt || 0);
  ctx.scale(1.08, 1.08);
  const turn = clamp(p.headTurn || 0, -1, 1);
  // neck
  soft(ctx, [[-4, 1], [-4.2, -5], [4.2, -5], [4, 1]], { fill: C.skin, seed: 3050, lw: 2.2 });
  // skull + ears
  for (const s of [-1, 1]) {
    const vis = s * turn < 0 ? 1 - Math.abs(turn) * 0.8 : 1;
    ellipse(ctx, s * 9.3 + turn * 1.6, -13.2, 1.9, 2.8, { fill: C.skin, seed: 3052 + s, lw: 2, alpha: vis });
  }
  ellipse(ctx, turn * 1.4, -15, 9.4, 10.8, { fill: C.skin, seed: 3051, lw: 2.6 });
  // cheek sliver when turned
  if (Math.abs(turn) > 0.05) {
    const s = Math.sign(turn);
    ellipse(ctx, s * 6.5 + turn * 3, -9.5, 3.2 * Math.abs(turn), 4.2, { fill: C.skin, noStroke: true, seed: 3055 });
  }
  // hair from behind: a rounded, slightly tousled mass with a soft nape line
  const hp = tuftArc(-turn * 0.8, -16.2, 10.1, 11.3, Math.PI * 0.94, Math.PI * 2.06, 10, 0.018, 7);
  hp.push([9.2, -9.8], [7, -7.2], [4, -7.6], [1.2, -6.2], [-1.8, -7.4], [-4.8, -6.4], [-7.4, -7.6], [-9.4, -9.6]);
  soft(ctx, hp, { ...HAIR, seed: 3060 });
  // whorl + a few strands
  line(ctx, [[-1.5, -22.5], [0.6, -20.4], [2.8, -21.6]], { lw: 1.2, stroke: HAIR_HI, seed: 3061 });
  line(ctx, [[-4.5, -17], [-3.4, -11.5]], { lw: 1.1, stroke: HAIR_HI, seed: 3062 });
  line(ctx, [[4, -16.5], [3.4, -11]], { lw: 1.1, stroke: HAIR_HI, seed: 3063 });
  // cowlick
  line(ctx, [[1.2, -26.4], [2.4, -28.4], [4.4, -28.6]], { lw: 2.2, stroke: C.hair, seed: 3064 });
  ctx.restore();
  ctx.restore();
}

// =============================================================== SIDE VIEW (standing / walking)
// origin: between the feet on the floor. faces +x (use ctx.scale(-1,1) for left).
// p: { walk (phase, 1 = one full stride cycle), walkAmt, lean, headTilt, reach: {x,y,k}, bob, eyes, mouth, carry, armOut }
const HIP_H = 84, THIGH = 43, SHIN = 43, TORSO = 50, UPPER = 26, FORE = 24;
const STEP = 44; // body travel per step (a full cycle is two steps — matches walk = dist / 88)

// foot position/pitch for one leg; q in [0,1): 0 = heel strike (front), 0.5 = toe-off (back)
function footAt(q, amt) {
  const S = STEP * amt;
  if (q < 0.5) {
    const u = q / 0.5;
    // stance: foot planted, sliding back relative to the hips at body speed; heel → flat → heel lifts
    const pitch = u < 0.15 ? -0.28 * (1 - u / 0.15) : u > 0.7 ? 0.45 * ((u - 0.7) / 0.3) : 0;
    return { x: S / 2 - S * u, y: 0, pitch: pitch * amt };
  }
  const u = (q - 0.5) / 0.5;
  const e = u * u * (3 - 2 * u);
  const lift = Math.sin(Math.PI * Math.min(1, u * 1.1)) * 7.5 * amt;
  const pitch = u < 0.4 ? 0.45 * (1 - u / 0.4) + 0.1 : -0.28 * ((u - 0.4) / 0.6);
  return { x: -S / 2 + S * e, y: -lift, pitch: pitch * amt };
}

export function drawHumanSide(ctx, p = {}) {
  const ph = ((p.walk || 0) % 1 + 1) % 1;
  const amt = clamp(p.walkAmt ?? 0);
  // hips: lowest at double support, highest at passing
  const bob = Math.cos(ph * 2 * TAU) * 1.6 * amt + (p.bob || 0);
  const hip = [0, -HIP_H + bob + 1.2 * amt];
  const lean = (p.lean || 0) + 0.05 * amt;
  const sh = [hip[0] + Math.sin(lean) * TORSO, hip[1] - Math.cos(lean) * TORSO];

  const legs = [0, 1].map((i) => footAt((ph + i * 0.5) % 1, amt));
  const leg = (i, col, seed) => {
    const f = legs[i];
    const ankle = [f.x + (p.footOff?.[i] || 0), f.y - 4.5];
    const k = ik([hip[0] + (i ? 1.5 : -1), hip[1] + 4], ankle, THIGH - 2, SHIN - 4, 1);
    limb(ctx, [[hip[0] + (i ? 1.5 : -1), hip[1] + 2], k.joint, k.end], i ? 12 : 11.5, col, { seed });
    // slipper: pivots around the ball of the foot while the heel lifts
    ctx.save();
    ctx.translate(k.end[0], k.end[1] + 3.2);
    ctx.rotate(f.pitch);
    soft(ctx, [[-5.5, 1.3], [-6.4, -2.2], [-2, -4.6], [5.5, -3.8], [11, -1.2], [11.2, 1.3]], { fill: C.slipper, seed: seed + 4, lw: 2.2 });
    line(ctx, [[1.5, -4], [3.5, 1]], { lw: 1.2, stroke: C.slipperShade, seed: seed + 5 });
    ctx.restore();
  };
  // arms swing opposite to the legs; the elbow bends more on the forward swing
  const armSwing = (i) => -Math.cos(TAU * ((ph + i * 0.5) % 1)) * 0.38 * amt;
  const arm = (i, col, seed) => {
    const shoulder = [sh[0] - 1.5, sh[1] + 5];
    let hand;
    if (i === 1 && p.reach && p.reach.k > 0) {
      const rest = [shoulder[0] + 4, shoulder[1] + 47];
      hand = [lerp(rest[0], p.reach.x, p.reach.k), lerp(rest[1], p.reach.y, p.reach.k)];
    } else if (p.carry && i === 1) {
      hand = [shoulder[0] + 20, shoulder[1] + 30];
    } else {
      const a = armSwing(i) + (p.armOut || 0) + 0.04;
      const bend = 0.18 + Math.max(0, a) * 0.9;
      const el = [shoulder[0] + Math.sin(a) * UPPER, shoulder[1] + Math.cos(a) * UPPER];
      hand = [el[0] + Math.sin(a + bend) * FORE, el[1] + Math.cos(a + bend) * FORE];
    }
    const k = ik(shoulder, hand, UPPER, FORE, -1);
    limb(ctx, [shoulder, k.joint, k.end], 9.5, col, { seed });
    // hand: small rounded mitten, thumb forward
    ctx.save();
    ctx.translate(k.end[0], k.end[1]);
    const d = Math.atan2(k.end[0] - k.joint[0], k.end[1] - k.joint[1]);
    ctx.rotate(-d);
    soft(ctx, [[-2.4, -0.5], [-2.8, 3], [-1.6, 5.4], [1.4, 5.6], [2.8, 3.4], [2.6, -0.5]], { fill: C.skin, seed: seed + 3, lw: 2.2 });
    ctx.restore();
    return k.end;
  };

  // far side first
  leg(0, C.pantsShade, 3101);
  arm(0, C.hoodieShade, 3111);
  leg(1, C.pants, 3102);
  // torso: hoodie in profile — rounded back, soft chest, hem over the hips
  const nx = Math.cos(lean), ny = Math.sin(lean);
  // local torso frame: a = forward, b = up from the hip
  const T = (a, b) => [hip[0] + nx * a + Math.sin(lean) * b, hip[1] + ny * a - Math.cos(lean) * b];
  const tp = [T(-11, -6), T(10.5, -6.5), T(12, 6), T(11.5, 22), T(12.5, 36), T(9, 46), T(2, 51), T(-6, 51), T(-11.5, 44), T(-13, 30), T(-12.5, 12)];
  soft(ctx, tp, { fill: C.hoodie, seed: 3120, lw: 3 });
  // hood bump behind the neck, pocket, hem band
  soft(ctx, [T(-12, 42), T(-14.5, 49), T(-8, 55.5), T(-1, 53), T(-4, 47)], { fill: C.hoodie, seed: 3122, lw: 2.4 });
  line(ctx, [T(1, 15), T(11.5, 15.5)], { lw: 1.4, stroke: C.hoodieShade, seed: 3123 });
  line(ctx, [T(-10.5, -2), T(10.5, -2.5)], { lw: 1.4, stroke: C.hoodieShade, seed: 3124 });
  // head
  ctx.save();
  ctx.translate(sh[0] + 2.5, sh[1] + 1.5);
  ctx.rotate(p.headTilt || 0);
  drawProfileHead(ctx, p);
  ctx.restore();
  // near arm on top
  const handPos = arm(1, C.hoodie, 3112);
  return { hand: handPos, shoulder: sh };
}

// head in profile (faces +x); origin at the base of the neck
function drawProfileHead(ctx, p) {
  soft(ctx, [[-3.6, 1], [-3.8, -6.5], [3.4, -6.5], [3.6, 1]], { fill: C.skin, seed: 3130, lw: 2.1 });
  // skull + face: rounded back, gentle forehead, small nose, soft chin
  soft(ctx, [[-9, -12], [-7.5, -20.5], [0, -24.5], [7.5, -22], [10.5, -16], [11, -12], [12.6, -9.8], [11.2, -8.4], [10.8, -5.6], [8.6, -3], [4.6, -2.6], [-2, -4.2], [-7.6, -7]], { fill: C.skin, seed: 3131, lw: 2.6 });
  // ear
  ellipse(ctx, -0.8, -11.4, 2, 2.8, { fill: C.skin, seed: 3135, lw: 2 });
  line(ctx, [[-0.9, -12.6], [-0.2, -10.6]], { lw: 1, stroke: C.inkSoft, seed: 3137 });
  // eye
  const eyes = p.eyes || 'open';
  if (eyes === 'closed') line(ctx, [[5.4, -12.4], [6.8, -12], [8.2, -12.4]], { lw: 1.9, seed: 3133 });
  else if (eyes === 'half') { ellipse(ctx, 6.9, -12, 0.8, 0.9, { fill: C.ink, seed: 3133, lw: 1 }); line(ctx, [[5.4, -13.1], [8.4, -12.8]], { lw: 1.8, seed: 3138 }); }
  else ellipse(ctx, 6.9, -12.4, 0.85, 1.5, { fill: C.ink, seed: 3133, lw: 1 });
  // brow
  line(ctx, [[5, -15.6], [8.6, -15.4]], { lw: 1.5, seed: 3139 });
  // mouth
  if (p.mouth === 'yawn') ellipse(ctx, 8.8, -5.6, 1.3, 1.9, { fill: C.mouth, seed: 3134, lw: 1.6 });
  else if (p.mouth === 'smile') line(ctx, [[7.2, -6], [8.6, -5.1], [9.8, -6]], { lw: 1.6, seed: 3134 });
  else line(ctx, [[8, -5.6], [9.9, -5.7]], { lw: 1.4, seed: 3134 });
  // hair: rounded crown, short at the nape, soft fringe falling over the forehead
  const hp = [[11.2, -15.2], [10.6, -20.2], [7.4, -24.2], [1.5, -26.4], [-4.8, -25], [-9.2, -21], [-10.6, -15.5], [-10, -10.2], [-8.6, -6.8], [-7, -7.6], [-5.8, -5.8], [-4.4, -8.2], [-2.8, -9.8], [-2.4, -13.6], [0.2, -15.6], [3, -16.4], [5.6, -15.6], [8.2, -17.2], [10, -15.6], [11.5, -13.6]];
  soft(ctx, hp, { ...HAIR, seed: 3136 });
  line(ctx, [[-3, -22.5], [2.5, -21.2]], { lw: 1.1, stroke: HAIR_HI, seed: 3140 });
  line(ctx, [[-6.6, -17.5], [-4.6, -12.5]], { lw: 1.1, stroke: HAIR_HI, seed: 3141 });
}

// =============================================================== FRONT BUST (close-ups)
// origin: bottom centre of frame-bust (chest). units ~cm.
// p: { eyes: 'open'|'half'|'closed'|'happy'|'squint'|'wide', lookX, lookY, lid (0..1 extra droop), blink,
//      brows: {l, r} tilt, browY, mouth: 'neutral'|'smile'|'yawn'|'o'|'frown'|'smirk'|'chew'|'flat', mouthK, tilt, turn, blush,
//      headY, fringeY, hands: fn(ctx) drawn on top }
export function drawHumanFront(ctx, p = {}) {
  const tilt = p.tilt || 0;
  const turn = clamp(p.turn || 0, -1, 1);
  // shoulders & hoodie: sloped shoulders, soft sleeves
  soft(ctx, [[-25, 4], [-24.5, -8], [-21.5, -17.5], [-14, -23], [-6, -25.5], [6, -25.5], [14, -23], [21.5, -17.5], [24.5, -8], [25, 4]], { fill: C.hoodie, seed: 3201, lw: 3 });
  // sleeve seams
  line(ctx, [[-16.5, -21], [-18, -6]], { lw: 1.4, stroke: C.hoodieShade, seed: 3205 });
  line(ctx, [[16.5, -21], [18, -6]], { lw: 1.4, stroke: C.hoodieShade, seed: 3206 });
  // hood: a soft roll around the back of the neck
  soft(ctx, [[-11.5, -28.2], [-12.8, -23], [-8.5, -19.6], [0, -18.8], [8.5, -19.6], [12.8, -23], [11.5, -28.2], [5.2, -25.6], [0, -25.1], [-5.2, -25.6]], { fill: C.hoodieShade, seed: 3202, lw: 2.4 });
  // drawstrings
  line(ctx, [[-3.6, -21.5], [-3.9, -11.5]], { lw: 1.6, seed: 3203 });
  line(ctx, [[3.6, -21.5], [4, -12]], { lw: 1.6, seed: 3204 });
  circle(ctx, -3.9, -11, 0.6, { fill: C.hoodieShade, seed: 3207, lw: 1.2 });
  circle(ctx, 4, -11.5, 0.6, { fill: C.hoodieShade, seed: 3208, lw: 1.2 });
  ctx.save();
  ctx.translate(0, -24 + (p.headY || 0));
  ctx.rotate(tilt);
  // neck (short; mostly hidden by the hood)
  soft(ctx, [[-4.3, 1.5], [-4.4, -5], [4.4, -5], [4.3, 1.5]], { fill: C.skin, seed: 3210, lw: 2.2 });
  line(ctx, [[-3.2, -2.2], [0, -1.4], [3.2, -2.2]], { lw: 1.2, stroke: C.skinShade, seed: 3209 });
  // ears
  ellipse(ctx, -9.9 + turn * 1.5, -14.6, 1.9, 2.9, { fill: C.skin, seed: 3211, lw: 2 });
  ellipse(ctx, 9.9 + turn * 1.5, -14.6, 1.9, 2.9, { fill: C.skin, seed: 3212, lw: 2 });
  // face: rounded, a gently narrower chin
  const fc = turn * 1.2;
  soft(ctx, [[fc - 9.6, -17], [fc - 9, -23], [fc - 4.6, -26.8], [fc + 4.6, -26.8], [fc + 9, -23], [fc + 9.6, -17], [fc + 9, -10.5], [fc + 6.4, -6], [fc + 2.6, -3.9], [fc - 2.6, -3.9], [fc - 6.4, -6], [fc - 9, -10.5]], { fill: C.skin, seed: 3213, lw: 2.6 });
  const fx = turn * 3;
  // blush (always a hint of warmth; stronger when asked)
  const bl = 0.18 + (p.blush || 0) * 0.55;
  for (const s of [-1, 1]) ellipse(ctx, fx + s * 6, -10.2, 1.9, 1, { fill: `rgba(236,140,120,${bl})`, noStroke: true, seed: 3214 + s });
  // eyes
  const eyes = p.eyes || 'open';
  const lx = (p.lookX || 0) * 1.1, ly = (p.lookY || 0) * 0.8;
  const lid = clamp((p.lid || 0) + (p.blink || 0));
  for (const s of [-1, 1]) {
    const ex = fx + s * 4.2 + lx, ey = -13.8 + ly;
    if (eyes === 'closed' || lid > 0.92) line(ctx, [[ex - 1.5, ey + 0.3], [ex, ey + 0.9], [ex + 1.5, ey + 0.3]], { lw: 1.9, seed: 3220 + s });
    else if (eyes === 'happy') line(ctx, [[ex - 1.5, ey + 0.6], [ex, ey - 0.8], [ex + 1.5, ey + 0.6]], { lw: 1.9, seed: 3220 + s });
    else if (eyes === 'squint') line(ctx, [[ex - 1.7, ey], [ex + 1.7, ey - 0.1 * s]], { lw: 2.2, seed: 3220 + s });
    else {
      const big = eyes === 'wide' ? 1.3 : 1;
      const h = 1.9 * big * (1 - lid);
      ellipse(ctx, ex, ey + (1.9 * big - h) * 0.5, 0.95 * big, Math.max(0.3, h), { fill: C.ink, seed: 3220 + s, lw: 1 });
      if (h > 0.9) circle(ctx, ex - 0.3, ey - 0.5 + (1.9 * big - h) * 0.5, 0.28, { fill: C.white, noStroke: true, seed: 3226 + s });
      if (lid > 0.2) line(ctx, [[ex - 1.7, ey - 1.9 + lid * 2.4], [ex + 1.7, ey - 1.9 + lid * 2.4]], { lw: 1.6, seed: 3225 + s });
    }
  }
  // nose
  line(ctx, [[fx + 0.2, -10.6], [fx + 0.8, -9.3], [fx - 0.1, -9]], { lw: 1.3, seed: 3232, stroke: C.inkSoft });
  // mouth
  const my = -6.8, mk = p.mouthK ?? 1;
  switch (p.mouth || 'neutral') {
    case 'smile': line(ctx, [[fx - 2.2, my - 0.4], [fx - 0.9, my + 0.7], [fx + 0.9, my + 0.7], [fx + 2.2, my - 0.4]], { lw: 1.8, seed: 3240 }); break;
    case 'smirk': line(ctx, [[fx - 1.8, my + 0.2], [fx + 0.5, my + 0.4], [fx + 2.2, my - 0.8]], { lw: 1.8, seed: 3240 }); break;
    case 'yawn': ellipse(ctx, fx, my + 0.4, 1.5 + mk * 1.2, 0.9 + mk * 2.6, { fill: C.mouth, seed: 3240, lw: 1.8 }); break;
    case 'o': ellipse(ctx, fx, my + 0.3, 1 * mk + 0.4, 1.3 * mk + 0.4, { fill: C.mouth, seed: 3240, lw: 1.7 }); break;
    case 'frown': line(ctx, [[fx - 2, my + 0.7], [fx, my - 0.3], [fx + 2, my + 0.7]], { lw: 1.8, seed: 3240 }); break;
    case 'chew': {
      const o = Math.abs(Math.sin(mk * Math.PI));
      ellipse(ctx, fx, my + 0.3, 1.6, 0.4 + o * 1, { fill: C.mouth, seed: 3240, lw: 1.7 });
      break;
    }
    case 'flat': line(ctx, [[fx - 1.7, my], [fx + 1.7, my]], { lw: 1.8, seed: 3240 }); break;
    default: line(ctx, [[fx - 1.4, my], [fx + 1.4, my + 0.1]], { lw: 1.7, seed: 3240 });
  }
  // hair: soft tousled crop with a side-swept fringe (locks sweep to his right)
  const hx = turn * 1.4, fy = p.fringeY || 0;
  const crown = [[10.5, -16.4], [11.4, -21.2], [10.3, -26.2], [6.6, -29.7], [1, -31], [-5, -30.3], [-9.4, -27.5], [-11.2, -22.6], [-10.9, -17.2]];
  const fringe = [[-9.7, -19.4], [-8.3, -23.6], [-5, -21.6], [-1.4, -19.5], [0.2, -22.4], [3.6, -20.6], [6.5, -18.9], [7.4, -21.8], [9.7, -19.6]];
  soft(ctx, [...crown.map(([x, y]) => [x + hx, y]), ...fringe.map(([x, y]) => [x + hx, y + fy])], { ...HAIR, seed: 3250 });
  line(ctx, [[-7.2 + hx, -26.6], [-3.4 + hx, -23.6], [-0.6 + hx, -21.4]], { lw: 1.1, stroke: HAIR_HI, seed: 3251 });
  line(ctx, [[1.5 + hx, -27.6], [4.4 + hx, -24], [6 + hx, -20.8]], { lw: 1.1, stroke: HAIR_HI, seed: 3252 });
  // a stray tuft on top
  line(ctx, [[0.5 + hx, -30.2], [1.4 + hx, -32.4], [3.4 + hx, -32.8]], { lw: 2, stroke: C.hair, seed: 3253 });
  // brows (drawn over the fringe so expressions always read)
  const bY = -18.2 + (p.browY || 0);
  const bl2 = p.brows?.l || 0, br = p.brows?.r || 0;
  line(ctx, [[fx - 6, bY + bl2 * 0.9], [fx - 2.6, bY - bl2 * 0.9]], { lw: 1.7, seed: 3230 });
  line(ctx, [[fx + 2.6, bY - br * 0.9], [fx + 6, bY + br * 0.9]], { lw: 1.7, seed: 3231 });
  ctx.restore();
  if (p.hands) p.hands(ctx);
}

// simple rounded hand, local units cm, pointing up by default (sleeve below)
export function drawHand(ctx, x, y, rot = 0, s = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (o.sleeve !== false) {
    limb(ctx, [[0, 18], [0, 5.5]], 9.5, C.hoodie, { seed: 3301 });
    line(ctx, [[-4.6, 7.2], [4.6, 7.2]], { lw: 1.3, stroke: C.hoodieShade, seed: 3304 });
  }
  soft(ctx, [[-3.8, 4.5], [-4.2, -1.5], [-3.4, -6.4], [-1.2, -7.6], [1.4, -7.4], [3.6, -6], [4.1, -1], [3.7, 4.5]], { fill: C.skin, seed: 3302, lw: 2.2 });
  // thumb
  soft(ctx, [[-3.8, 1.8], [-6.2, -1.2], [-6, -3.3], [-4.1, -2.4]], { fill: C.skin, seed: 3303, lw: 2 });
  // finger hints
  line(ctx, [[-1.2, -7], [-1.2, -4.8]], { lw: 1, stroke: C.inkSoft, seed: 3305 });
  line(ctx, [[1.3, -6.9], [1.3, -4.8]], { lw: 1, stroke: C.inkSoft, seed: 3306 });
  ctx.restore();
}

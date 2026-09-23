// The human: a sleepy programmer in a cream hoodie, messy black hair, dark pants.
// Three rigs: seated back view (wide shots), side view (standing/walking), front bust (close-ups).
import { C, shape, rect, line, ellipse, circle, limb, ik, curScale } from './draw.js';
import { clamp, lerp, TAU, hash2 } from './core.js';

// spiky hair outline: angles a0→a1 around an ellipse; alternating base / tip points (pointy strands)
function hairPts(cx, cy, rx, ry, a0, a1, n, spike, seed, sweep = 0.12) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    if (i % 2 === 1) {
      const len = spike * (0.5 + hash2(i, seed) * 0.9);
      const aa = a + sweep * (hash2(i + 7, seed) - 0.3);
      pts.push([cx + Math.cos(aa) * rx * (1 + len), cy + Math.sin(aa) * ry * (1 + len)]);
    } else {
      const r = 1 - 0.03 * hash2(i, seed + 1);
      pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
  }
  return pts;
}
const HAIR = { fill: C.hair, lw: 2.6, sharp: true, subdiv: false, amp: 0.6 };

// =============================================================== BACK VIEW (seated)
// origin: hip centre on the seat. p: { lean, hunch, headTilt, headTurn, headDrop, armsUp, type, typeK, rub, stand, legs }
export function drawHumanBack(ctx, p = {}) {
  const lean = p.lean || 0, hunch = p.hunch || 0;
  const armsUp = clamp(p.armsUp || 0);
  const stand = clamp(p.stand || 0);
  ctx.save();
  ctx.translate(0, -stand * 38);
  // legs when standing (seen from behind)
  if (stand > 0.05) {
    for (const s of [-1, 1]) {
      limb(ctx, [[s * 8, -2], [s * 9, 22 + stand * 16]], 12, C.pants, { seed: 3001 + s });
    }
  }
  ctx.rotate(lean);
  const torsoH = 50 - hunch * 5;
  const shW = 23;
  const typeJ = p.typeK ? Math.sin((p.typePh || 0) * 18) * 0.5 * p.typeK : 0;
  const shY = -torsoH + typeJ;
  const shoulderRaise = armsUp * 3;
  // arms up (behind head) are drawn before the head
  const armPath = (s) => {
    if (armsUp > 0.01) {
      const sh = [s * (shW - 4), shY + 4 - shoulderRaise];
      const hand = [lerp(s * (shW + 6), s * 4, armsUp), lerp(shY + 44, shY - 62, armsUp)];
      const j = ik(sh, hand, 26, 26, s > 0 ? 1 : -1);
      return [sh, j.joint, j.end];
    }
    if (p.rub && s === 1) {
      const k = clamp(p.rub);
      const sh = [s * (shW - 4), shY + 4];
      const hand = [lerp(s * 21, s * 7, k), lerp(shY + 30, shY - 14, k)];
      const j = ik(sh, hand, 26, 24, 1);
      return [sh, j.joint, j.end];
    }
    const sh = [s * (shW - 4), shY + 4];
    return [sh, [s * (shW + 1), shY + 26], [s * (shW - 3), shY + 36]];
  };
  // torso (hoodie back)
  const tp = [[-shW + 2, shY + 2], [-shW - 1, shY + 10], [-shW + 1, -2], [shW - 1, -2], [shW + 1, shY + 10], [shW - 2, shY + 2], [shW - 8, shY - 2 - shoulderRaise], [-shW + 8, shY - 2 - shoulderRaise]];
  // arms: upper arms visible at the sides when relaxed
  if (armsUp > 0.01) {
    for (const s of [-1, 1]) {
      const ap = armPath(s);
      limb(ctx, ap, 11, C.hoodie, { seed: 3010 + s });
      circle(ctx, ap[2][0], ap[2][1], 4, { fill: C.skin, seed: 3015 + s, lw: 2.6 });
    }
  }
  shape(ctx, tp, { fill: C.hoodie, seed: 3020, lw: 3 });
  // spine crease + hem
  line(ctx, [[0, shY + 18], [0.5, -6]], { lw: 1.4, stroke: C.hoodieShade, seed: 3021 });
  line(ctx, [[-shW + 2, -7], [shW - 2, -7]], { lw: 1.6, stroke: C.hoodieShade, seed: 3022 });
  if (armsUp <= 0.01) {
    for (const s of [-1, 1]) {
      const ap = armPath(s);
      limb(ctx, ap, 11, C.hoodie, { seed: 3030 + s });
      if (p.rub && s === 1) circle(ctx, ap[2][0], ap[2][1], 4, { fill: C.skin, seed: 3035, lw: 2.6 });
    }
  }
  // hood lump
  shape(ctx, [[-11, shY - 1], [-12, shY + 8], [-5, shY + 14], [5, shY + 14], [12, shY + 8], [11, shY - 1]], { fill: C.hoodie, seed: 3040, lw: 2.8 });
  line(ctx, [[-7, shY + 3], [0, shY + 9], [7, shY + 3]], { lw: 1.6, stroke: C.hoodieShade, seed: 3041 });
  // head
  const hx = 0, hy = shY - 4 + hunch * 5 + (p.headDrop || 0) * 6;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(p.headTilt || 0);
  ctx.scale(1.18, 1.18);
  const turn = clamp(p.headTurn || 0, -1, 1);
  // neck
  rect(ctx, -4.5, -6, 9, 7, { fill: C.skin, seed: 3050, lw: 2.4 });
  // head skin
  ellipse(ctx, turn * 1.5, -17, 10, 12, { fill: C.skin, seed: 3051, lw: 2.8 });
  // ears
  for (const s of [-1, 1]) {
    const vis = s * turn < 0 ? 1 - Math.abs(turn) * 0.8 : 1;
    ellipse(ctx, s * (9.6 - Math.abs(turn) * 1.5 * (s * turn > 0 ? -1 : 1)) + turn * 1.5, -15, 2.2, 3.2, { fill: C.skin, seed: 3052 + s, lw: 2.2, alpha: vis });
  }
  // cheek sliver when turned
  if (Math.abs(turn) > 0.05) {
    const s = Math.sign(turn);
    ellipse(ctx, s * 7 + turn * 3, -11, 3.5 * Math.abs(turn), 5, { fill: C.skin, noStroke: true, seed: 3055 });
  }
  // hair from behind
  const hp = hairPts(turn * -1, -18.5, 11, 12.2, Math.PI * 0.93, Math.PI * 2.07, 30, 0.1, 7, 0.3);
  hp.push([10.4, -10], [8.6, -6.2], [6.5, -8.8], [4.2, -5], [1.5, -8.6], [-1.2, -4.8], [-3.8, -8.6], [-6.2, -5.4], [-8.4, -8.8], [-10.4, -9.5]);
  shape(ctx, hp, { ...HAIR, seed: 3060 });
  // a few hair strands highlights
  line(ctx, [[-4, -26], [-1, -18]], { lw: 1.2, stroke: '#4d4540', seed: 3061 });
  line(ctx, [[4, -27], [2.5, -20]], { lw: 1.2, stroke: '#4d4540', seed: 3062 });
  ctx.restore();
  ctx.restore();
}

// =============================================================== SIDE VIEW (standing / walking)
// origin: between feet on the floor. faces +x (use ctx.scale(-1,1) for left).
// p: { walk (phase), walkAmt, lean, headTilt, reach: {x,y,k}, backReach, bob, eyes: 'open'|'closed'|'half', mouth, carry }
export function drawHumanSide(ctx, p = {}) {
  const ph = (p.walk || 0) * TAU;
  const amt = p.walkAmt ?? 0;
  const hipH = 80;
  const bob = -Math.abs(Math.cos(ph)) * 2.2 * amt + (p.bob || 0);
  const hip = [0, -hipH + bob + 2 * amt];
  const torsoLen = 52;
  const lean = (p.lean || 0) + 0.06 * amt;
  const sh = [hip[0] + Math.sin(lean) * torsoLen, hip[1] - Math.cos(lean) * torsoLen];
  // feet
  const feet = [];
  for (let i = 0; i < 2; i++) {
    const q = ph + i * Math.PI;
    const stride = 22 * amt;
    const fx = Math.cos(q) * stride;
    const lift = Math.max(0, -Math.sin(q)) * 9 * amt;
    feet.push([fx + (p.footOff?.[i] || 0), -lift - 2]);
  }
  const leg = (i, col) => {
    const k = ik(hip, feet[i], 41, 41, 1);
    limb(ctx, [hip, k.joint, k.end], 15, col, { seed: 3101 + i });
    // shoe
    ctx.save(); ctx.translate(k.end[0], k.end[1] + 2);
    shape(ctx, [[-6, 1], [-6.5, -4], [3, -5.5], [10, -3], [11, 1]], { fill: '#fbf6ec', seed: 3105 + i, lw: 2.4 });
    ctx.restore();
  };
  const armSwing = Math.cos(ph) * 0.45 * amt;
  const arm = (i, col) => {
    const s = i === 0 ? 1 : -1;
    let hand;
    if (i === 1 && p.reach && p.reach.k > 0) {
      const rest = [sh[0] + Math.sin(-armSwing) * 50, sh[1] + 50];
      hand = [lerp(rest[0], p.reach.x, p.reach.k), lerp(rest[1], p.reach.y, p.reach.k)];
    } else if (p.carry && i === 1) {
      hand = [sh[0] + 22, sh[1] + 30];
    } else {
      const a = s * armSwing + (p.armOut || 0);
      hand = [sh[0] + Math.sin(a) * 50, sh[1] + Math.cos(a) * 50];
    }
    const k = ik([sh[0] - 1, sh[1] + 4], hand, 26, 25, -1);
    limb(ctx, [[sh[0] - 1, sh[1] + 4], k.joint, k.end], 11.5, col, { seed: 3111 + i });
    circle(ctx, k.end[0], k.end[1], 4, { fill: C.skin, seed: 3115 + i, lw: 2.4 });
    return k.end;
  };
  // back limbs (slightly darker)
  leg(0, '#2f2c2a');
  arm(0, C.hoodieShade);
  // torso
  const tw = 17;
  const nx = Math.cos(lean), ny = Math.sin(lean);
  const tp = [
    [hip[0] - tw * nx - 1, hip[1] - tw * ny + 9], [hip[0] + tw * nx, hip[1] + tw * ny + 9],
    [sh[0] + (tw - 2) * nx, sh[1] + (tw - 2) * ny + 4], [sh[0] + 4, sh[1] - 3], [sh[0] - (tw - 3), sh[1] - 1],
  ];
  shape(ctx, tp, { fill: C.hoodie, seed: 3120, lw: 3 });
  // hood behind neck
  shape(ctx, [[sh[0] - 14, sh[1] + 2], [sh[0] - 18, sh[1] + 10], [sh[0] - 9, sh[1] + 12], [sh[0] - 3, sh[1] - 2]], { fill: C.hoodie, seed: 3122, lw: 2.6 });
  // pocket
  line(ctx, [[hip[0] + 2, hip[1] - 12], [hip[0] + 13, hip[1] - 14], [hip[0] + 13, hip[1] - 2]], { lw: 1.6, stroke: C.hoodieShade, seed: 3123 });
  leg(1, C.pants);
  // head
  ctx.save();
  ctx.translate(sh[0] + 3, sh[1] - 4);
  ctx.rotate(p.headTilt || 0);
  ctx.scale(1.25, 1.25);
  rect(ctx, -3.5, -6, 7, 8, { fill: C.skin, seed: 3130, lw: 2.2 });
  ellipse(ctx, 1.5, -17, 10.5, 12, { fill: C.skin, seed: 3131, lw: 2.8 });
  // nose bump
  shape(ctx, [[11.6, -14.5], [13.3, -11.8], [11.6, -10.8]], { fill: C.skin, seed: 3132, lw: 2.2, closed: false });
  // eye
  const eyes = p.eyes || 'open';
  if (eyes === 'closed') line(ctx, [[5.8, -13.2], [8.8, -13.2]], { lw: 2.2, seed: 3133 });
  else if (eyes === 'half') line(ctx, [[5.8, -13], [8.8, -13.4]], { lw: 2.6, seed: 3133 });
  else ellipse(ctx, 7.6, -13.2, 0.95, 1.8, { fill: C.ink, seed: 3133, lw: 1 });
  // mouth
  if (p.mouth === 'yawn') ellipse(ctx, 9, -7, 1.6, 2.6, { fill: '#7a2e1c', seed: 3134, lw: 1.8 });
  else if (p.mouth === 'smile') line(ctx, [[7, -7.2], [8.6, -6.3], [10.2, -7.5]], { lw: 1.8, seed: 3134 });
  else line(ctx, [[7.6, -7], [10, -7]], { lw: 1.6, seed: 3134 });
  // ear
  ellipse(ctx, -1.8, -14, 2.2, 3.2, { fill: C.skin, seed: 3135, lw: 2.2 });
  // hair: crown + back, fringe above the eye
  const hp = hairPts(-0.5, -19, 11.4, 11.6, Math.PI * 0.6, Math.PI * 1.97, 26, 0.11, 11, 0.3);
  hp.push([12.4, -17.2], [10.6, -19], [9.6, -15.6], [7.8, -18.6], [6, -15.8], [4.2, -18.4], [2.6, -16.4], [0.8, -17.6], [-2, -15], [-4.4, -10.5], [-7.5, -7.5]);
  shape(ctx, hp, { ...HAIR, seed: 3136 });
  ctx.restore();
  // front arm (on top)
  const handPos = arm(1, C.hoodie);
  return { hand: handPos, shoulder: sh };
}

// =============================================================== FRONT BUST (close-ups)
// origin: bottom centre of frame-bust (chest). units ~cm.
// p: { eyes: 'open'|'half'|'closed'|'happy'|'squint'|'wide', lookX, lookY, lid (0..1 extra droop), blink,
//      brows: {l, r} tilt, browY, mouth: 'neutral'|'smile'|'yawn'|'o'|'frown'|'smirk'|'chew', mouthK, tilt, turn, blush,
//      rubEye (0..1), hands: fn(ctx) drawn on top }
export function drawHumanFront(ctx, p = {}) {
  const tilt = p.tilt || 0;
  const turn = clamp(p.turn || 0, -1, 1);
  // shoulders & hoodie
  shape(ctx, [[-30, 2], [-28, -16], [-20, -24], [-8, -27], [8, -27], [20, -24], [28, -16], [30, 2]], { fill: C.hoodie, seed: 3201, lw: 3 });
  // hood around neck
  shape(ctx, [[-13, -28], [-15, -21], [-8, -16], [0, -15], [8, -16], [15, -21], [13, -28], [6, -24], [0, -23], [-6, -24]], { fill: C.hoodieShade, seed: 3202, lw: 2.6 });
  // drawstrings
  line(ctx, [[-4, -20], [-4.5, -9]], { lw: 1.8, seed: 3203 });
  line(ctx, [[4, -20], [4.6, -10]], { lw: 1.8, seed: 3204 });
  ctx.save();
  ctx.translate(0, -24 + (p.headY || 0));
  ctx.rotate(tilt);
  // neck
  rect(ctx, -4.5, -6, 9, 8, { fill: C.skin, seed: 3210, lw: 2.4 });
  // ears
  ellipse(ctx, -10.6 + turn * 1.5, -15, 2.2, 3.4, { fill: C.skin, seed: 3211, lw: 2.2 });
  ellipse(ctx, 10.6 + turn * 1.5, -15, 2.2, 3.4, { fill: C.skin, seed: 3212, lw: 2.2 });
  // face
  const facePts = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    const rx = 10.5, ry = a > 0 && a < Math.PI ? 12.5 : 12;
    facePts.push([turn * 1.2 + Math.cos(a) * rx * (1 - 0.06 * Math.sin(a) * (Math.sin(a) > 0 ? 1 : 0)), -16 + Math.sin(a) * ry]);
  }
  shape(ctx, facePts, { fill: C.skin, seed: 3213, lw: 2.8 });
  const fx = turn * 3;
  // blush
  if (p.blush) {
    for (const s of [-1, 1]) ellipse(ctx, fx + s * 6.3, -10.5, 2, 1.1, { fill: `rgba(245,150,140,${0.6 * p.blush})`, noStroke: true, seed: 3214 + s });
  }
  // eyes
  const eyes = p.eyes || 'open';
  const lx = (p.lookX || 0) * 1.1, ly = (p.lookY || 0) * 0.8;
  const lid = clamp((p.lid || 0) + (p.blink || 0));
  for (const s of [-1, 1]) {
    const ex = fx + s * 4.4 + lx, ey = -14 + ly;
    if (eyes === 'closed' || lid > 0.92) line(ctx, [[ex - 1.6, ey + 0.4], [ex, ey + 0.9], [ex + 1.6, ey + 0.4]], { lw: 2, seed: 3220 + s });
    else if (eyes === 'happy') line(ctx, [[ex - 1.6, ey + 0.6], [ex, ey - 0.8], [ex + 1.6, ey + 0.6]], { lw: 2, seed: 3220 + s });
    else if (eyes === 'squint') line(ctx, [[ex - 1.8, ey], [ex + 1.8, ey - 0.1 * s]], { lw: 2.4, seed: 3220 + s });
    else {
      const big = eyes === 'wide' ? 1.3 : 1;
      const h = 2.1 * big * (1 - lid);
      ellipse(ctx, ex, ey + (2.1 * big - h) * 0.5, 1.05 * big, Math.max(0.3, h), { fill: C.ink, seed: 3220 + s, lw: 1 });
      if (lid > 0.2) line(ctx, [[ex - 1.9, ey - 2.1 + lid * 2.6], [ex + 1.9, ey - 2.1 + lid * 2.6]], { lw: 1.8, seed: 3225 + s });
    }
  }
  // brows (peek under fringe)
  const bY = -18.6 + (p.browY || 0);
  const bl = p.brows?.l || 0, br = p.brows?.r || 0;
  line(ctx, [[fx - 6.2, bY + bl * 0.9], [fx - 2.6, bY - bl * 0.9]], { lw: 1.8, seed: 3230 });
  line(ctx, [[fx + 2.6, bY - br * 0.9], [fx + 6.2, bY + br * 0.9]], { lw: 1.8, seed: 3231 });
  // nose
  line(ctx, [[fx + 0.3, -10.5], [fx + 0.9, -9.2]], { lw: 1.4, seed: 3232, stroke: C.inkSoft });
  // mouth
  const my = -6.6, mk = p.mouthK ?? 1;
  switch (p.mouth || 'neutral') {
    case 'smile': line(ctx, [[fx - 2.4, my - 0.4], [fx - 1, my + 0.8], [fx + 1, my + 0.8], [fx + 2.4, my - 0.4]], { lw: 1.9, seed: 3240 }); break;
    case 'smirk': line(ctx, [[fx - 2, my + 0.2], [fx + 0.5, my + 0.4], [fx + 2.4, my - 0.8]], { lw: 1.9, seed: 3240 }); break;
    case 'yawn': ellipse(ctx, fx, my + 0.5, 1.6 + mk * 1.4, 1 + mk * 3.2, { fill: '#7a2e1c', seed: 3240, lw: 1.9 }); break;
    case 'o': ellipse(ctx, fx, my + 0.3, 1.1 * mk + 0.4, 1.4 * mk + 0.4, { fill: '#7a2e1c', seed: 3240, lw: 1.8 }); break;
    case 'frown': line(ctx, [[fx - 2.2, my + 0.7], [fx, my - 0.3], [fx + 2.2, my + 0.7]], { lw: 1.9, seed: 3240 }); break;
    case 'chew': {
      const o = Math.abs(Math.sin(mk * Math.PI));
      ellipse(ctx, fx, my + 0.3, 1.8, 0.4 + o * 1.1, { fill: '#7a2e1c', seed: 3240, lw: 1.8 });
      break;
    }
    case 'flat': line(ctx, [[fx - 1.8, my], [fx + 1.8, my]], { lw: 1.9, seed: 3240 }); break;
    default: line(ctx, [[fx - 1.5, my], [fx + 1.5, my + 0.1]], { lw: 1.8, seed: 3240 });
  }
  // hair (front): messy mass with fringe
  const hp = hairPts(turn * 1.2, -19, 12.2, 11.5, Math.PI * 0.9, Math.PI * 2.1, 34, 0.1, 21, 0.3);
  const fr = [];
  const fringe = [[11.8, -14.5], [10, -18.4], [8.4, -15.2], [6.6, -18.8], [4.6, -15.8], [2.8, -19.2], [0.8, -15.6], [-1.4, -19.4], [-3.4, -16], [-5.6, -19.2], [-7.6, -15.4], [-9.8, -18.6], [-11.8, -14.2]];
  for (const [x, y] of fringe) fr.push([x + turn * 1.5, y + (p.fringeY || 0)]);
  shape(ctx, [...hp, ...fr], { ...HAIR, seed: 3250 });
  line(ctx, [[-3, -28], [-1, -23]], { lw: 1.2, stroke: '#4d4540', seed: 3251 });
  line(ctx, [[5, -27], [3.6, -22.5]], { lw: 1.2, stroke: '#4d4540', seed: 3252 });
  ctx.restore();
  if (p.hands) p.hands(ctx);
}

// simple mitten hand, local units cm, pointing up by default
export function drawHand(ctx, x, y, rot = 0, s = 1, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  if (o.sleeve !== false) limb(ctx, [[0, 18], [0, 5]], 10, C.hoodie, { seed: 3301 });
  shape(ctx, [[-4, 4], [-4.6, -2], [-3.8, -6.5], [-1.5, -7.6], [1.5, -7.4], [3.8, -6], [4.4, -1], [4, 4]], { fill: C.skin, seed: 3302, lw: 2.4 });
  // thumb
  shape(ctx, [[-4, 1.5], [-6.6, -1.5], [-6.2, -3.6], [-4.2, -2.6]], { fill: C.skin, seed: 3303, lw: 2.2 });
  ctx.restore();
}

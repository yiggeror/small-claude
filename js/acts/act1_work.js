// Act 1 — late night coding. Yawns, a cookie saved for tomorrow, "good night", lid closes, lights off.
import { C, shape, rect, line, ellipse, circle, text } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, hash2 } from '../core.js';
import { Cam } from '../world.js';
import { POS, DY } from '../render.js';
import { drawScreenShot } from '../screen.js';
import { drawHand, drawHumanSide } from '../human.js';
import { drawCookie } from '../props.js';
import { autoBlink } from '../cube.js';
import { screenState, TYPING } from './screen_script.js';
import { drawFaceShot } from './faceshot.js';
import { worldShot } from './cams.js';
import { saccade, sw } from '../motion.js';
import { T, WIDE } from './times.js';

// ------------------------------------------------------------------ human state (world)
function typingK(t) {
  if (t >= 10 && t < 16.2) return (Math.sin(t * 1.3) > -0.6) ? 1 : 0.2; // coding in bursts
  for (const I of TYPING) if (t >= I.t0 - 0.1 && t < I.t1 + 0.1) return 1;
  return 0;
}

const WALK_PATH = [
  // [t, x, z]
  [T.walk, -6, -38],
  [T.walk + 2.7, -92, 58],
];
function sideWalk(t) {
  if (t < T.walk) return null;
  // walk to the switch, flip the lights, go to the door and out
  const p0 = { x: -6, z: -38 }, p1 = { x: -94, z: 58 }, p2 = { x: -150, z: 70 }, p3 = { x: -176, z: 96 };
  const t1 = T.walk + 2.7, t2 = T.doorOpen + 0.5, t3 = t2 + 0.9, t4 = t3 + 1.1;
  let x, z, walkAmt = 1, dist = 0, reach = null;
  const seg = (a, b, k) => ({ x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k) });
  const d01 = Math.hypot(p1.x - p0.x, p1.z - p0.z), d12 = Math.hypot(p2.x - p1.x, p2.z - p1.z), d23 = Math.hypot(p3.x - p2.x, p3.z - p2.z);
  if (t < t1) { const k = (t - T.walk) / (t1 - T.walk); ({ x, z } = seg(p0, p1, k)); dist = d01 * k; walkAmt = clamp(Math.min(k * 5, (1 - k) * 6)); }
  else if (t < t2) {
    ({ x, z } = p1); dist = d01; walkAmt = 0;
    const rk = key(t, [[t1 + 0.1, 0], [T.switchOff - 0.05, 1, 'out'], [T.switchOff + 0.35, 1], [T.switchOff + 0.7, 0]]);
    reach = { x: 14, y: -112, k: rk };
  }
  else if (t < t3) { const k = (t - t2) / (t3 - t2); ({ x, z } = seg(p1, p2, k)); dist = d01 + d12 * k; walkAmt = clamp(k * 4); }
  else { const k = clamp((t - t3) / (t4 - t3)); ({ x, z } = seg(p2, p3, k)); dist = d01 + d12 + d23 * k; }
  return { mode: 'side', x, z, flip: true, pose: { walk: dist / 88, walkAmt, reach, eyes: 'half', lean: 0.04 } };
}

export function state(t, S) {
  if (t >= 70) { S.chair = { ...POS.chair, z: POS.chair.z - 10 }; return; }
  const typing = typingK(t);
  const pose = { typeK: typing, typePh: t, hunch: 0.35 };
  // stretch
  pose.armsUp = key(t, [[37.3, 0], [38.1, 1, 'outBack'], [39.5, 1], [40.3, 0, 'inOut']]);
  pose.headTilt = key(t, [[37.3, 0], [38.1, -0.12], [39.5, -0.12], [40.3, 0]]) + Math.sin(t * 0.7) * 0.02;
  pose.lean = key(t, [[37.3, 0], [38.2, -0.03], [39.6, 0.02], [40.4, 0]]);
  pose.stand = key(t, [[T.stand, 0], [T.stand + 0.9, 1, 'inOut']]);
  pose.headTurn = key(t, [[T.stand + 0.7, 0], [T.stand + 1.2, -0.8]]);
  S.human = { mode: 'back', x: POS.seat.x, y: POS.seat.y, z: POS.seat.z, pose };
  const side = sideWalk(t);
  if (side) {
    if (side.z > 74) {
      // through the doorway: drawn inside the door opening
      S.human = null;
      S.doorFigure = (c, w, h) => {
        c.save();
        c.translate(side.x + 162.5, 0);
        c.scale(-0.9, 0.9);
        drawHumanSide(c, side.pose);
        c.restore();
      };
    } else S.human = side;
  }
  // chair rolls back when he stands
  S.chair = { ...POS.chair, z: POS.chair.z - key(t, [[T.stand + 0.2, 0], [T.stand + 0.8, 10, 'out']]), tilt: wobble(t, T.stand + 0.3, 0.05, 2) };
  // laptop lid: closes at lidClose
  const a = key(t, [[T.lidClose - 0.55, 1.85], [T.lidClose - 0.35, 1.2, 'inOut'], [T.lidClose, 0, 'in']]);
  const bounce = t > T.lidClose && t < T.lidClose + 0.25 ? Math.abs(wobble(t, T.lidClose, 0.05, 6, 0.3)) : 0;
  S.laptop.a = t >= T.lidClose ? bounce : a;
  S.laptop.screenOn = clamp((S.laptop.a) / 0.9);
  S.screen = t >= T.lidClose ? 0 : clamp(S.laptop.a / 0.9);
  // lights
  if (t >= T.switchOff) { S.lit = t < T.switchOff + 0.08 ? 0.5 : 0; S.switchOn = 0; }
  S.doorOpen = key(t, [[T.doorOpen, 0], [T.doorOpen + 0.6, 1, 'out'], [T.doorClose, 1], [T.doorClose + 0.7, 0, 'in']]);
  S.hallLight = t > T.doorClose + 0.7 && t < T.hallOff ? 1 : 0;
  // cookie is in his hand during the second face shot
  if (t > 41.8 && t < 48.62) S.cookie = { ...S.cookie, noCookie: true };
}

// ------------------------------------------------------------------ shots
function screenShot(t, zoom = 1, panX = 0, panY = 0) {
  return (ctx) => {
    const sc = screenState(t);
    sc.zoom = zoom; sc.panX = panX; sc.panY = panY;
    drawScreenShot(ctx, sc, sc.cube);
  };
}

// face poses
function face1(t) {
  const p = { eyes: 'open', lid: 0.35, lookY: 0.35, lookX: -0.1, mouth: 'neutral', blush: 0 };
  p.blink = Math.max(autoBlink(t, 21, 2.4), key(t, [[35.0, 0], [35.15, 1], [35.5, 1], [35.65, 0]]));
  if (t > 29.2 && t < 30.6) p.mouth = 'smile';
  // yawn
  const y = key(t, [[30.8, 0], [31.4, 1, 'out'], [32.5, 1], [33.0, 0, 'inOut']]);
  if (y > 0.02) { p.mouth = 'yawn'; p.mouthK = y; p.eyes = y > 0.4 ? 'closed' : 'open'; p.lid = 0.35 + y * 0.6; p.tilt = -0.06 * y; p.headY = -1.2 * y; p.brows = { l: 0.6 * y, r: 0.6 * y }; }
  // rub eye
  const rub = key(t, [[33.1, 0], [33.4, 1, 'out'], [34.6, 1], [34.9, 0]]);
  if (rub > 0.01) {
    p.hands = (c) => {
      const ex = 4.4, ey = -38;
      const cx = lerp(10, ex + 1.5, rub) + Math.sin(t * 14) * 0.8 * rub, cy = lerp(-2, ey + 3, rub) + Math.cos(t * 14) * 0.6 * rub;
      drawHand(c, cx, cy, -0.35, 1, {});
    };
    p.lid = Math.max(p.lid, 0.6);
    p.tilt = 0.04 * rub;
  }
  // glance at the clock: "it's that late?"
  const g = key(t, [[35.5, 0], [35.7, 1, 'out'], [36.5, 1], [36.8, 0]]);
  if (g > 0.01) { p.lookX = 1 * g; p.lookY = -1 * g; p.lid = 0.1; p.brows = { l: -0.3 * g, r: -0.3 * g }; p.browY = -0.6 * g; if (g > 0.5) p.mouth = 'o'; p.mouthK = 0.5; }
  return p;
}

function face2(t) {
  const p = { eyes: 'open', lid: 0.3, lookY: 0.3, mouth: 'neutral' };
  p.blink = autoBlink(t, 25, 2.2);
  p.lookX = saccade(t, [[41.5, 0], [41.7, 0.9], [42.4, 0.35], [44.0, 0.8], [44.7, 0.35], [46.3, -0.1]]);
  p.lookY = saccade(t, [[41.5, 0.3], [41.7, 1], [42.4, 0.6], [44.0, -0.9], [44.7, 0.6], [46.3, 0.25]]);
  // the cookie rises into view
  const up = key(t, [[41.9, 0], [42.6, 1, 'outBack'], [43.4, 1], [43.8, 1.08], [45.9, 1.05], [46.8, 0, 'in']]);
  const want = key(t, [[42.6, 0], [43.0, 1], [43.9, 1], [44.1, 0]]);
  if (want > 0.3) { p.mouth = 'o'; p.mouthK = want * 0.7; p.brows = { l: 0.4, r: 0.4 }; p.lid = 0.1; }
  const sigh = key(t, [[44.8, 0], [45.1, 1], [45.6, 1], [45.8, 0]]);
  if (sigh > 0.5) { p.eyes = 'closed'; p.tilt = 0.03; }
  if (t > 45.8 && t < 48) { p.mouth = 'smile'; p.lid = 0.25; }
  if (up > 0.01) {
    p.hands = (c) => {
      const hx = lerp(22, 9, clamp(up)), hy = lerp(14, -14, up);
      drawHand(c, hx, hy, -0.15, 1.05, {});
      c.save(); c.translate(hx - 0.4, hy - 8.8); c.rotate(-0.2);
      drawCookie(c, 0.92, { y: 0.9 });
      c.restore();
      // thumb over the cookie
      shape(c, [[hx - 4.2, hy - 5.2], [hx - 6.6, hy - 8.2], [hx - 5.6, hy - 9.6], [hx - 3.4, hy - 7.4]], { fill: C.skin, lw: 2.2, seed: 3401 });
    };
  }
  return p;
}

// medium shot on the laptop as the lid closes: his right arm reaches in from the bottom right
// (from his side of the desk), fingers hooked over the top edge, follows the lid down, then withdraws.
function lidShot(ctx, t) {
  const camera = new Cam({ x: 6, y: DY + 14, z: -45, f: 1500, hy: 600 });
  let grip = null;
  worldShot(ctx, t, camera, (S) => {
    S.human = null;
    S.laptop.lidTop = (c, yTop) => { grip = { m: c.getTransform(), yTop }; };
    S.overlays = [(c) => { if (grip) drawClosingArm(c, t, grip); }];
  });
}
function drawClosingArm(ctx, t, g) {
  // withdraw after the lid clicks shut
  const away = key(t, [[T.lidClose + 0.1, 0], [T.lidClose + 0.75, 1, 'inOut']]);
  if (away >= 1) return;
  ctx.save();
  ctx.setTransform(g.m);
  const lift = key(t, [[T.lidClose + 0.05, 0], [T.lidClose + 0.25, 1, 'out']]);
  // the arm runs from the wrist toward the camera (off frame, bottom right) and grows with perspective
  const far = [58, g.yTop + 52];
  const wx0 = 1.5, wy0 = g.yTop + 7;
  const wx = lerp(wx0, far[0], ease.in(away)), wy = lerp(wy0, far[1], ease.in(away)) - lift * 2.5;
  const dx = far[0] - wx, dy = far[1] - wy, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const w0 = 3.2, w1 = 11;
  // sleeve (hoodie), cuff at the wrist
  shape(ctx, [[wx + nx * w0, wy + ny * w0], [far[0] + nx * w1, far[1] + ny * w1], [far[0] - nx * w1, far[1] - ny * w1], [wx - nx * w0, wy - ny * w0]], { fill: C.hoodie, lw: 2.8, seed: 3460 });
  line(ctx, [[wx + nx * w0 * 1.05 + dx / len * 2.2, wy + ny * w0 * 1.05 + dy / len * 2.2], [wx - nx * w0 * 1.05 + dx / len * 2.2, wy - ny * w0 * 1.05 + dy / len * 2.2]], { lw: 1.8, stroke: C.hoodieShade, seed: 3461 });
  // back of the right hand, fingers hooked over the lid's top edge (thumb on the left)
  ctx.translate(wx, wy);
  // fingers point away from the forearm; the wrist bends so the hand stays fairly upright
  ctx.rotate(Math.atan2(-dx, dy) * 0.45);
  const hk = 1 - lift;
  shape(ctx, [[-3.4, 0.5], [-3.9, -4.2], [-3.2, -6.4], [3.1, -6.6], [3.8, -4.2], [3.3, 0.5]], { fill: C.skin, lw: 2.4, seed: 3462 });
  // fingers: over the edge while gripping, straightening as the hand lets go
  for (let i = 0; i < 4; i++) {
    const fx = -2.5 + i * 1.65, ft = -6.4 - 1.6 * hk - (i === 1 || i === 2 ? 0.5 : 0) - 1.4 * (1 - hk);
    shape(ctx, [[fx - 0.8, -6.2], [fx - 0.75, ft + 0.4], [fx, ft - 0.2], [fx + 0.75, ft + 0.4], [fx + 0.8, -6.2]], { fill: C.skin, lw: 2, seed: 3463 + i });
  }
  shape(ctx, [[-3.5, -1.5], [-5.6, -3.4], [-5.5, -5.2], [-3.9, -4.6]], { fill: C.skin, lw: 2.1, seed: 3468 });
  ctx.restore();
}

// the cookie goes back on the plate
function cookieInsert(ctx, t) {
  const camera = new Cam({ x: 60, y: DY + 34, z: -20, f: 1500, hy: -1000 });
  worldShot(ctx, t, camera, (S) => {
    S.cookie = { ...S.cookie, noCookie: t < 48.62 };
    const place = key(t, [[48.0, 0], [48.6, 1, 'out']]);
    const away = key(t, [[48.7, 0], [49.4, 1, 'in']]);
    if (away < 1) {
      S.extras.push({ x: POS.plate.x, y: DY + 1.8 + (1 - place) * 7 + away * 9, z: POS.plate.z - 5 - away * 14 + (1 - place) * -6, order: 5, draw: (c, el) => {
        if (t < 48.62) { c.save(); c.translate(0.4, -1.4); drawCookie(c, el, { y: 0 }); c.restore(); }
        drawHand(c, 1.5, 8, 0.1, 0.62, {});
      } });
    }
  });
}

export const shots = [
  { t0: T.wide1, t1: T.screen1, name: 'wide-typing', dissolve: 1.0,
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.wide1) / 7));
      const c = new Cam({ ...WIDE, z: WIDE.z + k * 22, x: WIDE.x - k * 6 });
      worldShot(ctx, t, c);
    } },
  { t0: T.screen1, t1: T.face1, name: 'screen-1',
    draw(ctx, t) { const k = ease.inOut(clamp((t - T.screen1) / 10)); const z = 1.2 + k * 0.06; screenShot(t, z, 200 * z, 50 * z)(ctx); } },
  { t0: T.face1, t1: T.stretch, name: 'face-yawn',
    draw(ctx, t) { const k = clamp((t - T.face1) / 8); drawFaceShot(ctx, t, face1(t), { zoom: 1 + k * 0.06, panY: k * 20, lit: 1, screen: 1 }); } },
  { t0: T.stretch, t1: T.face2, name: 'wide-stretch',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ ...WIDE, z: WIDE.z + 40, y: 140, hy: 360 })); } },
  { t0: T.face2, t1: T.insertCookie, name: 'face-cookie',
    draw(ctx, t) { const k = clamp((t - T.face2) / 6.5); drawFaceShot(ctx, t, face2(t), { zoom: 1.04 + k * 0.03, lit: 1, screen: 1 }); } },
  { t0: T.insertCookie, t1: T.screen2, name: 'insert-cookie', draw: cookieInsert },
  { t0: T.screen2, t1: 56.0, name: 'screen-goodnight',
    draw(ctx, t) {
      const k = clamp((t - T.screen2) / 6.5);
      const z = lerp(1.2, 1.55, k), tx = lerp(600, 760, k), ty = lerp(450, 390, k); screenShot(t, z, -(tx - 800) * z, -(ty - 500) * z)(ctx);
      // the lid starts closing: the screen tilts away into darkness from the top
      const c = clamp((t - 54.6) / 1.4);
      if (c > 0) {
        const e = ease.in(c);
        const g = ctx.createLinearGradient(0, 1080 * e - 300, 0, 1080 * e + 60);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      }
    } },
  { t0: 56.0, t1: T.leave, name: 'lid-close', draw: lidShot },
  { t0: T.leave, t1: T.silence, name: 'wide-leave',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ ...WIDE, x: WIDE.x - 20, z: WIDE.z - 20, f: 1120 })); } },
];

export const cues = [];

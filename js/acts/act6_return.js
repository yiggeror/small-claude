// Act 6 — he's back. Lights on, lid open, everything normal... except the cookie.
import { C, shape, rect, line, ellipse, circle, text } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, hash2 } from '../core.js';
import { Cam } from '../world.js';
import { POS, DY } from '../render.js';
import { drawScreenShot, TERM } from '../screen.js';
import { drawHand, drawHumanSide } from '../human.js';
import { drawCookie, drawCookiePiece } from '../props.js';
import { autoBlink } from '../cube.js';
import { addGlow } from '../light.js';
import { screenState } from './screen_script.js';
import { drawFaceShot } from './faceshot.js';
import { worldShot } from './cams.js';
import { saccade, sw } from '../motion.js';
import { BITE_A } from './act4_cookie.js';
import { T, WIDE } from './times.js';

const MISS = 0.5;
const MISS_A = BITE_A + Math.PI * 0.5;

// ------------------------------------------------------------------ the human walks back in
function humanState(t) {
  // silhouette in the doorway → steps in → light switch → walks to the chair → sits
  const pDoor = { x: -150, z: 80 }, pIn = { x: -122, z: 62 }, pChair = { x: -6, z: -36 };
  const tIn = T.doorOpen2 + 1.0, tWalk = T.lightsOn + 0.25, tArrive = T.sit - 0.1;
  if (t < tIn) return { door: true, x: pDoor.x, z: pDoor.z, pose: { walkAmt: 0, eyes: 'half' } };
  if (t < tWalk) {
    const k = clamp((t - tIn) / 0.6);
    const x = lerp(pDoor.x, pIn.x, ease.out(k)), z = lerp(pDoor.z, pIn.z, ease.out(k));
    const reach = key(t, [[T.lightsOn - 0.3, 0], [T.lightsOn - 0.05, 1, 'out'], [T.lightsOn + 0.2, 1], [T.lightsOn + 0.4, 0]]);
    return { x, z, pose: { walk: k * 0.5, walkAmt: k < 1 ? 1 : 0, reach: { x: 22, y: -108, k: reach }, eyes: 'half' } };
  }
  const k = clamp((t - tWalk) / (tArrive - tWalk));
  const x = lerp(pIn.x, pChair.x, k), z = lerp(pIn.z, pChair.z, k);
  const dist = Math.hypot(pChair.x - pIn.x, pChair.z - pIn.z) * k;
  const yawn = key(t, [[186.0, 0], [186.4, 1], [187.2, 1], [187.5, 0]]);
  return { x, z, pose: { walk: 0.5 + dist / 88, walkAmt: clamp(Math.min(k * 6, (1 - k) * 6)), eyes: yawn > 0.5 ? 'closed' : 'half', mouth: yawn > 0.3 ? 'yawn' : null, headTilt: -0.15 * yawn } };
}

export function state(t, S) {
  if (t >= T.doorOpen2 && t < T.lightsOn) { S.lit = 0; S.switchOn = 0; }
  if (t >= T.lightsOn) {
    S.lit = t < T.lightsOn + 0.06 ? 0.6 : t < T.lightsOn + 0.1 ? 0.2 : 1;
    S.switchOn = 1;
  }
  if (t >= T.doorOpen2 && t < T.credits) {
    S.doorOpen = key(t, [[T.doorOpen2, 0], [T.doorOpen2 + 0.45, 1, 'out']]);
    S.hallLight = 0;
    S.chair = { ...POS.chair, z: POS.chair.z - key(t, [[T.sit - 0.3, 10], [T.sit + 0.4, 0, 'inOut']]) };
    S.cookie = { ...S.cookie, miss: MISS, missA: MISS_A, crumbs: 0 };
    if (t < T.sit) {
      const h = humanState(t);
      if (h.door) {
        S.human = null;
        S.doorFigure = (c, w, hh) => {
          c.save(); c.translate(h.x + 162.5, 0); c.scale(0.92, 0.92);
          c.globalAlpha = 1;
          drawHumanSide(c, h.pose);
          // backlit: darken the figure
          c.restore();
        };
      } else {
        S.human = { mode: 'side', x: h.x, z: h.z, flip: false, pose: h.pose };
      }
    } else {
      const pose = { stand: key(t, [[T.sit, 1], [T.sit + 0.7, 0, 'inOut']]), hunch: 0.25 };
      pose.typeK = t > 219.2 ? 1 : 0; pose.typePh = t;
      pose.headTilt = t > 219 ? Math.sin(t * 2) * 0.03 : 0;
      S.human = { mode: 'back', x: POS.seat.x, y: POS.seat.y, z: POS.seat.z, pose };
    }
    // laptop opens
    const a = key(t, [[T.open, 0], [T.open + 0.6, 1.85, 'outBack']]);
    S.laptop = { ...S.laptop, a, screenOn: clamp((t - T.open - 0.3) / 0.4) };
    S.screen = S.laptop.screenOn;
    // he's holding the cookie during the face shots; it's back on the plate (minus a piece) afterwards
    if (t > T.notice + 0.4 && t < 219.0) S.cookie = { ...S.cookie, noCookie: true };
    if (t >= 219.0) S.cookie = { ...S.cookie, miss: 0.75 };
  }
}

// ------------------------------------------------------------------ face shots
function faceBack(t) {
  const p = { eyes: 'open', lid: 0.2, lookY: 0.2, mouth: 'neutral' };
  p.blink = autoBlink(t, 51, 2.4);
  // --- looking for his cookie, bringing it up... wait
  if (t < T.insertBite) {
    p.lookX = saccade(t, [[T.notice, 0], [T.notice + 0.2, 0.9], [T.notice + 1.2, 0.3]]);
    p.lookY = saccade(t, [[T.notice, 0.2], [T.notice + 0.2, 1], [T.notice + 1.2, 0.5]]);
    const up = key(t, [[T.notice + 0.4, 0], [T.notice + 1.1, 1, 'outBack']]);
    if (t > T.notice + 1.1 && t < T.notice + 1.8) { p.mouth = 'o'; p.mouthK = 0.8; }
    if (t > T.notice + 1.8) { p.eyes = 'wide'; p.lid = 0; p.mouth = 'o'; p.mouthK = 0.4; p.brows = { l: 0.5, r: 0.5 }; p.browY = -0.8; }
    p.blink = Math.max(p.blink, sw(t, [[T.notice + 2.4, 1], [T.notice + 2.52, 0], [T.notice + 2.7, 1], [T.notice + 2.82, 0]]));
    p.hands = handCookie(up);
  }
  // --- from the cookie... to the screen. Squint.
  if (t >= T.stare && t < T.innocent) {
    p.lookX = key(t, [[T.stare, 0.3], [T.stare + 1.0, 0.3], [T.stare + 1.8, 0, 'inOut']]);
    p.lookY = key(t, [[T.stare, 0.6], [T.stare + 1.0, 0.6], [T.stare + 1.8, 0, 'inOut']]);
    if (t > T.stare + 1.9) { p.eyes = 'squint'; p.brows = { l: -0.6, r: -0.6 }; p.mouth = 'flat'; }
    p.hands = handCookie(1);
  }
  if (t >= T.squint && t < T.sweat) {
    p.eyes = 'squint'; p.brows = { l: -0.8, r: -0.4 }; p.browY = 0.3; p.mouth = 'flat';
    p.tilt = 0.04; p.hands = handCookie(1);
  }
  // --- ...pfft. Fine.
  if (t >= T.laugh && t < T.gift) {
    const tl = t - T.laugh;
    p.eyes = tl < 0.8 ? 'squint' : 'happy'; p.mouth = tl < 0.8 ? 'flat' : 'smile'; p.brows = { l: -0.2 * (tl < 0.8), r: 0 };
    p.headY = tl > 0.8 && tl < 1.8 ? Math.abs(Math.sin(tl * 16)) * 0.6 : 0;
    p.blush = tl > 0.8 ? 0.3 : 0;
    p.lookY = tl > 2.0 ? 0.6 : 0;
    // break off a piece and set it down by the laptop
    p.hands = (c) => {
      const brk = key(t, [[T.laugh + 2.0, 0], [T.laugh + 2.5, 1, 'out']]);
      const down = key(t, [[T.laugh + 2.8, 0], [T.laugh + 3.8, 1, 'in']]);
      handCookie(1)(c);
      if (brk > 0) {
        // the other hand pinches a piece off and carries it down toward the laptop
        const hx = lerp(4, -4, brk), hy = lerp(-10, -12, brk) + down * 26;
        c.save(); c.translate(hx + 0.6, hy - 8.2); drawCookiePiece(c, 1.3); c.restore();
        drawHand(c, hx, hy, 0.35, 0.95, {});
      }
    };
  }
  return p;
}
function handCookie(up) {
  return (c) => {
    if (up <= 0.01) return;
    const hx = lerp(22, 9, clamp(up)), hy = lerp(14, -12, up);
    drawHand(c, hx, hy, -0.15, 1.05, {});
    c.save(); c.translate(hx - 0.4, hy - 8.8); c.rotate(-0.2);
    drawCookie(c, 0.92, { y: 0.9, miss: MISS, missA: -2.2 });
    c.restore();
    shape(c, [[hx - 4.2, hy - 5.2], [hx - 6.6, hy - 8.2], [hx - 5.6, hy - 9.6], [hx - 3.4, hy - 7.4]], { fill: C.skin, lw: 2.2, seed: 3401 });
  };
}

// the bitten cookie, up close in his fingers
function biteInsert(ctx, t) {
  const k = ease.inOut(clamp((t - T.insertBite) / 1.5));
  ctx.fillStyle = '#e9dcc6'; ctx.fillRect(0, 0, 1920, 1080);
  addGlow(ctx, 1300, 300, 900, '255,240,210', 0.25);
  ctx.save();
  ctx.translate(960, 560); ctx.scale(95 * (1 + k * 0.08), 95 * (1 + k * 0.08)); ctx.rotate(-0.25);
  drawCookie(ctx, 0.85, { y: 0, miss: MISS, missA: -2.2 });
  drawHand(ctx, 3.8, 6.5, -0.5, 0.9, {});
  ctx.restore();
  // "!" doodle
  text(ctx, '?!', 1400, 330, { size: 120, font: '"Patrick Hand"', color: C.ink, alpha: clamp((t - T.insertBite - 0.5) * 4) });
}

// the screen with the laptop's deck visible below, where the gift is placed
function screenGift(ctx, t) {
  const sc = screenState(t);
  const k = ease.inOut(clamp((t - T.gift) / 1.2));
  const z = lerp(2.6, 1.9, k);
  sc.zoom = z; sc.panX = -(CUBE_TX - TERM.w / 2) * z; sc.panY = 380 - 540 - (CUBE_TY - TERM.h / 2) * z;
  drawScreenShot(ctx, sc, sc.cube);
  // the deck edge and the piece of cookie
  const top = lerp(1150, 900, k);
  ctx.save();
  shape(ctx, [[-20, top], [1940, top], [1940, 1100], [-20, 1100]], { fill: '#d4cfc6', lw: 4, seed: 7101 });
  line(ctx, [[0, top + 18], [1920, top + 18]], { lw: 2, stroke: '#b3ada3', seed: 7102 });
  const pd = key(t, [[T.gift + 0.4, 0], [T.gift + 1.1, 1, 'out']]);
  if (pd > 0) {
    ctx.translate(900, top + 70);
    ctx.scale(40, 40);
    drawCookiePiece(ctx, 1.2);
    const away = key(t, [[T.gift + 1.3, 0], [T.gift + 2.0, 1, 'in']]);
    if (away < 1) drawHand(ctx, 1.2, 6.5 + (1 - pd) * 3 + away * 8, -0.1, 0.8, {});
  }
  ctx.restore();
}

function screen(t, zoom = 1.3, px = 230, py = 40) {
  return (ctx) => { const sc = screenState(t); sc.zoom = zoom; sc.panX = px; sc.panY = py; drawScreenShot(ctx, sc, sc.cube); };
}
// frame the terminal so that terminal point (tx, ty) lands on screen point (fx, fy) at zoom z
function focus(t, z, tx, ty, fx = 960, fy = 540) {
  return screen(t, z, fx - 960 - (tx - TERM.w / 2) * z, fy - 540 - (ty - TERM.h / 2) * z);
}
const CUBE_TX = 860, CUBE_TY = 140;

export const shots = [
  { t0: T.doorOpen2, t1: T.open - 0.4, name: 'return-wide',
    draw(ctx, t) { worldShot(ctx, t, new Cam({ ...WIDE, x: WIDE.x - 20, z: WIDE.z - 20, f: 1120 })); } },
  { t0: T.open - 0.4, t1: T.screenBack, name: 'open-lid',
    draw(ctx, t) { const k = ease.inOut(clamp((t - T.open + 0.4) / 1.4)); worldShot(ctx, t, new Cam({ x: 30, y: 135, z: lerp(-120, -105, k), f: 1250, hy: 170 })); } },
  { t0: T.screenBack, t1: T.notice, name: 'screen-normal', draw(ctx, t) { const k = ease.inOut(clamp((t - T.screenBack) / 3.5)); focus(t, lerp(1.45, 1.6, k), lerp(620, 660, k), 330, 960, 560)(ctx); } },
  { t0: T.notice, t1: T.insertBite, name: 'face-notice',
    draw(ctx, t) { drawFaceShot(ctx, t, faceBack(t), { zoom: 1.02, lit: 1, screen: 1 }); } },
  { t0: T.insertBite, t1: T.stare, name: 'insert-bite', draw: biteInsert },
  { t0: T.stare, t1: T.innocent, name: 'face-stare',
    draw(ctx, t) { const k = ease.inOut(clamp((t - T.stare) / 2.6)); drawFaceShot(ctx, t, faceBack(t), { zoom: 1.02 + k * 0.08, lit: 1, screen: 1 }); } },
  { t0: T.innocent, t1: T.squint, name: 'screen-innocent', draw(ctx, t) { const k = ease.inOut(clamp((t - T.innocent) / 4.4)); focus(t, lerp(2.3, 2.9, k), CUBE_TX, CUBE_TY, 960, 600)(ctx); } },
  { t0: T.squint, t1: T.sweat, name: 'face-squint',
    draw(ctx, t) { const k = ease.out(clamp((t - T.squint) / 0.8)); drawFaceShot(ctx, t, faceBack(t), { zoom: 1.2 + k * 0.15, panY: 80 + k * 60, lit: 1, screen: 1 }); } },
  { t0: T.sweat, t1: T.laugh, name: 'screen-sweat', draw(ctx, t) { const k = ease.inOut(clamp((t - T.sweat) / 2.6)); focus(t, lerp(3.1, 3.4, k), CUBE_TX, CUBE_TY, 960, 600)(ctx); } },
  { t0: T.laugh, t1: T.gift, name: 'face-laugh',
    draw(ctx, t) { const k = ease.inOut(clamp((t - T.laugh) / 4)); drawFaceShot(ctx, t, faceBack(t), { zoom: 1.12 - k * 0.1, panY: 40, lit: 1, screen: 1 }); } },
  { t0: T.gift, t1: 219.0, name: 'screen-gift', draw: screenGift },
  { t0: 219.0, t1: T.end, name: 'end-wide', fadeOut: 1.6,
    draw(ctx, t) { const k = ease.inOut(clamp((t - 219) / 2.5)); worldShot(ctx, t, new Cam({ ...WIDE, z: WIDE.z + 30 - k * 30 })); } },
];

export const cues = [];

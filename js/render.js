// Composes the 3D-staged room for a camera and a world state.
import { C, shape, rect, line, ellipse, circle, limb, softShadow, setBoil, text } from './draw.js';
import { Cam, billboard, planePts, projPts, planePoly, projPoly, Stage, SW, SH } from './world.js';
import { drawBackWall, drawFloor, drawDesk, DESK, WALL_Z, WINDOW, DOOR, SWITCH } from './room.js';
import { drawBooks, BOOKS_H, BOOKS, BOOK_D, drawLaptop, LAPTOP, drawKeyboard, drawKeyRow, kbRowZ, KB, drawMouse, drawPlateCookie, drawMug, drawPenCup, drawPen, drawStickyPad, drawLamp, drawPlant, drawChairBack, drawCookiePiece } from './props.js';
import { drawCube, drawCubeFx, cube, cubeEmote } from './cube.js';
import { drawHumanBack, drawHumanSide } from './human.js';
import { LightMap, addGlow } from './light.js';
import { clamp, lerp, TAU } from './core.js';

// world placement (cm)
export const POS = {
  books: { x: 4, z: 36 },
  laptop: { x: 4, y: DESK.y + BOOKS_H, z: 37.7 },
  kb: { x: 2, z: 12 },
  pad: { x: 33, z: 3 },
  mouse: { x: 33, z: 14 },
  plate: { x: 61, z: 12 },
  mug: { x: 52, z: 46 },
  penCup: { x: -42, z: 50 },
  pen: { x: -24, z: 24 },
  sticky: { x: 47, z: 5 },
  lamp: { x: -60, z: 52 },
  plant: { x: 64, z: 62 },
  chair: { x: -6, z: -48 },
  seat: { x: -6, y: 50, z: -40 },
};
export const DY = DESK.y;

function elevAt(cam, y, z) { return cam.elev(y, z); }

// ------------------------------------------------------------------------------------------
export function renderWorld(ctx, cam, S) {
  setBoil(S.t);
  const st = new Stage();
  // backdrop
  drawBackWall(ctx, cam, S);
  drawFloor(ctx, cam, S);

  // desk
  st.add(1e6, () => drawDesk(ctx, cam), -10);

  // mouse cable on desk plane
  st.add(1e6 - 1, () => {
    const m = S.mouse || POS.mouse;
    const pts = [[m.x, m.z + 10], [m.x - 2, m.z + 16], [m.x - 8, m.z + 22], [30, 40], [22, 44], [16, 47]];
    const pp = planePts(cam, DY + 0.3, pts);
    limb(ctx, pp, Math.max(1, cam.project(30, DY, 30).s * 0.5), '#e9e2d6', { seed: 4001, lw: 2 });
  }, -5);
  // mouse pad
  st.add(1e6 - 2, () => {
    const { x, z } = POS.pad;
    shape(ctx, planePoly(cam, DY + 0.25, [[x - 12, z], [x + 12, z], [x + 12, z + 22], [x - 12, z + 22]]), { fill: '#6f7f95', seed: 4002, lw: 2.4 });
  }, -4);

  const bb = (x, y, z, fn, order = 0, topH = 0) => st.add(cam.view(x, z)[1], () => billboard(ctx, cam, x, y, z, (c, p) => fn(c, cam.elev(y + topH, z, x), p)), order);

  bb(POS.lamp.x, DY, POS.lamp.z, (c, el) => drawLamp(c, el, { on: S.lampOn }), 0, 1);
  bb(POS.penCup.x, DY, POS.penCup.z, (c, el) => drawPenCup(c, el), 0, 10);
  bb(POS.plant.x, DY, POS.plant.z, (c, el) => drawPlant(c, el));
  bb(POS.mug.x, DY, POS.mug.z, (c, el) => drawMug(c, el, { empty: true }), 0, 9.4);
  bb(POS.books.x, DY, POS.books.z, (c, el) => drawBooks(c, el), 0, 6.8);
  for (const [i, b] of BOOKS.entries()) {
    const x0 = POS.books.x - b.w / 2 + b.dx, x1 = x0 + b.w, z0 = POS.books.z, z1 = z0 + BOOK_D, y = DY + b.y0 + b.h;
    if (cam.y > y) st.add(cam.view(POS.books.x, z1)[1] + 2 - i, () => shape(ctx, planePoly(cam, y, [[x0, z0], [x1, z0], [x1 - 0.5, z1], [x0 + 0.5, z1]]), { fill: b.fill, seed: 301 + i, lw: 2.6 }), -2);
  }
  const lp = S.laptop || {};
  bb(POS.laptop.x, POS.laptop.y, POS.laptop.z, (c, el) => drawLaptop(c, lp, el), 1, 1.3);
  // keyboard: plate + rows of keys at their true depths
  {
    const k = POS.kb, x0 = k.x - KB.w / 2, x1 = k.x + KB.w / 2, z0 = k.z, z1 = k.z + KB.d, yt = DY + KB.h;
    st.add(cam.view(k.x, z1)[1], () => shape(ctx, planePoly(cam, yt, [[x0, z0], [x1, z0], [x1 - 0.3, z1], [x0 + 0.3, z1]]), { fill: '#e9e2d6', seed: 501, lw: 2.6 }), -1);
    for (let r = 0; r < KB.rows; r++) bb(k.x, yt, k.z + kbRowZ(r), (c, el) => drawKeyRow(c, el, r, S.kb || {}), 0, KB.cap);
    st.add(cam.view(k.x, z0)[1] - 0.01, () => {
      if (cam.view(k.x, z0)[1] < cam.near) return;
      shape(ctx, projPoly(cam, [[x0, DY, z0], [x1, DY, z0], [x1, yt, z0], [x0, yt, z0]]), { fill: '#ddd4c6', seed: 502, lw: 2.6 });
    }, 0);
  }
  const ms = S.mouse || POS.mouse;
  bb(ms.x, DY + 0.3, ms.z, (c, el) => drawMouse(c, el, ms), 0, 3.6);
  const ck = S.cookie || {};
  bb(POS.plate.x, DY, POS.plate.z, (c, el) => drawPlateCookie(c, el, ck));
  const sp = S.sticky || POS.sticky;
  bb(sp.x, DY, sp.z, (c, el) => drawStickyPad(c, el, sp), 0, 0.9);
  const pen = S.pen || { ...POS.pen, rot: 0 };
  if (!pen.hidden) bb(pen.x, pen.y ?? DY, pen.z, (c, el) => drawPen(c, el, pen.rot || 0));

  // extra world drawables (e.g. crumbs, cookie piece) supplied by the story
  if (S.extras) for (const e of S.extras) bb(e.x, e.y ?? DY, e.z, (c, el, p) => e.draw(c, el, p), e.order || 0);

  // the little friend
  if (S.cube && S.cube.alpha !== 0) {
    const q = S.cube;
    st.add(cam.view(q.x, q.z)[1] - (q.zBias ?? 0.3), () => {
      billboard(ctx, cam, q.x, q.y, q.z, (c) => {
        if (q.shadow !== false) softShadow(c, 0, (q.ground ?? q.y) === q.y ? 0 : (q.y - q.ground), q.size * 0.62, q.size * 0.13, 0.25 * (q.shadowA ?? 1));
        const cs = { ...q, x: 0, y: 0 };
        if (q.drawBehind) q.drawBehind(c, cs);
        drawCubeFx(c, cs);
        if (q.draw) q.draw(c, cs);
      });
    }, 2);
  }

  // chair + human
  const ch = S.chair || POS.chair;
  const hu = S.human;
  if (hu && hu.mode === 'back') {
    bb(hu.x, hu.y, hu.z, (c) => drawHumanBack(c, hu.pose || {}), 3);
  }
  bb(ch.x, 0, ch.z, (c) => drawChairBack(c, ch), 4);
  if (hu && hu.mode === 'side') {
    st.add(cam.view(hu.x, hu.z)[1], () => billboard(ctx, cam, hu.x, hu.y || 0, hu.z, (c) => {
      if (hu.flip) c.scale(-1, 1);
      drawHumanSide(c, hu.pose || {});
    }), 5);
  }

  st.draw(ctx);
  if (S.overlays) for (const f of S.overlays) f(ctx, cam);
}

// ------------------------------------------------------------------------------------------
// Lighting pass. S.lit (0..1 room light), S.screen (0..1), S.seam (0..1 orange seam glow), S.lampOn
export function lightWorld(ctx, cam, S) {
  const lit = clamp(S.lit ?? 1);
  // ambient: night blue → warm room light
  const dark = [82, 90, 140], day = [255, 246, 232];
  const amb = dark.map((d, i) => Math.round(lerp(d, day[i], lit)));
  const L = new LightMap(ctx, `rgb(${amb.join(',')})`);
  const P = (x, y, z) => cam.project(x, y, z);

  // moonlight through the window: patch on desk + wall glow
  const moon = 1 - lit;
  if (moon > 0.01) {
    const w0 = P(WINDOW.x0, WINDOW.y0, WALL_Z), w1 = P(WINDOW.x1, WINDOW.y1, WALL_Z);
    L.point((w0.x + w1.x) / 2, (w0.y + w1.y) / 2, (w1.x - w0.x) * 1.2, '150,170,230', 0.55 * moon, 1, 0.8);
    const desk = planePoly(cam, DY, [[-38, 70], [34, 70], [52, 12], [-22, 12]]);
    L.poly(desk, '120,140,200', 0.45 * moon, 18 * cam.f / 1150);
    const floor = planePoly(cam, 0, [[-60, 60], [30, 60], [70, -60], [-30, -60]]);
    L.poly(floor, '110,125,190', 0.25 * moon, 30);
  }
  // hallway light through the door
  const door = S.doorOpen || 0;
  if (door > 0.01) {
    const d0 = P(DOOR.x0, 0, WALL_Z), d1 = P(DOOR.x1, DOOR.h, WALL_Z);
    L.point((d0.x + d1.x) / 2, (d0.y + d1.y) / 2, (d0.x - d1.x) * -1.6, '255,210,150', 0.9 * door, 1, 1.4);
    const spill = planePoly(cam, 0, [[DOOR.x0, WALL_Z], [DOOR.x1, WALL_Z], [DOOR.x1 + 90, -40], [DOOR.x0 + 20, -60]]);
    L.poly(spill, '255,200,140', 0.6 * door, 20);
  }
  if (S.hallLight > 0) {
    const d0 = P((DOOR.x0 + DOOR.x1) / 2, 0, WALL_Z);
    L.point(d0.x, d0.y, 70 * d0.s, '255,210,150', 0.5 * S.hallLight, 1.6, 0.35);
  }
  // laptop screen light
  const scr = S.screen || 0;
  const lpP = P(POS.laptop.x, POS.laptop.y + 10, POS.laptop.z + 8);
  if (scr > 0.01) {
    L.point(lpP.x, lpP.y + 20 * lpP.s, 110 * lpP.s, '235,225,255', 0.85 * scr, 1.4, 1);
    // on the human (seated in front)
    const hp = P(POS.seat.x, POS.seat.y + 55, POS.seat.z);
    L.point(hp.x, hp.y, 40 * hp.s, '230,220,255', 0.35 * scr, 1, 1.3);
  }
  // orange seam glow / the friend's own glow
  if (S.seam > 0.01) {
    const sp0 = P(POS.laptop.x, POS.laptop.y + 1, POS.laptop.z - 3);
    L.point(sp0.x, sp0.y, 26 * sp0.s * (0.6 + S.seam * 0.5), '255,150,80', 0.75 * S.seam, 1.7, 0.75);
  }
  if (S.cube && (S.cubeGlow ?? 1) > 0 && lit < 0.99) {
    const q = S.cube;
    const cp = P(q.x, q.y + q.size * 0.4, q.z);
    L.point(cp.x, cp.y, q.size * 3.2 * cp.s, '255,160,90', 0.55 * (1 - lit) * (S.cubeGlow ?? 1));
  }
  if (S.lampOn > 0.01) {
    const lp = P(POS.lamp.x + 18, DY + 10, POS.lamp.z - 6);
    L.point(lp.x, lp.y, 70 * lp.s, '255,220,160', 0.8 * S.lampOn, 1.6, 0.8);
  }
  if (S.extraLights) S.extraLights(L, cam);
  L.apply();

  // emissive additive glows
  if (scr > 0.01) addGlow(ctx, lpP.x, lpP.y - 4 * lpP.s, 40 * lpP.s, '255,240,220', 0.25 * scr * (1 - lit * 0.6), 1.3, 1);
  if (S.seam > 0.01) {
    const sp = P(POS.laptop.x, POS.laptop.y + LAPTOP.base + 0.2, POS.laptop.z);
    addGlow(ctx, sp.x, sp.y, 12 * sp.s, '255,150,70', 0.8 * S.seam, 1.6, 0.12);
    addGlow(ctx, sp.x, sp.y, 16 * sp.s, '255,120,60', 0.25 * S.seam, 1.3, 0.4);
  }
  if (S.cube && lit < 0.99) {
    const q = S.cube;
    const cp = P(q.x, q.y + q.size * 0.4, q.z);
    addGlow(ctx, cp.x, cp.y, q.size * 1.3 * cp.s, '255,140,70', 0.25 * (1 - lit) * (S.cubeGlow ?? 1));
  }
  if (S.extraGlows) S.extraGlows(ctx, cam);
}

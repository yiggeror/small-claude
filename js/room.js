// The bedroom-office: back wall, window, door, floor, desk.
import { C, shape, rect, line, ellipse, circle, text, glow, softShadow, poly } from './draw.js';
import { planePts, projPts, planePoly, projPoly, billboard } from './world.js';
import { clamp, lerp, TAU, hash2, noise1 } from './core.js';
import { drawCube, cube } from './cube.js';

export const WALL_Z = 75;
export const DESK = { x0: -75, x1: 75, z0: 0, z1: 70, y: 74, th: 3.5 };
export const DOOR = { x0: -205, x1: -120, h: 205 };
export const SWITCH = { x: -104, y: 108 };
export const WINDOW = { x0: -48, x1: 48, y0: 112, y1: 206 };

export function drawBackWall(ctx, cam, st) {
  const Z = WALL_Z;
  poly(ctx, projPoly(cam, [[-420, 0, Z], [420, 0, Z], [420, 280, Z], [-420, 280, Z]]), C.wall);
  // faint wallpaper dots
  billboard(ctx, cam, 0, 0, Z, (c) => {
    c.fillStyle = 'rgba(200,180,150,0.22)';
    for (let i = -20; i <= 20; i++) for (let j = 1; j < 14; j++) {
      const x = i * 20 + (j % 2) * 10, y = -j * 20;
      c.beginPath(); c.arc(x, y, 0.9, 0, TAU); c.fill();
    }
  });
  // baseboard
  poly(ctx, projPoly(cam, [[-420, 0, Z], [420, 0, Z], [420, 9, Z], [-420, 9, Z]]), '#e6d7bf');
  line(ctx, projPts(cam, [[-420, 9, Z], [420, 9, Z]]), { lw: 2.4, seed: 2002 });
  line(ctx, projPts(cam, [[-420, 0, Z], [420, 0, Z]]), { lw: 2.4, seed: 2003 });
  drawWindow(ctx, cam, st);
  drawDoor(ctx, cam, st);
  // light switch
  billboard(ctx, cam, SWITCH.x, SWITCH.y, Z, (c) => {
    rect(c, -4, -6, 8, 12, { r: 1, fill: '#fbf6ec', seed: 2010, lw: 2.2 });
    const on = st.switchOn ?? 1;
    rect(c, -1.4, on > 0.5 ? -3.6 : -0.4, 2.8, 4, { r: 0.8, fill: '#e9e2d6', seed: 2011, lw: 1.8 });
  });
  // taped doodle of the little friend (the owner drew it)
  billboard(ctx, cam, -72, 150, Z, (c) => {
    c.save(); c.rotate(-0.05);
    rect(c, -13, -16, 26, 30, { fill: '#fffaf0', seed: 2020, lw: 2.2 });
    rect(c, -4, -18.5, 8, 4, { fill: 'rgba(240,220,170,0.8)', seed: 2021, lw: 1.2 });
    drawCube(c, cube({ x: 0, y: 6, size: 15, eyes: 'happy', blush: 0.7, armR: { a: 1.1 } }));
    text(c, 'hi!', 7, -9, { size: 5, color: C.orange, seed: 3 });
    c.restore();
  });
  // clock
  billboard(ctx, cam, 76, 176, Z, (c) => {
    circle(c, 0, 0, 12, { fill: '#fffaf0', seed: 2030, lw: 2.8 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      line(c, [[Math.cos(a) * 9.5, Math.sin(a) * 9.5], [Math.cos(a) * 10.8, Math.sin(a) * 10.8]], { lw: 1.4, seed: 2031 + i });
    }
    const mins = st.clockMin ?? 107; // minutes after midnight
    const ha = ((mins / 60) % 12) / 12 * TAU - Math.PI / 2;
    const ma = ((mins % 60) / 60) * TAU - Math.PI / 2;
    line(c, [[0, 0], [Math.cos(ha) * 5.5, Math.sin(ha) * 5.5]], { lw: 2.6, seed: 2045 });
    line(c, [[0, 0], [Math.cos(ma) * 8.5, Math.sin(ma) * 8.5]], { lw: 1.8, seed: 2046 });
    circle(c, 0, 0, 0.8, { fill: C.ink, seed: 2047, lw: 1 });
  });
  // shelf with books
  billboard(ctx, cam, 150, 150, Z, (c) => {
    const cols = ['#e2574c', '#8fb3d9', '#f6d365', '#9bc59d', '#e8a26b', '#b9a5d6'];
    let x = -36;
    for (let i = 0; i < 6; i++) {
      const w = 4 + hash2(i, 7) * 2.5, h = 18 + hash2(i, 9) * 7;
      rect(c, x, -h, w, h, { r: 0.4, fill: cols[i], seed: 2050 + i, lw: 2.2 });
      x += w + 0.4;
    }
    ctx.save();
    c.save(); c.translate(x + 5, 0); c.rotate(-0.25);
    rect(c, 0, -20, 4.5, 20, { r: 0.4, fill: '#d9b88f', seed: 2060, lw: 2.2 });
    c.restore();
    ctx.restore();
    // small plant pot on shelf
    c.save(); c.translate(24, 0); c.scale(0.9, 0.9);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      line(c, [[0, -8], [Math.cos(a) * 12, -8 + Math.sin(a) * 12]], { lw: 2.6, stroke: '#6f9e72', seed: 2070 + i });
    }
    rect(c, -5, -8, 10, 8, { r: 1, fill: '#e7c9a9', seed: 2080, lw: 2.2 });
    c.restore();
    rect(c, -42, 0, 84, 3, { fill: C.wood, seed: 2090, lw: 2.4 });
  });
}

function drawWindow(ctx, cam, st) {
  const Z = WALL_Z;
  const { x0, x1, y0, y1 } = WINDOW;
  billboard(ctx, cam, 0, y0, Z, (c) => {
    const w = x1 - x0, h = y1 - y0;
    // sky
    const g = c.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#1d2447'); g.addColorStop(1, '#3a4476');
    c.fillStyle = g;
    c.fillRect(-w / 2, -h, w, h);
    // stars
    for (let i = 0; i < 26; i++) {
      const sx = -w / 2 + hash2(i, 11) * w, sy = -h + hash2(i, 12) * h * 0.7;
      const tw = 0.55 + 0.45 * Math.sin((st.t || 0) * (1 + hash2(i, 13) * 2) + i);
      c.fillStyle = `rgba(255,244,210,${0.35 + 0.5 * tw})`;
      c.beginPath(); c.arc(sx, sy, 0.35 + hash2(i, 14) * 0.45, 0, TAU); c.fill();
    }
    // moon (crescent)
    c.save();
    c.fillStyle = '#fff3cf';
    c.beginPath(); c.arc(w * 0.22, -h * 0.72, 8, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#26305a';
    c.beginPath(); c.arc(w * 0.22 + 4, -h * 0.72 - 2.5, 7.2, 0, TAU); c.fill();
    c.restore();
    // distant rooftops
    const roofs = [[-48, -22], [-36, -30], [-24, -18], [-10, -26], [4, -20], [18, -34], [30, -24], [44, -19]];
    c.fillStyle = '#232a4d';
    c.beginPath(); c.moveTo(-w / 2, 0);
    roofs.forEach(([x, y], i) => { c.lineTo(x - 6, y); c.lineTo(x + 6, y); });
    c.lineTo(w / 2, 0); c.closePath(); c.fill();
    // few lit windows far away
    c.fillStyle = 'rgba(255,214,140,0.75)';
    [[-38, -22], [-12, -18], [16, -26], [20, -26], [31, -15]].forEach(([x, y]) => c.fillRect(x, y, 1.6, 2));
    // frame & mullions
    rect(c, -w / 2, -h, w, h, { fill: null, lw: 3.2, seed: 2101 });
    line(c, [[0, -h], [0, 0]], { lw: 3.2, seed: 2102 });
    line(c, [[-w / 2, -h * 0.45], [w / 2, -h * 0.45]], { lw: 2.8, seed: 2103 });
    // sill
    rect(c, -w / 2 - 5, 0, w + 10, 3.5, { r: 0.8, fill: '#f3ead9', seed: 2104, lw: 2.4 });
    // curtains
    const sway = Math.sin((st.t || 0) * 0.6) * 0.8;
    for (const side of [-1, 1]) {
      const cx = side * (w / 2 + 3);
      const pts = [[cx - 9, -h - 6], [cx + 9, -h - 6], [cx + 9 + sway * side, 4], [cx + 3, 8], [cx - 3 + sway, 4], [cx - 9 + sway, 8]];
      shape(c, pts, { fill: '#f0c9a8', seed: 2110 + side, lw: 2.6 });
      for (let k = -1; k <= 1; k++) line(c, [[cx + k * 4.5, -h - 3], [cx + k * 4.5 + sway, 3]], { lw: 1.4, stroke: '#d9a987', seed: 2115 + k + side * 3 });
    }
    rect(c, -w / 2 - 16, -h - 9, w + 32, 3, { r: 1.5, fill: C.wood, seed: 2120, lw: 2.4 });
  });
}

function drawDoor(ctx, cam, st) {
  const Z = WALL_Z;
  const open = clamp(st.doorOpen || 0);
  const w = DOOR.x1 - DOOR.x0, h = DOOR.h;
  billboard(ctx, cam, (DOOR.x0 + DOOR.x1) / 2, 0, Z, (c) => {
    // frame
    rect(c, -w / 2 - 4, -h - 4, w + 8, h + 4, { fill: '#f3ead9', seed: 2201, lw: 2.6 });
    if (open > 0.001) {
      // hallway beyond: warm light
      c.fillStyle = '#ffe1a8';
      c.fillRect(-w / 2, -h, w, h);
      // hallway wall + floor hint
      c.fillStyle = '#f6c98a';
      c.fillRect(-w / 2, -h * 0.18, w, h * 0.18);
      line(c, [[-w / 2, -h * 0.18], [w / 2, -h * 0.18]], { lw: 2, seed: 2202, stroke: '#c9955a' });
      if (st.doorFigure) st.doorFigure(c, w, h);
      // door slab swinging away (hinge on right side)
      const vis = Math.cos(open * Math.PI * 0.5);
      const dw = w * vis;
      shape(c, [[w / 2 - dw, -h], [w / 2, -h], [w / 2, 0], [w / 2 - dw, 0 - open * 3]], { fill: '#d9b88f', seed: 2203, lw: 2.6 });
      if (vis > 0.25) circle(c, w / 2 - dw + 6 * vis, -h * 0.48, 1.4, { fill: '#b8936a', seed: 2204, lw: 1.6 });
    } else {
      rect(c, -w / 2, -h, w, h, { fill: '#d9b88f', seed: 2205, lw: 2.6 });
      rect(c, -w / 2 + 8, -h + 10, w - 16, h * 0.38, { r: 1.5, fill: null, lw: 1.8, stroke: '#b8936a', seed: 2206 });
      rect(c, -w / 2 + 8, -h * 0.5, w - 16, h * 0.42, { r: 1.5, fill: null, lw: 1.8, stroke: '#b8936a', seed: 2207 });
      const hr = st.handleRot || 0;
      c.save(); c.translate(-w / 2 + 8, -h * 0.48);
      circle(c, 0, 0, 1.8, { fill: '#c9a26b', seed: 2208, lw: 1.8 });
      c.rotate(hr);
      rect(c, -0.6, -0.8, 7, 1.6, { r: 0.8, fill: '#c9a26b', seed: 2209, lw: 1.8 });
      c.restore();
      // light leaking under the door
      if (st.hallLight > 0) {
        c.fillStyle = `rgba(255,214,140,${st.hallLight})`;
        c.fillRect(-w / 2 + 1, -1.2, w - 2, 1.2);
        if (st.hallShadow) for (const sx of st.hallShadow) { c.fillStyle = 'rgba(40,30,30,0.85)'; c.fillRect(sx - 5, -1.2, 10, 1.2); }
      }
    }
  });
}

export function drawFloor(ctx, cam, st) {
  const nearZ = cam.z + 30;
  poly(ctx, planePoly(cam, 0, [[-600, WALL_Z], [600, WALL_Z], [600, nearZ], [-600, nearZ]]), C.floor);
  ctx.save();
  ctx.globalAlpha *= 0.55;
  for (let X = -600; X <= 600; X += 22) {
    const pts = planePts(cam, 0, [[X, WALL_Z], [X, nearZ]]);
    line(ctx, pts, { lw: 1.4, stroke: '#bda27f', seed: 2310 + X });
  }
  for (let Z = WALL_Z - 60; Z > nearZ; Z -= 60) {
    for (let X = -600; X < 600; X += 44) {
      const off = ((Z / 60) | 0) % 2 ? 22 : 0;
      const ab = planePts(cam, 0, [[X + off, Z], [X + off + 22, Z]]);
      if (ab.length === 2) line(ctx, ab, { lw: 1.2, stroke: '#bda27f', seed: 2400 + X + Z });
    }
  }
  ctx.restore();
  // rug under chair
  const rug = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    rug.push([Math.cos(a) * 95 - 5, -40 + Math.sin(a) * 55]);
  }
  shape(ctx, planePoly(cam, 0.2, rug), { fill: '#e9d2b5', seed: 2350, lw: 2.4 });
  shape(ctx, planePts(cam, 0.2, rug.map(([x, z]) => [(x + 5) * 0.8 - 5, (z + 40) * 0.8 - 40])), { fill: null, stroke: '#d4b48f', dash: [10, 8], seed: 2351, lw: 1.6 });
}

// desk body: top plane + front apron + legs
export function drawDesk(ctx, cam) {
  const { x0, x1, z0, z1, y, th } = DESK;
  // legs (back ones first)
  for (const [lx, lz] of [[x0 + 3, z1 - 3], [x1 - 3, z1 - 3]]) {
    shape(ctx, projPoly(cam, [[lx - 2, 0, lz], [lx + 2, 0, lz], [lx + 2, y - th, lz], [lx - 2, y - th, lz]]), { fill: C.woodDark, seed: 2501 + lx, lw: 2.4 });
  }
  // crossbar back
  shape(ctx, projPoly(cam, [[x0 + 3, 16, z1 - 3], [x1 - 3, 16, z1 - 3], [x1 - 3, 19, z1 - 3], [x0 + 3, 19, z1 - 3]]), { fill: C.woodDark, seed: 2505, lw: 2 });
  for (const [lx, lz] of [[x0 + 3, z0 + 3], [x1 - 3, z0 + 3]]) {
    shape(ctx, projPoly(cam, [[lx - 2.2, 0, lz], [lx + 2.2, 0, lz], [lx + 2.2, y - th, lz], [lx - 2.2, y - th, lz]]), { fill: C.woodDark, seed: 2511 + lx, lw: 2.4 });
  }
  // top plane
  shape(ctx, planePoly(cam, y, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]), { fill: C.wood, seed: 2520, lw: 2.8 });
  // wood grain
  ctx.save(); ctx.globalAlpha *= 0.35;
  for (let i = 0; i < 6; i++) {
    const zz = z0 + 6 + i * 11;
    const xs = x0 + 10 + hash2(i, 3) * 40, xe = xs + 30 + hash2(i, 4) * 50;
    line(ctx, planePts(cam, y, [[xs, zz], [xe, zz + 1.5]]), { lw: 1.4, stroke: C.woodDark, seed: 2530 + i });
  }
  ctx.restore();
  // front apron
  if (cam.view(0, z0)[1] > cam.near) shape(ctx, projPoly(cam, [[x0, y, z0], [x1, y, z0], [x1, y - th, z0], [x0, y - th, z0]]), { fill: '#c9a37a', seed: 2540, lw: 2.8 });
}

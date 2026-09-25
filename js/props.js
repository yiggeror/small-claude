// Desk props, drawn as flat billboards in centimetre units.
// Origin = bottom-centre of the object's front face. `el` = view elevation (0 = eye level, 1 = top-down).
import { C, shape, rect, line, ellipse, circle, rectPts, ellipsePts, text } from './draw.js';
import { clamp, lerp, TAU, hash2 } from './core.js';

// ---------------------------------------------------------------- books
export function drawBooks(ctx, el) {
  // two books; spines face the camera
  const books = [
    { w: 34, h: 3.6, y: 0, fill: '#8fb0c9', band: '#6e93b0', dx: 0 },
    { w: 32, h: 3.2, y: -3.6, fill: '#a7c49a', band: '#86a67a', dx: 0.8 },
  ];
  for (const b of books) {
    const x = -b.w / 2 + b.dx;
    // (top faces are drawn as real planes by the renderer)
    rect(ctx, x, b.y - b.h, b.w, b.h, { r: 0.4, fill: b.fill, seed: 311 + b.w, lw: 2.6 });
    rect(ctx, x + b.w * 0.14, b.y - b.h * 0.8, b.w * 0.05, b.h * 0.6, { fill: b.band, seed: 321 + b.w, lw: 1.6 });
    rect(ctx, x + b.w * 0.8, b.y - b.h * 0.8, b.w * 0.05, b.h * 0.6, { fill: b.band, seed: 331 + b.w, lw: 1.6 });
  }
}
export const BOOKS_H = 6.8;
export const BOOKS = [{ w: 34, h: 3.6, y0: 0, fill: '#8fb0c9', dx: 0 }, { w: 32, h: 3.2, y0: 3.6, fill: '#a7c49a', dx: 0.8 }];
export const BOOK_D = 22;

// ---------------------------------------------------------------- laptop
// o: { a: lid angle rad (0 closed, ~1.85 open), screen: fn(ctx,w,h), screenOn: 0..1, seam: 0..1 glow }
export const LAPTOP = { w: 31, d: 21, base: 1.3, lid: 0.7, sw: 29, sh: 18 };
export function laptopLidTop(o, el) {
  const { d, base } = LAPTOP;
  const yh = -base - d * el;
  const a = o.a || 0;
  return yh + d * el * Math.cos(a) - d * Math.sin(a) * Math.sqrt(1 - el * el) - LAPTOP.lid;
}
export function drawLaptop(ctx, o, el) {
  const { w, d, base, lid } = LAPTOP;
  const a = o.a || 0;
  const cl = Math.sqrt(1 - el * el);
  const yDeck = -base;              // front top edge of base
  const yHinge = -base - d * el;    // back edge of base (hinge line)
  const silver = '#d4cfc6', silverDark = '#b3ada3';
  const yTop = yHinge + d * el * Math.cos(a) - d * Math.sin(a) * cl;
  if (a >= 0.35) {
    // ---------------- open: deck + screen face
    shape(ctx, [[-w / 2, yDeck], [w / 2, yDeck], [w / 2 - 0.4, yHinge], [-w / 2 + 0.4, yHinge]], { fill: silver, seed: 401, lw: 2.6 });
    if (el > 0.08) for (let r = 0; r < 4; r++) {
      const yy = lerp(yHinge, yDeck, 0.2 + r * 0.16);
      line(ctx, [[-w * 0.38, yy], [w * 0.38, yy]], { lw: 1.2, stroke: silverDark, seed: 410 + r });
    }
    const bezel = '#2e2a27';
    shape(ctx, [[-w / 2, yHinge], [w / 2, yHinge], [w / 2, yTop], [-w / 2, yTop]], { fill: bezel, seed: 405, lw: 2.6 });
    const sh = Math.abs(yHinge - yTop);
    if (sh > 1.2 && o.screen) {
      const mx = (w - LAPTOP.sw) / 2;
      const top = Math.min(yHinge, yTop) + sh * 0.06;
      const hh = sh * 0.84;
      ctx.save();
      ctx.beginPath(); ctx.rect(-w / 2 + mx, top, LAPTOP.sw, hh); ctx.clip();
      ctx.translate(-w / 2 + mx, top);
      ctx.scale(1, hh / LAPTOP.sh);
      o.screen(ctx, LAPTOP.sw, LAPTOP.sh, o.screenOn ?? 1);
      ctx.restore();
    }
    if (o.lidTop) o.lidTop(ctx, yTop, el);
  } else {
    // ---------------- closed or cracked open at the front
    const gap = d * Math.sin(a) * cl;          // visible opening at the front edge
    const yLidBottom = yDeck - gap;             // underside of lid at the front
    const yLidTopF = yLidBottom - lid;           // top of lid at the front
    const yLidTopB = yHinge - lid;               // top of lid at the hinge
    if (gap > 0.01) {
      // dark inside of the gap
      shape(ctx, [[-w / 2 + 0.3, yDeck], [w / 2 - 0.3, yDeck], [w / 2 - 0.3, yLidBottom], [-w / 2 + 0.3, yLidBottom]], { fill: '#1a1512', seed: 408, lw: 1.6, amp: 0.3 });
      if (o.gapFn) {
        ctx.save();
        ctx.beginPath(); ctx.rect(-w / 2, yLidBottom - 0.05, w, gap + 0.1); ctx.clip();
        o.gapFn(ctx, yDeck, yLidBottom, w);
        ctx.restore();
      }
    }
    // lid top surface (visible when the camera looks down on it)
    if (yLidTopB < yLidTopF - 0.05) {
      shape(ctx, [[-w / 2, yLidTopF], [w / 2, yLidTopF], [w / 2 - 0.4, yLidTopB], [-w / 2 + 0.4, yLidTopB]], { fill: silver, seed: 402, lw: 2.6 });
      ellipse(ctx, 0, lerp(yLidTopB, yLidTopF, 0.55), 1.6, Math.max(0.05, 1.6 * el), { fill: silverDark, lw: 1.2, seed: 403, alpha: 0.6 });
    }
    // lid front edge
    rect(ctx, -w / 2, yLidTopF, w, lid, { r: 0.2, fill: silver, seed: 404, lw: 2.6 });
    if (o.lidTop) o.lidTop(ctx, yLidTopF, el);
    if (o.gapOver) o.gapOver(ctx, yDeck, yLidBottom, w);
  }
  // base front face
  rect(ctx, -w / 2, -base, w, base, { r: 0.3, fill: silver, seed: 406, lw: 2.6 });
  line(ctx, [[-w * 0.08, -base * 0.45], [w * 0.08, -base * 0.45]], { lw: 1.4, stroke: silverDark, seed: 407 });
  // power LED
  const led = o.led || 0;
  circle(ctx, w * 0.4, -base * 0.5, 0.22, { fill: led > 0.05 ? `rgba(255,255,245,${0.4 + led * 0.6})` : '#8d857b', lw: 1, seed: 409 });
}

// ---------------------------------------------------------------- external keyboard
export const KB = { w: 42, d: 13, h: 2.0, rows: 5, cols: 14, cap: 0.8 };
// returns world-local y of the top of key (row r from back 0..4, col c)
export function kbKeyPos(r, c, el) {
  const { w, d, h, rows, cols } = KB;
  const kx = -w / 2 + 1.2 + (c + 0.5) * ((w - 2.4) / cols);
  const zRow = d - 1.4 - r * ((d - 2.6) / (rows - 1)); // depth from front
  const y = -h - zRow * el;
  return { x: kx, y, z: zRow };
}
export function kbRowZ(r) { return KB.d - 1.4 - r * ((KB.d - 2.6) / (KB.rows - 1)); }
export function kbColX(c) { return -KB.w / 2 + 1.2 + (c + 0.5) * ((KB.w - 2.4) / KB.cols); }
// one row of keycaps, drawn as a billboard standing on the keyboard plate (origin: plate top, row centre)
export function drawKeyRow(ctx, el, r, o = {}) {
  const { rows, cols, cap } = KB;
  const kw = (KB.w - 2.4) / cols;
  for (let c = 0; c < cols; c++) {
    if (r === rows - 1 && c > 4 && c < 10) continue; // spacebar spans 4..9
    let kx = kbColX(c) - kw * 0.42, kwid = kw * 0.84;
    if (r === rows - 1 && c === 4) kwid = kw * 6 - kw * 0.16;
    let press = 0;
    if (o.pressed) for (const q of o.pressed) if (q.r === r && q.c === c) press = Math.max(press, q.k);
    const capH = cap * (1 - press * 0.6);
    const topDepth = Math.max(0.12, kw * 0.75 * el);
    const y0 = -capH;
    const fill = r === rows - 1 && c === 4 ? '#f7f2e8' : '#fbf6ec';
    shape(ctx, [[kx, 0], [kx + kwid, 0], [kx + kwid, y0], [kx + kwid - 0.15, y0 - topDepth], [kx + 0.15, y0 - topDepth], [kx, y0]], { fill, seed: 510 + r * 20 + c, lw: 1.8, seg: 8 });
    if (topDepth > 0.35) line(ctx, [[kx + 0.05, y0], [kx + kwid - 0.05, y0]], { lw: 1.0, stroke: '#cfc6b8', seed: 610 + r * 20 + c });
  }
}
// the keyboard plate top at local origin = front-left... (legacy single-billboard version for far shots)
export function drawKeyboard(ctx, el, o = {}) {
  const { w, d, h, rows } = KB;
  shape(ctx, [[-w / 2, -h], [w / 2, -h], [w / 2 - 0.3, -h - d * el], [-w / 2 + 0.3, -h - d * el]], { fill: '#e9e2d6', seed: 501, lw: 2.6 });
  for (let r = 0; r < rows; r++) {
    ctx.save(); ctx.translate(0, -h - kbRowZ(r) * el);
    drawKeyRow(ctx, el, r, o);
    ctx.restore();
  }
  rect(ctx, -w / 2, -h, w, h, { r: 0.4, fill: '#ddd4c6', seed: 502, lw: 2.6 });
}

// ---------------------------------------------------------------- mouse & pad
export function drawMouse(ctx, el, o = {}) {
  const w = 6.4, h = 3.6, len = 11;
  const topH = h + len * el * 0.55;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    pts.push([Math.cos(a) * w / 2, Math.sin(a) * topH * (i > 3 && i < 21 ? 1 : 0.9)]);
  }
  pts.push([w / 2, 0], [-w / 2, 0]);
  shape(ctx, pts, { fill: '#f1ebe0', seed: 701, lw: 2.6 });
  // button split + wheel
  const click = o.click || 0;
  line(ctx, [[0, -topH * 0.98], [0, -topH * 0.55 + click * 0.2]], { lw: 1.6, seed: 702 });
  rect(ctx, -0.45, -topH * 0.95 + click * 0.15, 0.9, topH * 0.2, { r: 0.4, fill: '#b9b1a6', seed: 703, lw: 1.4 });
  line(ctx, [[-w * 0.42, -h * 0.22], [w * 0.42, -h * 0.22]], { lw: 1.2, stroke: '#cfc6b8', seed: 704 });
}
export function drawPlateCookie(ctx, el, o = {}) {
  // plate
  const pr = 7.5, rim = 0.7;
  ellipse(ctx, 0, -rim, pr, pr * el, { fill: '#f7f4ee', seed: 801, lw: 2.6 });
  ellipse(ctx, 0, -rim, pr * 0.7, pr * 0.7 * el, { fill: null, stroke: '#d9d1c4', seed: 802, lw: 1.4 });
  if (o.crumbs) drawCrumbs(ctx, el, o.crumbs, o.crumbSeed || 3);
  if (!o.noCookie) drawCookie(ctx, el, { ...o, y: -rim - 0.1 });
}
export function drawCrumbs(ctx, el, k, seed) {
  for (let i = 0; i < 9; i++) {
    const a = hash2(i, seed) * TAU, r = 3.2 + hash2(i + 5, seed) * 3.2;
    const x = Math.cos(a) * r, y = -0.8 + Math.sin(a) * r * el;
    const on = clamp(k * 9 - i);
    if (on > 0) circle(ctx, x, y, 0.22 + hash2(i, seed + 2) * 0.2, { fill: '#c98d4c', lw: 1, seed: 830 + i, alpha: on });
  }
}
// cookie outline in top-view (unit circle scaled), with an optional bite of size `miss` at angle `missA`
export function cookieOutline(r, miss = 0, missA = 0, n = 44) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let rr = r * (1 + 0.035 * Math.sin(a * 5 + 1.3) + 0.02 * Math.sin(a * 9));
    if (miss > 0) {
      const da = Math.atan2(Math.sin(a - missA), Math.cos(a - missA));
      const wAng = 0.55 + miss * 0.5;
      if (Math.abs(da) < wAng) {
        const k = Math.cos((da / wAng) * Math.PI / 2);
        const bite = r * (0.18 + miss * 0.32) * k * (1 + 0.25 * Math.sin(a * 23));
        rr -= bite;
      }
    }
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return pts;
}
export function drawCookie(ctx, el, o = {}) {
  const r = 4.2, th = 0.9;
  const y0 = o.y ?? 0;
  const top = cookieOutline(r, o.miss || 0, o.missA ?? -0.6).map(([x, z]) => [x, y0 - th + z * el]);
  // side band: bottom outline shifted down
  const side = top.map(([x, y]) => [x, y + th]);
  const hull = [];
  // simple side: draw bottom version first, then top
  shape(ctx, side, { fill: '#c98d4c', seed: 851, lw: 2.4 });
  shape(ctx, top, { fill: '#e2ab66', seed: 852, lw: 2.4 });
  // chips
  const chips = [[-1.8, -1.2], [1.2, -1.9], [2.0, 1.0], [-0.6, 1.9], [-2.4, 0.8], [0.4, -0.2], [1.6, -0.2]];
  chips.forEach(([cx, cz], i) => {
    // skip chips inside the missing region
    if (o.miss) {
      const a = Math.atan2(cz, cx), da = Math.atan2(Math.sin(a - (o.missA ?? -0.6)), Math.cos(a - (o.missA ?? -0.6)));
      if (Math.abs(da) < 0.6 + o.miss * 0.4 && Math.hypot(cx, cz) > r * (0.55 - o.miss * 0.2)) return;
    }
    ellipse(ctx, cx, y0 - th + cz * el, 0.45, 0.45 * Math.max(el, 0.35), { fill: '#5a3a26', seed: 860 + i, lw: 1 });
  });
}

// broken-off cookie piece held by the cube (local units = cm)
export function drawCookiePiece(ctx, s = 1) {
  // a wedge-ish broken chunk: round outer edge, jagged broken edge
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = -2.3 + i * 0.3; pts.push([Math.cos(a) * 1.25 * s, Math.sin(a) * 1.05 * s + 0.35 * s]); }
  pts.push([0.55 * s, 0.55 * s], [0.25 * s, 0.25 * s], [-0.05 * s, 0.5 * s], [-0.4 * s, 0.2 * s], [-0.7 * s, 0.45 * s]);
  shape(ctx, pts.map(([x, y]) => [x, y + 0.18 * s]), { fill: '#c98d4c', seed: 870, lw: 2 });
  shape(ctx, pts, { fill: '#e2ab66', seed: 871, lw: 2.2 });
  ellipse(ctx, -0.35 * s, -0.25 * s, 0.22 * s, 0.18 * s, { fill: '#5a3a26', seed: 872, lw: 1 });
  ellipse(ctx, 0.4 * s, -0.45 * s, 0.17 * s, 0.14 * s, { fill: '#5a3a26', seed: 873, lw: 1 });
}

// ---------------------------------------------------------------- mug
export function drawMug(ctx, el, o = {}) {
  const w = 8.2, h = 9.4;
  const ry = (w / 2) * el;
  // handle
  shape(ctx, [[w / 2 - 0.2, -h * 0.78], [w / 2 + 2.6, -h * 0.72], [w / 2 + 2.9, -h * 0.45], [w / 2 + 2.2, -h * 0.25], [w / 2 - 0.2, -h * 0.25], [w / 2 + 1.4, -h * 0.36], [w / 2 + 1.5, -h * 0.62], [w / 2 - 0.2, -h * 0.64]], { fill: '#9ab6cf', seed: 901, lw: 2.4 });
  // body
  const body = [[-w / 2, -h], ...ellipsePts(0, 0, w / 2, ry, 20, Math.PI, 0).map(([x, y]) => [x, y]).reverse().map(([x, y]) => [x, y])];
  const bpts = [[-w / 2, -h]];
  for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; bpts.push([Math.cos(a) * w / 2, Math.sin(a) * ry]); }
  bpts.push([w / 2, -h]);
  shape(ctx, bpts, { fill: '#9ab6cf', seed: 902, lw: 2.6 });
  // stripe
  line(ctx, [[-w / 2 + 0.2, -h * 0.72], [w / 2 - 0.2, -h * 0.72]], { lw: 2.2, stroke: '#f6efe2', seed: 903 });
  // opening
  ellipse(ctx, 0, -h, w / 2, ry, { fill: '#7f9bb3', seed: 904, lw: 2.4 });
  if (el > 0.1) ellipse(ctx, 0, -h + ry * 0.35, w / 2 - 0.7, ry * 0.65, { fill: o.empty ? '#6d879e' : '#4a3226', noStroke: true, seed: 905 });
}

// ---------------------------------------------------------------- pen cup, pen
export function drawPenCup(ctx, el) {
  // pens behind
  const pens = [[-1.6, 15, '#e2574c', -0.12], [0.4, 16.5, '#2b2622', 0.05], [1.8, 14, '#f6d365', 0.16], [-0.3, 13.5, '#8fb3d9', -0.03]];
  for (const [x, len, col, rot] of pens) {
    ctx.save(); ctx.translate(x, -9); ctx.rotate(rot);
    rect(ctx, -0.45, -len + 9, 0.9, len - 3, { r: 0.4, fill: col === '#2b2622' ? '#4a4540' : '#fbf6ec', seed: 951 + x * 10, lw: 2 });
    rect(ctx, -0.5, -len + 9, 1.0, 2.6, { r: 0.4, fill: col, seed: 961 + x * 10, lw: 2 });
    ctx.restore();
  }
  const w = 7, h = 10, ry = 3.5 * el;
  const bpts = [[-w / 2, -h]];
  for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; bpts.push([Math.cos(a) * w / 2, Math.sin(a) * ry]); }
  bpts.push([w / 2, -h]);
  shape(ctx, bpts, { fill: '#e8743b', seed: 971, lw: 2.6 });
  ellipse(ctx, 0, -h, w / 2, ry, { fill: '#c95a26', seed: 972, lw: 2.2 });
  // doodle on cup
  line(ctx, [[-2, -5.5], [-1, -6.2], [0, -5.5], [1, -6.2], [2, -5.5]], { lw: 1.6, stroke: '#fbe3cf', seed: 973 });
}
// loose pen lying left-right, rolling toward/away from camera. rot = roll angle (rad)
export function drawPen(ctx, el, rot = 0) {
  const len = 14, r = 0.55;
  ctx.save();
  ctx.translate(0, -r);
  rect(ctx, -len / 2, -r, len, r * 2, { r: r, fill: '#fbf6ec', seed: 981, lw: 2.2 });
  rect(ctx, len / 2 - 4.2, -r * 1.05, 4.2, r * 2.1, { r: r, fill: '#e2574c', seed: 982, lw: 2.2 });
  // tip
  shape(ctx, [[-len / 2, -r * 0.6], [-len / 2 - 1.1, 0], [-len / 2, r * 0.6]], { fill: '#8d857b', seed: 983, lw: 1.8 });
  // clip rotates around
  const cy = Math.sin(rot) * r * 0.9;
  const vis = Math.cos(rot);
  if (vis > -0.2) {
    ctx.save(); ctx.globalAlpha *= clamp(vis + 0.2);
    rect(ctx, len / 2 - 3.8, cy - 0.18, 3.2, 0.36, { r: 0.15, fill: '#b9b1a6', seed: 984, lw: 1.4 });
    ctx.restore();
  }
  // rolling stripes
  for (let i = 0; i < 3; i++) {
    const a = rot + (i * TAU) / 3;
    if (Math.cos(a) > 0) {
      const yy = Math.sin(a) * r * 0.8;
      line(ctx, [[-len / 2 + 1 + i * 2.6, yy], [-len / 2 + 2 + i * 2.6, yy]], { lw: 1.2, stroke: '#cfc6b8', seed: 985 + i });
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- sticky notes
// drawn on the desk plane: w x w square foreshortened by el. o.content: fn(ctx, size) in top-view
export function drawStickyPad(ctx, el, o = {}) {
  const w = 7.6, th = 0.9;
  const top = [[-w / 2, -th], [w / 2, -th], [w / 2, -th - w * el], [-w / 2, -th - w * el]];
  rect(ctx, -w / 2, -th, w, th, { fill: '#f3d36b', seed: 1001, lw: 2.2 });
  for (let i = 1; i < 3; i++) line(ctx, [[-w / 2, -th * i / 3], [w / 2, -th * i / 3]], { lw: 1, stroke: '#d7b34c', seed: 1002 + i });
  shape(ctx, top, { fill: '#f7df7e', seed: 1004, lw: 2.2 });
  if (o.content && el > 0.2) {
    ctx.save();
    ctx.translate(-w / 2, -th - w * el);
    ctx.scale(1, el);
    o.content(ctx, w);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- lamp
export function drawLamp(ctx, el, o = {}) {
  const on = o.on || 0;
  ellipse(ctx, 0, -0.8, 6, 6 * el + 0.4, { fill: '#e8743b', seed: 1101, lw: 2.6 });
  rect(ctx, -6, -1.4, 12, 1.4, { r: 0.5, fill: '#c95a26', seed: 1102, lw: 2.2 });
  // arm
  line(ctx, [[0, -1.5], [3, -24], [14, -36]], { lw: 3.4, seed: 1103 });
  circle(ctx, 3, -24, 0.9, { fill: '#e8743b', seed: 1104, lw: 2 });
  // head (cone pointing down-right)
  ctx.save(); ctx.translate(14, -36); ctx.rotate(0.55);
  shape(ctx, [[-2.2, -2.5], [2.2, -2.5], [5.5, 4.5], [-5.5, 4.5]], { fill: '#e8743b', seed: 1105, lw: 2.6 });
  ellipse(ctx, 0, 4.5, 5.5, 1.3, { fill: on > 0.5 ? '#fff4c8' : '#c95a26', seed: 1106, lw: 2 });
  ctx.restore();
}

// ---------------------------------------------------------------- plant
export function drawPlant(ctx, el) {
  const leaves = [[-3, -16, -0.5], [0, -19, 0], [3, -15, 0.5], [-4.5, -12, -0.9], [4.2, -11.5, 0.9]];
  leaves.forEach(([x, y, r], i) => {
    ctx.save(); ctx.translate(0, -7); ctx.rotate(r);
    ellipse(ctx, 0, (y + 7) * 0.55, 2.2, Math.abs(y + 7) * 0.55, { fill: i % 2 ? '#9bc59d' : '#86b489', seed: 1201 + i, lw: 2.2 });
    ctx.restore();
  });
  shape(ctx, [[-4.5, -8], [4.5, -8], [3.6, 0], [-3.6, 0]], { fill: '#e7c9a9', seed: 1210, lw: 2.6 });
  rect(ctx, -5, -9.2, 10, 1.6, { r: 0.4, fill: '#d9b48f', seed: 1211, lw: 2.2 });
}

// ---------------------------------------------------------------- office chair (seen from behind)
export function drawChairBack(ctx, o = {}) {
  const tilt = o.tilt || 0;
  const fab = '#7d8fa6', fabD = '#66778d';
  // base star
  line(ctx, [[-26, -4], [0, -9], [26, -4]], { lw: 4, seed: 1301 });
  line(ctx, [[-14, -1], [0, -9], [14, -1]], { lw: 4, seed: 1302 });
  for (const x of [-26, -14, 14, 26]) circle(ctx, x, -2.5, 2.4, { fill: '#3b3835', seed: 1303 + x, lw: 2 });
  rect(ctx, -1.6, -46, 3.2, 38, { fill: '#8d857b', seed: 1310, lw: 2.4 });
  // seat
  rect(ctx, -24, -52, 48, 7, { r: 3, fill: fabD, seed: 1311, lw: 2.6 });
  // backrest (hides lower torso)
  ctx.save(); ctx.translate(0, -52); ctx.rotate(tilt);
  rect(ctx, -2, -12, 4, 12, { fill: '#8d857b', seed: 1312, lw: 2.2 });
  rect(ctx, -19, -33, 38, 23, { r: 7, fill: fab, seed: 1313, lw: 2.8 });
  line(ctx, [[-13, -21], [13, -21]], { lw: 1.4, stroke: fabD, seed: 1314 });
  ctx.restore();
}
// empty chair seen from behind uses same drawing

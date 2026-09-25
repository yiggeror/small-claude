// Act 0 — a quiet night street; one window still lit. Title.
import { C, shape, rect, line, ellipse, circle, text, poly } from '../draw.js';
import { drawCube, cube } from '../cube.js';
import { addGlow } from '../light.js';
import { key, clamp, lerp, ease, hash2, TAU, landSquash } from '../core.js';
import { T } from './times.js';

const WIN = { x: 1003, y: 718, w: 70, h: 84 }; // our lit window (screen space)

function drawExterior(ctx, t) {
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, 1080);
  g.addColorStop(0, '#171d3b'); g.addColorStop(0.65, '#2d3665'); g.addColorStop(1, '#434a7a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  // stars
  for (let i = 0; i < 90; i++) {
    const x = hash2(i, 1) * 1920, y = hash2(i, 2) * 620;
    const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + hash2(i, 3) * 2.2) + i * 1.7);
    ctx.fillStyle = `rgba(255,244,214,${0.25 + 0.6 * tw})`;
    const r = 1 + hash2(i, 4) * 1.8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (hash2(i, 5) > 0.9) { // a few twinkly crosses
      ctx.strokeStyle = `rgba(255,244,214,${0.4 * tw})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    }
  }
  // moon
  addGlow(ctx, 1560, 190, 260, '255,236,190', 0.25);
  ctx.save();
  ctx.fillStyle = '#fff1c9';
  ctx.beginPath(); ctx.arc(1560, 190, 62, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#1d2448';
  ctx.beginPath(); ctx.arc(1590, 170, 56, 0, TAU); ctx.fill();
  ctx.restore();
  // clouds
  for (const [cx, cy, s, sp] of [[380, 230, 1.2, 6], [1180, 120, 0.9, 4], [1750, 420, 0.8, 5]]) {
    const x = cx + t * sp;
    const pts = [];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU;
      const r = 1 + 0.18 * Math.sin(a * 4 + cx);
      pts.push([x + Math.cos(a) * 120 * s * r, cy + Math.sin(a) * 34 * s * r * (Math.sin(a) > 0 ? 0.5 : 1)]);
    }
    shape(ctx, pts, { fill: 'rgba(90,100,150,0.55)', stroke: 'rgba(160,170,210,0.5)', lw: 2, seed: cx | 0 });
  }
  // far city
  ctx.fillStyle = '#262c52';
  ctx.beginPath(); ctx.moveTo(0, 1080);
  let x = 0;
  for (let i = 0; x < 1920; i++) {
    const w = 60 + hash2(i, 9) * 90, h = 120 + hash2(i, 10) * 200;
    ctx.lineTo(x, 1080 - h); ctx.lineTo(x + w, 1080 - h); x += w;
  }
  ctx.lineTo(1920, 1080); ctx.closePath(); ctx.fill();
  x = 0;
  for (let i = 0; x < 1920; i++) {
    const w = 60 + hash2(i, 9) * 90, h = 120 + hash2(i, 10) * 200;
    for (let k = 0; k < 6; k++) if (hash2(i * 13 + k, 11) > 0.72) {
      ctx.fillStyle = 'rgba(255,208,130,0.55)';
      ctx.fillRect(x + 10 + hash2(k, i) * (w - 24), 1080 - h + 16 + hash2(k + 3, i) * (h - 40), 7, 9);
    }
    x += w;
  }
  // our building
  const bx = 760, by = 500, bw = 560, bh = 640;
  shape(ctx, [[bx, 1090], [bx, by], [bx + bw, by], [bx + bw, 1090]], { fill: '#8b86a8', lw: 3.2, seed: 6001 });
  rect(ctx, bx - 16, by - 22, bw + 32, 26, { fill: '#6f6a8c', lw: 3, seed: 6002 });
  // water tank / antenna on roof
  rect(ctx, bx + 400, by - 90, 70, 70, { r: 6, fill: '#6f6a8c', lw: 3, seed: 6003 });
  line(ctx, [[bx + 120, by - 22], [bx + 120, by - 120], [bx + 100, by - 100]], { lw: 3, seed: 6004 });
  // windows grid
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const wx = bx + 60 + c * 125, wy = by + 70 + r * 170;
    const ours = r === 1 && c === 2;
    if (ours) continue;
    const lit = hash2(r * 4 + c, 21) > 0.86;
    rect(ctx, wx, wy, 70, 84, { r: 4, fill: lit ? '#d9b577' : '#3b3f66', lw: 2.8, seed: 6010 + r * 4 + c });
    line(ctx, [[wx + 35, wy], [wx + 35, wy + 84]], { lw: 2, seed: 6030 + r * 4 + c });
    rect(ctx, wx - 6, wy + 84, 82, 7, { fill: '#77729a', lw: 2, seed: 6050 + r * 4 + c });
  }
  // our window: warm light + a tiny silhouette at a desk with a glowing screen
  const { x: wx, y: wy, w, h } = WIN;
  addGlow(ctx, wx + w / 2, wy + h / 2, 160, '255,200,120', 0.45);
  rect(ctx, wx, wy, w, h, { r: 4, fill: '#ffd99a', lw: 2.8, seed: 6070 });
  ctx.save();
  ctx.beginPath(); ctx.rect(wx + 2, wy + 2, w - 4, h - 4); ctx.clip();
  // curtain edges
  ctx.fillStyle = '#f2b98a'; ctx.fillRect(wx, wy, 10, h); ctx.fillRect(wx + w - 10, wy, 10, h);
  // silhouette
  ctx.fillStyle = '#4a3a33';
  ctx.beginPath(); ctx.arc(wx + 28, wy + 44, 8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(wx + 16, wy + h); ctx.quadraticCurveTo(wx + 16, wy + 52, wx + 28, wy + 54); ctx.quadraticCurveTo(wx + 40, wy + 52, wx + 40, wy + h); ctx.fill();
  ctx.fillStyle = '#fff6e0'; ctx.fillRect(wx + 46, wy + 52, 14, 11);
  ctx.fillStyle = '#e8743b'; ctx.fillRect(wx + 49, wy + 57, 4, 3);
  ctx.restore();
  line(ctx, [[wx + 35, wy], [wx + 35, wy + 30]], { lw: 2, seed: 6071 });
  rect(ctx, wx - 6, wy + h, w + 12, 7, { fill: '#77729a', lw: 2, seed: 6072 });
  // entrance
  rect(ctx, bx + bw / 2 - 50, 950, 100, 140, { r: 6, fill: '#5b567b', lw: 3, seed: 6080 });
  // tree (left)
  const sway = Math.sin(t * 0.9) * 4;
  line(ctx, [[520, 1090], [528, 820], [540, 760]], { lw: 5, seed: 6090 });
  for (const [cx, cy, r] of [[540, 700, 110], [470, 760, 80], [610, 770, 85], [540, 800, 90]]) {
    circle(ctx, cx + sway, cy, r, { fill: '#2f4a4f', lw: 3, seed: 6091 + cx });
  }
  // street lamp (right)
  line(ctx, [[1500, 1090], [1500, 760], [1540, 730], [1580, 740]], { lw: 5, seed: 6100 });
  shape(ctx, [[1560, 740], [1600, 740], [1612, 762], [1548, 762]], { fill: '#fce7b4', lw: 3, seed: 6101 });
  addGlow(ctx, 1580, 770, 220, '255,220,150', 0.35);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cg = ctx.createLinearGradient(0, 760, 0, 1080);
  cg.addColorStop(0, 'rgba(255,220,150,0.18)'); cg.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.moveTo(1552, 762); ctx.lineTo(1608, 762); ctx.lineTo(1720, 1080); ctx.lineTo(1440, 1080); ctx.closePath(); ctx.fill();
  ctx.restore();
  // ground
  poly(ctx, [[0, 1060], [1920, 1060], [1920, 1080], [0, 1080]], '#23284a');
}

function drawTitle(ctx, t) {
  const a = 1 - clamp((t - T.titleOut) / 0.6);
  if (a <= 0 || t < T.titleWrite) return;
  ctx.save();
  ctx.globalAlpha = a;
  const zh = '关闭电脑之后';
  const cx = 960, cy = 205;
  ctx.font = '120px "ZCOOL KuaiLe"';
  const total = ctx.measureText(zh).width;
  let x = cx - total / 2;
  for (let i = 0; i < zh.length; i++) {
    const ti = T.titleWrite + i * 0.17;
    const k = clamp((t - ti) / 0.35);
    const w = ctx.measureText(zh[i]).width;
    if (k > 0) {
      const s = ease.outBack(k);
      ctx.save();
      ctx.translate(x + w / 2, cy + (1 - k) * 18);
      ctx.scale(s, s);
      ctx.rotate((hash2(i, 77) - 0.5) * 0.08);
      text(ctx, zh[i], 0, 0, { size: 120, font: '"ZCOOL KuaiLe"', color: '#fdf1dc', alpha: clamp(k * 2), seed: i });
      ctx.restore();
    }
    x += w;
  }
  // english subtitle
  const ke = clamp((t - (T.titleWrite + 1.3)) / 0.7);
  if (ke > 0) text(ctx, 'After the Laptop Closes', cx, cy + 108 + (1 - ease.out(ke)) * 16, { size: 56, color: '#e9d9bf', alpha: ke, font: '"Patrick Hand"' });
  // the orange cursor after the title: blinks... then turns out to be alive
  const endX = cx + total / 2 + 34;
  const tc = T.titleWrite + 1.4;
  if (t > tc) {
    const tl = t - tc;
    const morph = clamp((tl - 1.9) / 0.35);
    if (morph <= 0) {
      if (Math.floor(tl * 2.2) % 2 === 0) { ctx.fillStyle = '#e8743b'; ctx.fillRect(endX - 22, cy - 48, 44, 92); }
    } else {
      // cursor → little friend
      const base = cy + 48;
      let cx2 = endX, y = base, sq = 0, look = 0, walk = 0, walkAmt = 0, tuck = 0, face = 0;
      const run0 = 3.05;
      look = tl < 2.5 ? 0 : tl < 2.7 ? -1 : tl < 2.9 ? 1 : 0;
      if (tl > run0 - 0.12 && tl < run0) sq = 0.25;
      if (tl >= run0) {
        const k = tl - run0;
        cx2 = endX + k * k * 180 + k * 520;
        walk = k * 7; walkAmt = 1.2; face = 1;
        y = base - Math.abs(Math.sin(k * 14)) * 5;
      }
      const s = lerp(0.2, 1, ease.outBack(morph));
      const c = cube({ x: cx2, y, size: 70 * s + 10, sq: sq + (1 - landSquash(tl, 2.25, 0.25)), lookX: look, walk, walkAmt, facing: face, lean: face ? 0.25 : 0, alpha: 1 });
      if (morph < 1) {
        ctx.fillStyle = '#e8743b';
        ctx.globalAlpha = a * (1 - morph);
        ctx.fillRect(endX - 22, cy - 48, 44, 92);
        ctx.globalAlpha = a;
      }
      if (cx2 < 2100) drawCube(ctx, c);
    }
  }
  ctx.restore();
}

export const shots = [
  {
    t0: 0, t1: T.toRoom + 1.0, name: 'exterior', fadeIn: 2.0, post: { vigColor: '120,110,150' },
    draw(ctx, t) {
      // slow drift, then push into our window
      const push = ease.in3(clamp((t - 7.3) / 3.3));
      const z = lerp(1.04 + t * 0.004, 7.5, push);
      const fx = lerp(960, WIN.x + WIN.w / 2, ease.inOut(clamp((t - 6.8) / 2.5)));
      const fy = lerp(560, WIN.y + WIN.h / 2, ease.inOut(clamp((t - 6.8) / 2.5)));
      ctx.save();
      ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-fx, -fy);
      drawExterior(ctx, t);
      ctx.restore();
      drawTitle(ctx, t);
    },
  },
];

export const cues = [
  { t: 0.5, id: 'amb_night_ext', gain: 0.5, len: 10.5, fadeIn: 2.5, fadeOut: 1.5 },
];
export function state() {}

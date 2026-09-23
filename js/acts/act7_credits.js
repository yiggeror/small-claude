// Act 7 — credits, and one more thing later that night.
import { C, shape, rect, line, ellipse, circle, text, limb } from '../draw.js';
import { key, clamp, lerp, ease, wobble, landSquash, hash2, TAU } from '../core.js';
import { Cam } from '../world.js';
import { POS, DY } from '../render.js';
import { drawCookiePiece } from '../props.js';
import { drawCube, autoBlink } from '../cube.js';
import { emote } from '../draw.js';
import { worldShot } from './cams.js';
import { T } from './times.js';

export const CREDITS = [
  ['title', '关闭电脑之后'],
  ['sub', 'After the Laptop Closes'],
  ['gap'],
  ['small', '一部完全用代码逐帧绘制的小动画'],
  ['small', 'a tiny film drawn entirely in code, frame by frame'],
  ['gap'],
  ['head', '角色 · Cast'],
  ['line', '小橙块 — the little orange friend'],
  ['small', '(Claude Code 吉祥物的同人演绎 · fan-art of the Claude Code mascot)'],
  ['line', '主人 — the human'],
  ['gap'],
  ['head', '音乐 · Music'],
  ['line', 'Original score, composed in code'],
  ['small', 'rendered with the FluidR3 GM soundfont (Frank Wen, MIT)'],
  ['gap'],
  ['head', '音效 · Sound'],
  ['small', 'Foley from freesound.org contributors (CC0) — see CREDITS.md'],
  ['gap'],
  ['head', '字体 · Fonts'],
  ['small', 'Patrick Hand · ZCOOL KuaiLe (SIL Open Font License)'],
  ['gap'],
  ['line', 'Made with Claude Code'],
];

function drawCredits(ctx, t) {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, 1920, 1080);
  const dur = T.stinger - T.credits;
  const k = (t - T.credits) / dur;
  const total = 2350;
  let y = 1080 + 40 - k * total + 60;
  const Z = '"ZCOOL KuaiLe"', P = '"Patrick Hand"';
  for (const [kind, str] of CREDITS) {
    switch (kind) {
      case 'title': text(ctx, str, 960, y, { size: 110, font: Z, color: C.ink, seed: 11 }); y += 115; break;
      case 'sub': text(ctx, str, 960, y, { size: 58, font: P, color: C.inkSoft, seed: 12 }); y += 78; break;
      case 'head': text(ctx, str, 960, y, { size: 54, font: Z, color: C.orange, seed: 13 }); y += 70; break;
      case 'line': text(ctx, str, 960, y, { size: 50, font: P, color: C.ink, seed: 14 }); y += 62; break;
      case 'small': text(ctx, str, 960, y, { size: 36, font: y > 0 && /[\u4e00-\u9fff]/.test(str) ? Z : P, color: C.inkSoft, seed: 15 }); y += 46; break;
      case 'gap': y += 50; break;
    }
  }
  // the little friend walks across the bottom, carrying its crumb of cookie
  const wx = lerp(-150, 2100, clamp((t - T.credits - 1) / (dur - 1)));
  const walk = (wx + 150) / 30;
  ctx.save();
  drawCube(ctx, { x: wx, y: 1010 - Math.abs(Math.sin(walk * Math.PI)) * 6, size: 110, facing: 0.8, walk, walkAmt: 1, eyes: 'content', mouth: 'smile', blush: 0.5, armR: { a: 0.6, len: 1.3, front: true } });
  ctx.translate(wx + 70, 1010 - 60); ctx.scale(14, 14); drawCookiePiece(ctx, 1);
  ctx.restore();
}

// ------------------------------------------------------------------ later that night
const PIECE = { x: 10, y: DY + 6.8, z: 36.7 };
function stingerState(t, S) {
  S.lit = 0; S.switchOn = 0; S.screen = 0; S.human = null; S.doorOpen = 0; S.hallLight = 0;
  S.chair = { ...POS.chair, z: POS.chair.z - 10 };
  S.cookie = { ...S.cookie, miss: 0.75 };
  const t0 = T.stinger + 2.0;
  const seam = key(t, [[t0 + 1.2, 0], [t0 + 1.6, 0.5], [t0 + 6.4, 0.5], [t0 + 6.8, 0.15]]);
  const a = key(t, [[t0 + 2.0, 0], [t0 + 2.4, 0.045, 'out'], [t0 + 4.3, 0.045], [t0 + 4.5, 0, 'in']]);
  S.seam = seam;
  const grabbed = t > t0 + 4.2;
  // the arm: out, feel around, grab, yank
  const out = key(t, [[t0 + 2.5, 0], [t0 + 3.0, 1, 'out'], [t0 + 3.9, 1], [t0 + 4.2, 1.02], [t0 + 4.35, 0, 'in']]);
  const sweep = key(t, [[t0 + 3.0, -0.6], [t0 + 3.4, 0.4, 'inOut'], [t0 + 3.7, -0.2, 'inOut'], [t0 + 4.0, 0.15, 'inOut']]);
  S.laptop = {
    a,
    gapFn: (c, yDeck, yLid, w) => {
      c.fillStyle = '#2a140a'; c.fillRect(-w / 2, yLid, w, yDeck - yLid);
      const g = c.createLinearGradient(0, yLid, 0, yDeck);
      g.addColorStop(0, 'rgba(255,140,60,0.3)'); g.addColorStop(1, 'rgba(255,170,90,0.7)');
      c.fillStyle = g; c.fillRect(-w / 2, yLid, w, yDeck - yLid);
    },
  };
  // the arm and the piece are drawn together just in front of the laptop
  const gap = 21 * Math.sin(a);
  S.extras.push({ x: POS.laptop.x, y: POS.laptop.y, z: PIECE.z - 0.2, order: 6, draw: (c) => {
    const gx = 2.2, gy = -1.3 - gap * 0.5;
    const px = PIECE.x - POS.laptop.x, py = -0.45;
    if (out > 0.01 && a > 0.005) {
      const tx = lerp(gx, px + sweep * 2.4, out), ty = lerp(gy, py - 0.2, out);
      const mid = [(gx + tx) / 2, Math.min(gy, ty) - 0.9 * out];
      limb(c, [[gx, gy], mid, [tx, ty]], 0.55, C.orange, { seed: 8101, lw: 2.6 });
      if (grabbed) { c.save(); c.translate(tx, ty + 0.1); drawCookiePiece(c, 0.55); c.restore(); }
    }
    if (!grabbed) { c.save(); c.translate(px, py); drawCookiePiece(c, 0.55); c.restore(); }
  } });
  // a tiny heart floats out after the nom
  const hk = clamp((t - (t0 + 5.6)) / 1.6);
  if (hk > 0 && hk < 1) S.extras.push({ x: 4, y: DY + 6.8 + 1.4 + hk * 3, z: POS.laptop.z - 0.5, order: 6, draw: (c) => emote(c, 'heart', Math.sin(hk * 7) * 0.4, 0, 1.4, 1 - hk * 0.3, 88) });
}

export function state(t, S) {
  if (t >= T.stinger) stingerState(t, S);
}

function laterCard(ctx, t) {
  ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, 1920, 1080);
  const a = key(t, [[T.stinger + 0.2, 0], [T.stinger + 0.6, 1], [T.stinger + 1.5, 1], [T.stinger + 1.95, 0]]);
  text(ctx, '那天深夜……', 960, 510, { size: 64, font: '"ZCOOL KuaiLe"', color: '#e9dcc6', alpha: a });
  text(ctx, 'later that night...', 960, 590, { size: 40, font: '"Patrick Hand"', color: '#b8ab97', alpha: a });
}

function endCard(ctx, t) {
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, 1920, 1080);
  const k = clamp((t - T.final) / 0.6);
  text(ctx, '完', 960, 440, { size: 150, font: '"ZCOOL KuaiLe"', color: C.ink, alpha: k });
  text(ctx, 'The End', 960, 560, { size: 56, font: '"Patrick Hand"', color: C.inkSoft, alpha: k });
  const c = clamp((t - T.final - 0.8) / 0.4);
  if (c > 0) drawCube(ctx, { x: 960, y: 760, size: 120 * ease.outBack(c), eyes: 'content', mouth: 'smile', blush: 0.7, crumb: 1, armR: { a: 1.1 + Math.sin(t * 8) * 0.3 } });
}

export const shots = [
  { t0: T.end, t1: T.stinger, name: 'credits', fadeIn: 0.8, fadeOut: 0.6, draw: drawCredits, post: { vigColor: '220,205,185' } },
  { t0: T.stinger, t1: T.stinger + 2.0, name: 'later', noPost: true, draw: laterCard },
  { t0: T.stinger + 2.0, t1: T.final, name: 'stinger', fadeIn: 0.8, fadeOut: 0.7,
    draw(ctx, t) {
      const k = ease.inOut(clamp((t - T.stinger - 2) / 8));
      worldShot(ctx, t, new Cam({ x: 7, y: DY + 9.5, z: lerp(16, 19.5, k), f: 1300, hy: 470, near: 1 }));
    } },
  { t0: T.final, t1: T.final + 4.5, name: 'end', fadeIn: 0.3, fadeOut: 1.2, draw: endCard, post: { vigColor: '220,205,185' } },
];

export const cues = [];

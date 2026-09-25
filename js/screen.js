// The laptop screen: a warm, hand-drawn terminal where the little friend lives.
import { C, shape, rect, line, ellipse, circle, text, curScale, setEmoteInk } from './draw.js';
import { drawCube, drawCubeFx, cube, cubeEmote } from './cube.js';
import { clamp, lerp, TAU, key, ease } from './core.js';

export const TERM = { w: 1600, h: 1000 };
const BG = '#2b2521', FG = '#efe5d3', DIM = '#9d9181', ORANGE = '#f08a4b', GREEN = '#9ccf8f', RED = '#ef8d80';

// script: list of lines that appear over time. Each: { t, kind, text, typed?, dur? }
// kind: 'user' (typed prompt), 'tool', 'out', 'ok', 'diff+', 'diff-', 'think', 'reply'
export function drawTerminal(ctx, S) {
  const { w, h } = TERM;
  const t = S.t;
  // window
  rect(ctx, 0, 0, w, h, { r: 26, fill: BG, lw: 4, seed: 5001 });
  // title bar
  const dots = ['#ef6f5e', '#f6c75a', '#8fca7a'];
  dots.forEach((c, i) => circle(ctx, 42 + i * 34, 36, 10, { fill: c, lw: 2, seed: 5002 + i }));
  text(ctx, '~/projects/login-app — claude', w / 2, 38, { size: 30, color: DIM, font: '"Patrick Hand"' });
  line(ctx, [[18, 68], [w - 18, 68]], { lw: 2, stroke: '#4a413a', seed: 5010 });

  // welcome box
  const bx = 60, by = 190, bw = 900, bh = 150;
  rect(ctx, bx, by, bw, bh, { r: 14, fill: null, stroke: ORANGE, lw: 3.2, seed: 5020 });
  text(ctx, '✻', bx + 50, by + 50, { size: 44, color: ORANGE, font: '"Patrick Hand"' });
  text(ctx, 'Welcome to Claude Code!', bx + 88, by + 52, { size: 44, color: FG, align: 'left', font: '"Patrick Hand"' });
  text(ctx, '/help for help,  /status for your current setup', bx + 88, by + 98, { size: 30, color: DIM, align: 'left', font: '"Patrick Hand"' });
  text(ctx, 'cwd: ~/projects/login-app', bx + 88, by + 130, { size: 26, color: DIM, align: 'left', font: '"Patrick Hand"' });

  // conversation
  let y = 392;
  const LH = 46;
  for (const L of S.lines || []) {
    if (t < L.t) break;
    const k = t - L.t;
    let str = L.text;
    if (L.typed) {
      const n = Math.floor(k * (L.cps || 14));
      str = L.text.slice(0, n);
    }
    const x0 = 70;
    switch (L.kind) {
      case 'user':
        text(ctx, '>', x0, y, { size: 36, color: DIM, align: 'left', font: '"Patrick Hand"' });
        text(ctx, str, x0 + 34, y, { size: 36, color: FG, align: 'left', font: '"Patrick Hand"' });
        break;
      case 'think': {
        const done = L.until && t > L.until;
        if (!done) {
          const sp = (t * 6) | 0;
          const glyph = ['✻', '✳', '✶', '✢', '·', '✢', '✶', '✳'][sp % 8];
          text(ctx, glyph, x0 + 8, y, { size: 38, color: ORANGE, font: '"Patrick Hand"' });
          text(ctx, (L.text || 'Thinking') + '…', x0 + 36, y, { size: 34, color: ORANGE, align: 'left', font: '"Patrick Hand"' });
        } else {
          y -= LH; // collapses when finished
        }
        break;
      }
      case 'tool':
        circle(ctx, x0 + 8, y, 7, { fill: GREEN, lw: 1.5, seed: 5030 + y });
        text(ctx, str, x0 + 34, y, { size: 34, color: FG, align: 'left', font: '"Patrick Hand"' });
        break;
      case 'out':
        text(ctx, '⎿  ' + str, x0 + 34, y, { size: 30, color: DIM, align: 'left', font: '"Patrick Hand"' });
        break;
      case 'diff-':
      case 'diff+': {
        const col = L.kind === 'diff+' ? 'rgba(120,190,110,0.28)' : 'rgba(230,120,110,0.28)';
        ctx.fillStyle = col;
        ctx.fillRect(x0 + 60, y - 21, 820, 42);
        text(ctx, (L.kind === 'diff+' ? '+ ' : '- ') + str, x0 + 70, y, { size: 32, color: L.kind === 'diff+' ? GREEN : RED, align: 'left', font: '"Patrick Hand"' });
        break;
      }
      case 'reply':
        circle(ctx, x0 + 8, y, 7, { fill: FG, lw: 1.5, seed: 5040 + y });
        text(ctx, str, x0 + 34, y, { size: 34, color: FG, align: 'left', font: '"Patrick Hand"' });
        break;
      case 'ok':
        text(ctx, '✓', x0 + 8, y, { size: 36, color: GREEN, font: '"Patrick Hand"' });
        text(ctx, str, x0 + 34, y, { size: 34, color: GREEN, align: 'left', font: '"Patrick Hand"' });
        break;
    }
    y += LH;
  }
  // input box
  const iy = 790;
  rect(ctx, 50, iy, w - 100, 70, { r: 12, fill: null, stroke: '#5a5047', lw: 2.4, seed: 5050 });
  text(ctx, '>', 80, iy + 36, { size: 36, color: DIM, align: 'left', font: '"Patrick Hand"' });
  const inp = S.input || '';
  text(ctx, inp, 114, iy + 36, { size: 36, color: FG, align: 'left', font: '"Patrick Hand"' });
  ctx.save();
  ctx.font = '36px "Patrick Hand"';
  const cw = ctx.measureText(inp).width;
  ctx.restore();
  if (Math.floor(t * 2) % 2 === 0 || S.cursorSolid) {
    ctx.fillStyle = FG;
    ctx.fillRect(118 + cw, iy + 18, 16, 36);
  }
  S.cursorX = 118 + cw;
  S.cursorY = iy + 36;
}

// ---- full-frame screen shot: the terminal fills the frame inside the laptop bezel
export function drawScreenShot(ctx, S, cubeState, extra) {
  ctx.save();
  // bezel
  ctx.fillStyle = '#1d1a18';
  ctx.fillRect(0, 0, 1920, 1080);
  const sc = S.zoom || 1;
  ctx.translate(960 + (S.panX || 0), 540 + (S.panY || 0));
  ctx.scale(sc, sc);
  ctx.translate(-TERM.w / 2, -TERM.h / 2);
  drawTerminal(ctx, S);
  if (cubeState) {
    setEmoteInk(FG);
    drawCubeFx(ctx, cubeState);
    setEmoteInk(null);
    if (extra) extra(ctx, cubeState);
  }
  ctx.restore();
  // glass sheen + vignette
  const g = ctx.createRadialGradient(960, 540, 300, 960, 540, 1150);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.beginPath(); ctx.moveTo(1150, 0); ctx.lineTo(1500, 0); ctx.lineTo(900, 1080); ctx.lineTo(550, 1080); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ---- tiny version for the laptop screen in wide shots (world units = cm)
export function drawMiniTerminal(ctx, w, h, S, cubeState) {
  ctx.save();
  ctx.scale(w / TERM.w, h / TERM.h);
  // simplified: no text rendering at tiny sizes → bars
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, TERM.w, TERM.h);
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 10;
  ctx.strokeRect(60, 190, 900, 150);
  ctx.fillStyle = FG;
  ctx.fillRect(140, 230, 520, 26);
  let y = 392;
  const t = S.t;
  for (const L of S.lines || []) {
    if (t < L.t) break;
    if (L.kind === 'think' && L.until && t > L.until) continue;
    const len = L.typed ? Math.min(L.text.length, Math.floor((t - L.t) * (L.cps || 14))) : L.text.length;
    ctx.fillStyle = L.kind === 'think' ? ORANGE : L.kind === 'ok' || L.kind === 'diff+' ? GREEN : L.kind === 'diff-' ? RED : FG;
    ctx.fillRect(100, y - 12, Math.min(1300, len * 17), 24);
    y += 46;
  }
  ctx.fillStyle = '#5a5047';
  ctx.fillRect(50, 790, TERM.w - 100, 6);
  if (cubeState) { setEmoteInk(FG); drawCubeFx(ctx, cubeState); setEmoteInk(null); }
  ctx.restore();
}

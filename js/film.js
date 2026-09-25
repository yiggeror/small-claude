// The film: shot list, transitions, post. renderFrame(ctx, t) is a pure function of time.
import { setBoil, setInkScale } from './draw.js';
import { postProcess } from './post.js';
import { clamp } from './core.js';
import * as act0 from './acts/act0_title.js';
import * as act1 from './acts/act1_work.js';
import * as act2 from './acts/act2_night.js';
import * as act3 from './acts/act3_adventure.js';
import * as act4 from './acts/act4_cookie.js';
import * as act5 from './acts/act5_panic.js';
import * as act6 from './acts/act6_return.js';
import * as act7 from './acts/act7_credits.js';

const ACTS = [act0, act1, act2, act3, act4, act5, act6, act7];
export const SHOTS = ACTS.flatMap((a) => a.shots).sort((a, b) => a.t0 - b.t0);
export const DURATION = Math.max(...SHOTS.map((s) => s.t1));
export const CUES = ACTS.flatMap((a) => a.cues || []).sort((a, b) => a.t - b.t);
export const MUSIC = ACTS.flatMap((a) => a.music || []);

let buf = null;
function getBuf(w, h) {
  if (!buf) buf = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  if (buf.width !== w || buf.height !== h) { buf.width = w; buf.height = h; }
  return buf;
}

function drawShot(ctx, shot, t) {
  ctx.save();
  setBoil(t);
  setInkScale(shot.ink || 1);
  shot.draw(ctx, t, t - shot.t0);
  ctx.restore();
}

export function shotAt(t) {
  let cur = SHOTS[0];
  for (const s of SHOTS) if (t >= s.t0 && t < s.t1) cur = s;
  if (t >= DURATION) cur = SHOTS[SHOTS.length - 1];
  return cur;
}

// base: logical 1920x1080 → canvas transform
export function renderFrame(ctx, t, base = [1, 0, 0, 1, 0, 0]) {
  t = clamp(t, 0, DURATION - 1e-4);
  ctx.setTransform(...base);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 1920, 1080);
  const shot = shotAt(t);
  drawShot(ctx, shot, t);
  // dissolve from previous shot
  if (shot.dissolve && t < shot.t0 + shot.dissolve) {
    const prev = SHOTS[SHOTS.indexOf(shot) - 1];
    if (prev) {
      const cv = ctx.canvas;
      const b = getBuf(cv.width, cv.height);
      const bx = b.getContext('2d');
      bx.setTransform(...base);
      bx.fillStyle = '#000'; bx.fillRect(0, 0, 1920, 1080);
      drawShot(bx, prev, t);
      if (!prev.noPost) postProcess(bx, t, prev.post || {});
      if (!shot.noPost) postProcess(ctx, t, shot.post || {});
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 - (t - shot.t0) / shot.dissolve;
      ctx.drawImage(b, 0, 0);
      ctx.restore();
      fades(ctx, shot, t);
      return shot;
    }
  }
  if (!shot.noPost) postProcess(ctx, t, shot.post || {});
  fades(ctx, shot, t);
  return shot;
}

function fades(ctx, shot, t) {
  let a = 0;
  if (shot.fadeIn) a = Math.max(a, 1 - clamp((t - shot.t0) / shot.fadeIn));
  if (shot.fadeOut) a = Math.max(a, clamp((t - (shot.t1 - shot.fadeOut)) / shot.fadeOut));
  if (a > 0.001) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.restore();
  }
}

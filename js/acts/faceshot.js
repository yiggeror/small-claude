// Reverse angle: the human seen from the laptop (webcam's point of view).
import { C, shape, rect, line, ellipse, circle, text } from '../draw.js';
import { drawHumanFront, drawHand } from '../human.js';
import { drawCookie } from '../props.js';
import { addGlow } from '../light.js';
import { clamp, lerp, TAU } from '../core.js';

let bgCache = null;
function makeCanvas(w, h) {
  return typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
}
// the side of the room we never see in wide shots: bed corner, jacket on a hook, pendant lamp
function buildBackground() {
  const cv = makeCanvas(960, 540);
  const c = cv.getContext('2d');
  c.scale(0.5, 0.5);
  c.fillStyle = '#efe3cd'; c.fillRect(0, 0, 1920, 1080);
  // wall/ceiling line
  c.fillStyle = '#f6eddc'; c.fillRect(0, 0, 1920, 90);
  // pendant lamp
  c.strokeStyle = '#6b6158'; c.lineWidth = 6; c.beginPath(); c.moveTo(1150, 0); c.lineTo(1150, 120); c.stroke();
  c.fillStyle = '#f0b27a'; c.beginPath(); c.moveTo(1080, 200); c.lineTo(1220, 200); c.lineTo(1180, 110); c.lineTo(1120, 110); c.closePath(); c.fill();
  // bed at left
  c.fillStyle = '#9fb7cf'; c.fillRect(-40, 640, 620, 460);
  c.fillStyle = '#b8cbe0'; c.fillRect(-40, 600, 600, 90);
  c.fillStyle = '#fbf3e3'; c.beginPath(); c.ellipse(170, 600, 150, 60, -0.1, 0, TAU); c.fill();
  c.fillStyle = '#d9b88f'; c.fillRect(-40, 520, 40, 580);
  // jacket on hook right
  c.fillStyle = '#e07a4a'; c.beginPath(); c.moveTo(1580, 320); c.lineTo(1700, 320); c.lineTo(1740, 720); c.lineTo(1540, 720); c.closePath(); c.fill();
  c.fillStyle = '#6b6158'; c.fillRect(1630, 290, 20, 34);
  // shelf + books far right
  c.fillStyle = '#d9b88f'; c.fillRect(1780, 480, 200, 16);
  ['#e2574c', '#8fb3d9', '#f6d365'].forEach((col, i) => { c.fillStyle = col; c.fillRect(1800 + i * 34, 400, 26, 80); });
  // framed photo
  c.fillStyle = '#fffaf0'; c.fillRect(420, 220, 180, 140);
  c.fillStyle = '#9bc59d'; c.fillRect(440, 240, 140, 100);
  // soft blur
  const out = makeCanvas(960, 540);
  const o = out.getContext('2d');
  o.filter = 'blur(7px)';
  o.drawImage(cv, 0, 0);
  return out;
}

// p: human front pose; o: { lit (0..1), screen (0..1 glow strength), zoom, panX, panY, cookie: {x,y,rot,s,miss}, handFn }
export function drawFaceShot(ctx, t, p, o = {}) {
  if (!bgCache) bgCache = buildBackground();
  const zoom = o.zoom || 1;
  ctx.save();
  // background (slight parallax)
  ctx.save();
  ctx.translate(960 + (o.panX || 0) * 0.3, 540 + (o.panY || 0) * 0.3);
  ctx.scale(1.08 * (1 + (zoom - 1) * 0.3), 1.08 * (1 + (zoom - 1) * 0.3));
  ctx.drawImage(bgCache, -960, -540, 1920, 1080);
  ctx.restore();
  // the human
  ctx.save();
  ctx.translate(960 + (o.panX || 0), 1175 + (o.panY || 0));
  ctx.scale(19 * zoom, 19 * zoom);
  drawHumanFront(ctx, p);
  ctx.restore();
  // lighting: dim the room if the lights are off, add the screen's cool light on the face
  const lit = o.lit ?? 1;
  if (lit < 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${Math.round(lerp(60, 255, lit))},${Math.round(lerp(66, 250, lit))},${Math.round(lerp(110, 245, lit))})`;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.restore();
  }
  const scr = o.screen ?? 1;
  if (scr > 0) {
    addGlow(ctx, 960 + (o.panX || 0), 520 + (o.panY || 0), 700 * zoom, '215,225,255', 0.16 * scr * (1.4 - lit * 0.6), 1, 1.1);
  }
  ctx.restore();
}

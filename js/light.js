// Lighting: a multiply "light map" (ambient + additive lights) laid over the drawn scene,
// then additive glows for emissive things (screens, the little friend).
import { TAU } from './core.js';

let lcv = null, lctx = null;
function getLightCanvas(w, h) {
  if (!lcv) {
    lcv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  }
  if (lcv.width !== w || lcv.height !== h) { lcv.width = w; lcv.height = h; }
  lctx = lcv.getContext('2d');
  return lctx;
}

let dither = null;
function makeDither() {
  const w = 128, cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, w) : Object.assign(document.createElement('canvas'), { width: w, height: w });
  const x = cv.getContext('2d'), img = x.createImageData(w, w);
  let s = 12345;
  for (let i = 0; i < w * w; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = (s >> 8) & 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  return cv;
}

export class LightMap {
  // base: the logical→pixel transform of the main canvas
  constructor(mainCtx, ambient) {
    const cv = mainCtx.canvas;
    this.main = mainCtx;
    this.ctx = getLightCanvas(cv.width, cv.height);
    this.base = mainCtx.getTransform();
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = ambient;
    c.fillRect(0, 0, cv.width, cv.height);
    c.setTransform(this.base);
    c.globalCompositeOperation = 'lighter';
  }
  // radial light in logical coords. color 'r,g,b'
  point(x, y, r, rgb, a = 1, sx = 1, sy = 1) {
    if (a <= 0.002 || r <= 0) return;
    const c = this.ctx;
    c.save();
    c.translate(x, y); c.scale(sx, sy);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(-r, -r, r * 2, r * 2);
    c.restore();
  }
  // polygon light (e.g. moonlight shaft) with optional blur
  poly(pts, rgb, a = 1, blur = 0) {
    if (a <= 0.002) return;
    const c = this.ctx;
    c.save();
    if (blur) c.filter = `blur(${blur}px)`;
    c.fillStyle = `rgba(${rgb},${a})`;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath(); c.fill();
    c.restore();
  }
  fill(rgb, a) {
    const c = this.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = `rgba(${rgb},${a})`; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
  }
  apply() {
    // dither the light map so smooth gradients don't band
    const c = this.ctx;
    if (!dither) dither = makeDither();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.045;
    c.fillStyle = c.createPattern(dither, 'repeat'); c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    c.restore();
    const m = this.main;
    m.save();
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'multiply';
    m.drawImage(this.ctx.canvas, 0, 0);
    m.restore();
  }
}

// additive glow on the main canvas
export function addGlow(ctx, x, y, r, rgb, a = 1, sx = 1, sy = 1) {
  if (a <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y); ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

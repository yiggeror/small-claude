// Post-processing: paper grain, soft vignette, subtle animated film grain.
import { hash2 } from './core.js';

let paper = null, grainTiles = [];
function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return c;
}
function buildPaper() {
  const w = 512, h = 512;
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const img = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const px = i % w, py = (i / w) | 0;
    // fibrous paper: mix of fine noise and a few longer streaks
    let v = 238 + hash2(px, py) * 17;
    v -= ((hash2((px / 3) | 0, (py / 11) | 0) > 0.93) ? 10 : 0);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v - 3; img.data[i * 4 + 2] = v - 10; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
function buildGrain(seed) {
  const w = 256, h = 256;
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const img = x.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = hash2(i, seed) * 255;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function postProcess(ctx, t, o = {}) {
  if (!paper) {
    paper = buildPaper();
    for (let i = 0; i < 4; i++) grainTiles.push(buildGrain(100 + i));
  }
  ctx.save();
  // paper texture (multiply)
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = o.paper ?? 0.55;
  const pat = ctx.createPattern(paper, 'repeat');
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, 1920, 1080);
  // film grain (overlay-ish), changes at 12 fps
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = o.grain ?? 0.05;
  const tile = grainTiles[Math.floor(t * 12) % 4];
  const gp = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = gp;
  ctx.fillRect(0, 0, 1920, 1080);
  // vignette
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(960, 540, 520, 960, 540, 1250);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, `rgba(${o.vigColor || '180,160,140'},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
}

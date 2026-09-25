// 2.5D staging: a real perspective camera over a world measured in centimetres,
// with every drawing a flat, hand-drawn billboard placed at its projected spot.
import { lerp } from './core.js';

export const SW = 1920, SH = 1080;

export class Cam {
  // x,y,z: eye position (cm). f: focal length (px). hy: screen y of the horizon (lens shift).
  constructor(o = {}) {
    this.x = o.x ?? 0; this.y = o.y ?? 150; this.z = o.z ?? -250;
    this.f = o.f ?? 1100; this.hy = o.hy ?? SH * 0.4; this.hx = o.hx ?? SW / 2;
    this.roll = o.roll ?? 0; this.shakeX = o.shakeX ?? 0; this.shakeY = o.shakeY ?? 0;
    this.yaw = o.yaw ?? 0; this.near = o.near ?? 0.5;
    this.cy = Math.cos(this.yaw); this.sy = Math.sin(this.yaw);
  }
  // camera-space (x right, z forward) of a world point
  view(X, Z) {
    const dx = X - this.x, dz = Z - this.z;
    return [this.cy * dx - this.sy * dz, this.sy * dx + this.cy * dz];
  }
  project(X, Y, Z) {
    const [vx, vz] = this.view(X, Z);
    const d = Math.max(0.5, vz);
    const s = this.f / d;
    return { x: this.hx + vx * s + this.shakeX, y: this.hy - (Y - this.y) * s + this.shakeY, s, d, vz };
  }
  // elevation factor used to squash horizontal discs: sin of view angle onto plane at height Y, depth Z
  elev(Y, Z, X = this.x) {
    const d = Math.max(1, this.view(X, Z)[1]);
    const h = this.y - Y;
    return Math.max(0.02, h / Math.hypot(h, d));
  }
}

export function camLerp(a, b, k) {
  return new Cam({
    x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), f: lerp(a.f, b.f, k),
    hy: lerp(a.hy, b.hy, k), hx: lerp(a.hx ?? SW / 2, b.hx ?? SW / 2, k), roll: lerp(a.roll || 0, b.roll || 0, k),
    yaw: lerp(a.yaw || 0, b.yaw || 0, k), near: a.near ?? 0.5,
  });
}

// Draw a billboard: ctx origin at projected (X,Y,Z), scaled so 1 unit = 1 cm.
export function billboard(ctx, cam, X, Y, Z, fn) {
  const p = cam.project(X, Y, Z);
  if (p.vz < cam.near) return p;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.s, p.s);
  fn(ctx, p);
  ctx.restore();
  return p;
}

// closed polygon, clipped against the camera's near plane, then projected
export function projPoly(cam, pts3) {
  const v = pts3.map(([X, Y, Z]) => { const [vx, vz] = cam.view(X, Z); return [vx, Y, vz]; });
  const n = Math.max(cam.near, 0.5), out = [];
  for (let i = 0; i < v.length; i++) {
    const a = v[i], b = v[(i + 1) % v.length];
    const ain = a[2] >= n, bin = b[2] >= n;
    if (ain) out.push(a);
    if (ain !== bin) {
      const k = (n - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, n]);
    }
  }
  return out.map(([vx, Y, vz]) => [cam.hx + (vx * cam.f) / vz + cam.shakeX, cam.hy - ((Y - cam.y) * cam.f) / vz + cam.shakeY]);
}
// open polyline: points behind the near plane are dropped
export function projPts(cam, pts) {
  const out = [];
  for (const [X, Y, Z] of pts) { const p = cam.project(X, Y, Z); if (p.vz >= cam.near) out.push([p.x, p.y]); }
  return out;
}
// horizontal polyline / polygon on plane Y given [x,z] pairs
export function planePts(cam, Y, xz) { return projPts(cam, xz.map(([X, Z]) => [X, Y, Z])); }
export function planePoly(cam, Y, xz) { return projPoly(cam, xz.map(([X, Z]) => [X, Y, Z])); }

// Collect drawables and render back-to-front.
export class Stage {
  constructor() { this.items = []; }
  add(z, fn, order = 0) { this.items.push({ z, fn, order }); return this; }
  draw(ctx) {
    this.items.sort((a, b) => (b.z - a.z) || (a.order - b.order));
    for (const it of this.items) it.fn(ctx);
  }
}

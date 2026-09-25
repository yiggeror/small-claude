// Camera presets and a helper to draw the world from a camera.
import { Cam } from '../world.js';
import { renderWorld, lightWorld, DY } from '../render.js';
import { worldState } from '../story.js';

export { WIDE } from './times.js';

export function cam(o) { return new Cam(o); }

export function worldShot(ctx, t, camera, mod) {
  const S = worldState(t);
  if (mod) mod(S);
  renderWorld(ctx, camera, S);
  lightWorld(ctx, camera, S);
  return S;
}
export { DY };

// What the terminal shows, and what the little friend does inside it, at story time t.
import { T } from './times.js';
import { key, clamp, lerp, ease, wobble, landSquash, hash2 } from '../core.js';
import { autoBlink } from '../cube.js';
import { saccade, sw } from '../motion.js';

export const LINES = [
  { t: 19.3, kind: 'user', text: 'fix the login redirect bug' },
  { t: 19.5, kind: 'think', text: 'Thinking', until: 22.0 },
  { t: 22.0, kind: 'tool', text: 'Read(src/auth/login.ts)' },
  { t: 22.5, kind: 'tool', text: 'Update(src/auth/login.ts)' },
  { t: 22.8, kind: 'diff-', text: "return redirect('/home')" },
  { t: 23.0, kind: 'diff+', text: "return redirect(next ?? '/home')" },
  { t: 23.6, kind: 'reply', text: 'Fixed — login now respects ?next=' },
  { t: 51.4, kind: 'user', text: 'good night' },
  { t: 51.9, kind: 'reply', text: 'Good night! Sleep well  ✻' },
];
const INPUTS = [
  { t0: 17.4, t1: 19.2, text: 'fix the login redirect bug' },
  { t0: 50.1, t1: 51.2, text: 'good night' },
];

function inputAt(t) {
  for (const I of INPUTS) {
    if (t >= I.t0 && t < I.t1 + 0.15) {
      const k = clamp((t - I.t0) / (I.t1 - I.t0));
      return I.text.slice(0, Math.round(k * I.text.length));
    }
  }
  return '';
}
// when is a key being typed (for keyboard sounds / cursor)
export const TYPING = INPUTS;

const BOX_TOP = 190;
const SIT_Y = 204; // sitting: legs dangle over the box edge

export function screenCube(t, cursorX = 400) {
  const c = { x: 860, y: SIT_Y, size: 130, eyes: 'normal', blink: autoBlink(t, 3, 2.7), legSpread: 0 };
  c.walk = t * 0.55; c.walkAmt = 0.45; // idle leg swing while sitting
  c.lookX = clamp((cursorX - 860) / 500, -1, 1); c.lookY = 0.9;

  // ---- act 1a: coding together
  if (t < 29.5) {
    if (t > 19.3 && t < 19.5) c.y -= 26 * Math.sin(((t - 19.3) / 0.2) * Math.PI);
    c.sq = 1 - landSquash(t, 19.5, 0.25);
    if (t >= 19.5 && t < 22.0) { // thinking
      c.lookX = -0.4; c.lookY = -1; c.brows = 0.5;
      c.armL = { a: key(t, [[19.5, 0], [19.8, 1.25, 'outBack']]), len: key(t, [[19.5, 1], [19.8, 1.4]]), front: true, dy: -0.05 };
      c.rot = Math.sin(t * 3.2) * 0.04;
      c.emote = { type: 'dots', k: ((t - 19.6) % 1.2) / 1.2 * 1.2 };
    }
    if (t >= 22.0 && t < 23.6) { c.lookX = -0.9; c.lookY = saccade(t, [[22, 0.2], [22.5, 0.4], [22.8, 0.7], [23.0, 0.9]]); }
    if (t >= 23.6 && t < 25.3) { // celebration hop
      const k = (t - 23.75) / 0.5;
      if (k > 0 && k < 1) c.y = SIT_Y - 70 * 4 * k * (1 - k) - 14 * Math.sin(k * Math.PI);
      c.sq = (t < 23.75 ? 0.25 * Math.sin(((t - 23.6) / 0.15) * Math.PI * 0.5) : 0) + (k > 0 && k < 1 ? -0.2 * (1 - k) : 0) + (1 - landSquash(t, 24.25, 0.3));
      c.tuck = k > 0 && k < 1 ? 0.5 * Math.sin(k * Math.PI) : 0;
      c.eyes = 'happy'; c.mouth = 'smile'; c.blush = 0.7;
      c.armL = { a: key(t, [[23.7, 0], [23.9, 1.3, 'outBack'], [24.9, 1.3], [25.2, 0]]) };
      c.armR = { a: key(t, [[23.7, 0], [23.9, 1.3, 'outBack'], [24.9, 1.3], [25.2, 0]]) };
      c.lookX = 0; c.lookY = 0; c.facing = 0;
      c.emote = { type: 'sparkle', k: clamp((t - 23.9) * 4), dx: -0.5 };
      c.emote2 = { type: 'sparkle', k: clamp((t - 24.0) * 4), dx: 0.6 };
    }
    if (t >= 25.3) { c.eyes = t < 26.4 ? 'content' : 'normal'; c.mouth = t < 26.4 ? 'smile' : null; c.lookX = 0.1; c.lookY = 0.2; }
    return c;
  }

  // ---- act 1b: good night
  if (t < 60) {
    c.lookX = clamp((cursorX - 860) / 500, -1, 1);
    if (t < 51.9) {
      c.lid = 0; c.blink = Math.max(c.blink, autoBlink(t, 9, 1.9) * 0.9);
    } else {
      // hop up to stand, face the human and wave
      const k = clamp((t - 52.0) / 0.35);
      c.y = lerp(SIT_Y, BOX_TOP, ease.out(k)) - 30 * Math.sin(k * Math.PI);
      c.sq = (t < 52.0 ? 0.2 * Math.sin(clamp((t - 51.85) / 0.15) * Math.PI * 0.5) : 0) + (1 - landSquash(t, 52.35, 0.25));
      c.walkAmt = 0; c.lookX = 0; c.lookY = 0.1;
      c.eyes = 'happy'; c.mouth = 'smile'; c.blush = 0.5;
      const wv = clamp((t - 52.4) / 0.2);
      c.armR = { a: 1.0 * wv + Math.sin((t - 52.4) * 11) * 0.45 * wv, front: false };
      if (t > 55.3 && t < 55.8) { c.eyes = 'sly'; c.mouth = 'cat'; c.blush = 0; c.lookX = 0.6; }
    }
    return c;
  }

  // ---- act 6: back online, suspiciously normal
  c.y = BOX_TOP; c.walkAmt = 0; c.lookX = 0; c.lookY = 0.05;
  c.crumb = t < T.innocent + 1.75 ? 1 : 0;
  if (t >= T.innocent && t < T.gift) {
    const ti = t - T.innocent;
    if (ti > 0.8) { c.eyes = 'wide'; }
    if (ti > 1.0) c.emote = { type: 'sweat', k: clamp((ti - 1.0) * 4), dx: 0.55 };
    // wipe the crumb off its mouth
    if (ti > 1.3 && ti < 2.1) {
      const k = (ti - 1.3) / 0.8;
      c.armR = { a: lerp(0.2, 1.25, Math.sin(k * Math.PI)), len: 1 + 1.8 * Math.sin(k * Math.PI), front: true, dy: 0.02 };
      c.eyes = 'squeeze';
    }
    // hands behind the back, stand up straight, very serious
    if (ti >= 2.1) {
      const k = ease.outBack(clamp((ti - 2.1) / 0.3));
      c.armL = { a: -1.3 * k, len: 1 - 0.5 * k };
      c.armR = { a: -1.3 * k, len: 1 - 0.5 * k };
      c.sy = 1 + 0.06 * k; c.eyes = 'normal'; c.mouth = 'line'; c.brows = -0.05;
      c.emote = null;
      if (ti > 3.0 && ti < 4.2) c.emote = { type: 'note', k: clamp((ti - 3.0) * 5), dx: 0.7 };
    }
    // under his stare: eyes slide away, sweat, wobble
    if (t >= T.sweat) {
      const ts = T.sweat;
      c.lookX = key(t, [[ts + 0.3, 0], [ts + 0.6, 1, 'out'], [ts + 1.7, 1], [ts + 1.85, -0.2, 'out'], [ts + 2.0, 1, 'out']]);
      c.emote = { type: 'sweat', k: clamp((t - ts - 0.5) * 4), dx: -0.5 };
      c.mouth = t > ts + 0.9 ? 'wave' : 'line';
      c.blush = clamp((t - ts - 0.9) * 2) * 0.5;
      c.shake = t > ts + 2.0 ? t * 60 : 0;
    }
  }
  if (t >= T.gift) {
    const tg = t - T.gift;
    // the piece of cookie lands by the laptop: stars, then pure joy
    c.lookY = 1; c.lookX = 0.2;
    c.eyes = tg > 1.0 ? 'star' : 'normal';
    c.mouth = tg > 1.0 ? 'o' : null;
    c.armL = { a: 0 }; c.armR = { a: 0 };
    if (tg > 1.8) {
      const k = ((tg - 1.8) % 0.62) / 0.62;
      c.y = BOX_TOP - 60 * 4 * k * (1 - k);
      c.sq = -0.15 * (1 - k) + (k > 0.9 ? 0.2 : 0);
      c.tuck = 0.5 * Math.sin(k * Math.PI);
      c.eyes = 'happy'; c.mouth = 'grin'; c.blush = 0.9; c.lookY = 0;
      c.armL = { a: 1.2 }; c.armR = { a: 1.2 };
      c.emote = { type: 'heart', k: clamp((tg - 1.9) * 3), dx: 0.55 };
      c.emote2 = { type: 'heart', k: clamp((tg - 2.3) * 3), dx: -0.5, seed: 9 };
    }
  }
  return c;
}

export function screenState(t) {
  const lines = LINES.filter((L) => (t < 60 ? true : true));
  const S = { t, lines, input: inputAt(t) };
  // cursor position estimate (for eye tracking) – matches drawTerminal's layout
  S.cursorGuess = 118 + S.input.length * 15;
  S.cube = screenCube(t, S.cursorGuess);
  return S;
}

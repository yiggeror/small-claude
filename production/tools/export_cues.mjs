// Export story beat times and automatically detected sound events (by simulating the world state)
// to production/build/cues.json for the sound mix.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { worldState } from '../../js/story.js';
import { T } from '../../js/acts/times.js';
import { TYPING } from '../../js/acts/screen_script.js';
import { DURATION, SHOTS } from '../../js/film.js';
import { DY } from '../../js/render.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '../build/cues.json');
fs.mkdirSync(path.dirname(out), { recursive: true });

const cues = [];
const add = (t, id, o = {}) => cues.push({ t: +t.toFixed(4), id, ...o });

const dt = 1 / 120;
let prev = null;
let lastCubeStep = -1, lastHumanStep = -1;
const keyName = (k) => `${k.r}:${k.c}`;
for (let t = 0; t < DURATION; t += dt) {
  const S = worldState(t);
  if (prev) {
    // --- the little friend
    const c = S.cube, p = prev.cube;
    if (c && p && (c.alpha ?? 1) > 0) {
      const tr = c._track, ptr = p._track;
      if (tr && ptr) {
        // landing
        if (ptr.air && !tr.air) {
          const surf = c.y > DY + 2.5 ? (c.y > DY + 5 ? 'books' : 'keys') : c.y > DY + 1.5 ? 'pen' : c.y > DY + 0.8 ? 'pad' : c.y > DY + 0.5 ? 'plate' : 'desk';
          add(t, 'cube_land', { surf, big: tr.seg ? (tr.seg[1].m === 'jump' ? 1 : 0) : 0, x: c.x });
        }
        if (!ptr.air && tr.air) add(t, 'cube_jump', { x: c.x, big: tr.seg && tr.seg[1].m === 'jump' ? 1 : 0 });
      }
      // footsteps: every half walk cycle
      if ((c.walkAmt ?? 0) > 0.3 && !(tr && tr.air)) {
        const st = Math.floor((c.walk ?? 0) * 2);
        if (st !== lastCubeStep && lastCubeStep !== -1) add(t, 'cube_step', { mode: tr ? tr.mode : 'walk', x: c.x, amt: c.walkAmt });
        lastCubeStep = st;
      } else lastCubeStep = -1;
    }
    // --- keys pressed
    const now = new Set((S.kb?.pressed || []).map(keyName));
    const was = new Set((prev.kb?.pressed || []).map(keyName));
    for (const k of now) if (!was.has(k)) add(t, k === '4:4' ? 'key_space' : 'key_click', { key: k });
    for (const k of was) if (!now.has(k)) add(t, 'key_release', { key: k });
    // --- the human's footsteps
    const h = S.human;
    if (h && h.mode === 'side' && (h.pose?.walkAmt ?? 0) > 0.3) {
      const st = Math.floor((h.pose.walk ?? 0) * 2);
      if (st !== lastHumanStep && lastHumanStep !== -1) add(t, 'human_step', { x: h.x, z: h.z });
      lastHumanStep = st;
    } else lastHumanStep = -1;
    // --- pen
    if (S.pen && prev.pen) {
      const v = Math.abs(S.pen.z - prev.pen.z) / dt;
      if (v > 0.5) add(t, 'pen_roll_frame', { v: +v.toFixed(2), onKeys: S.pen.y > DY + 1.5 ? 1 : 0 });
      if (prev.pen.y > DY + 1.5 && S.pen.y <= DY + 1.5) add(t, 'pen_drop');
    }
    // --- room: switch, door, lid
    if ((S.switchOn ?? 1) !== (prev.switchOn ?? 1)) add(t, S.switchOn ? 'switch_on' : 'switch_off');
    if ((S.doorOpen || 0) > 0.02 && (prev.doorOpen || 0) <= 0.02) add(t, 'door_open');
    if ((S.doorOpen || 0) < 0.05 && (prev.doorOpen || 0) >= 0.05) add(t, 'door_close');
    const a = S.laptop?.a || 0, pa = prev.laptop?.a || 0;
    if (pa > 0.01 && a <= 0.005) add(t, 'lid_shut', { from: +pa.toFixed(3) });
    if (pa <= 0.005 && a > 0.01) add(t, 'lid_lift', { to: 0 });
    if ((S.laptop?.led || 0) > 0.5 && (prev.laptop?.led || 0) <= 0.5) add(t, 'led_on');
  }
  prev = S;
}

// typed characters on the laptop (the human typing into the terminal)
for (const I of TYPING) {
  const n = I.text.length;
  for (let i = 1; i <= n; i++) add(I.t0 + (i / n) * (I.t1 - I.t0) - 0.02, I.text[i - 1] === ' ' ? 'type_space' : 'type_key');
  add(I.t1 + 0.1, 'type_enter');
}

cues.sort((a, b) => a.t - b.t);
fs.writeFileSync(out, JSON.stringify({ T, DURATION, shots: SHOTS.map((s) => ({ t0: s.t0, t1: s.t1, name: s.name })), cues }, null, 1));
const counts = {};
for (const c of cues) counts[c.id] = (counts[c.id] || 0) + 1;
console.log('wrote', out, cues.length, 'cues', counts);

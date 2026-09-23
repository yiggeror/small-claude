// World state as a function of story time: every act contributes to the shared room.
import { POS, DY } from './render.js';
import { drawMiniTerminal } from './screen.js';
import { screenState } from './acts/screen_script.js';
import { state as s1 } from './acts/act1_work.js';
import { state as s2 } from './acts/act2_night.js';
import { state as s3 } from './acts/act3_adventure.js';
import { state as s4 } from './acts/act4_cookie.js';
import { state as s5 } from './acts/act5_panic.js';
import { state as s6 } from './acts/act6_return.js';
import { state as s7 } from './acts/act7_credits.js';

const STATES = [s1, s2, s3, s4, s5, s6, s7];

export function miniScreen(t) {
  return (c, w, h, on) => {
    const sc = screenState(t);
    drawMiniTerminal(c, w, h, sc, sc.cube);
    if (on < 1) { c.fillStyle = `rgba(0,0,0,${1 - on})`; c.fillRect(0, 0, w, h); }
  };
}

export function worldState(t) {
  const S = {
    t,
    lit: 1, switchOn: 1, doorOpen: 0, hallLight: 0,
    clockMin: 107 + t / 60,
    laptop: { a: 1.85, screen: miniScreen(t), screenOn: 1 },
    screen: 1, seam: 0,
    human: null,
    chair: { ...POS.chair },
    cube: null,
    cookie: { miss: 0, missA: -0.7, crumbs: 0 },
    pen: { x: -6, y: DY + 3.4, z: 17, rot: 0 },
    mouse: { ...POS.mouse, click: 0 },
    kb: { pressed: [] },
    sticky: { ...POS.sticky },
    lampOn: 0,
    extras: [],
  };
  for (const f of STATES) f && f(t, S);
  return S;
}

// Key story beats (seconds). Shared so every act and the sound mix agree.
export const T = {
  // act 0 — title
  titleIn: 1.0, titleWrite: 2.6, titleOut: 8.2, toRoom: 9.6,
  // act 1 — work
  wide1: 10.0, screen1: 17.0, face1: 27.2, stretch: 37.0, face2: 41.5, insertCookie: 48.0, screen2: 49.5,
  lidClose: 56.4, leave: 58.2, stand: 58.6, walk: 60.2, switchOff: 63.4, doorOpen: 63.9, doorClose: 65.8, hallOff: 69.2,
  // act 2 — night
  silence: 69.8, pushIn: 73.5, seamShot: 78.0, seamOn: 80.2, crackShot: 84.0, crack: 84.6, eyes: 86.0,
  squeeze: 90.2, pop: 92.0, land: 92.7, lookShot: 93.2, awe: 96.0,
  // act 3 — adventure
  kb: 100.0, spacebar: 109.6, wake: 110.3, sleep: 114.2, penRoll: 118.6, penStop: 122.6, noteWalk: 125.0, note: 131.2, noteReact: 135.4,
  // act 4 — cookie
  cookie: 139.0, reach1: 145.2, growl: 150.6, reach2: 154.2, snap: 156.5, munch: 158.9, steps: 164.4, panic: 165.4,
  // act 5 — panic
  hallOn: 173.4, fail: 176.0, grab: 179.8, lift: 181.2, dive: 182.0, inLaptop: 183.3,
  // act 6 — return
  doorOpen2: 183.6, lightsOn: 185.0, sit: 188.3, open: 189.5, screenBack: 190.5, notice: 194.0, insertBite: 197.5,
  stare: 199.0, innocent: 201.6, squint: 206.0, sweat: 208.4, laugh: 211.0, gift: 215.0, end: 221.5,
  // act 7
  credits: 222.0, stinger: 236.5, final: 247.0,
};

// wide establishing camera (room seen from behind the chair)
export const WIDE = { x: 38, y: 148, z: -232, f: 1180, hy: 330 };

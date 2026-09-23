import { worldState } from '../../js/story.js';
import { T } from '../../js/acts/times.js';
const S = worldState(105);
console.log(JSON.stringify({ kb: S.kb, cube: { x: S.cube.x, y: S.cube.y, z: S.cube.z, walk: S.cube.walk } }));

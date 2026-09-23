// Site entry: wait for the hand-drawn fonts, then mount the film player.
import { mountPlayer } from '../js/player.js';

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('40px "Patrick Hand"'),
      document.fonts.load('40px "ZCOOL KuaiLe"', '关闭电脑之后明天要做'),
    ]);
  } catch (e) { /* fall back to system fonts */ }
  mountPlayer(document.getElementById('film'), { poster: 5.2 });
}
boot();

// Render the film to an MP4: deterministic frame capture in headless Chromium (parallel workers),
// then x264 + AAC with the mixed soundtrack.
//   node render_video.cjs [--fps 30] [--from 0] [--to END] [--scale 1] [--workers 4] [--out film.mp4] [--frames dir]
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const fps = +(args.fps || 30);
const workers = +(args.workers || 4);
const scale = +(args.scale || 1);
const root = path.resolve(__dirname, '../..');
const framesDir = args.frames || path.join(root, 'production/build/frames');
const out = args.out || path.join(root, 'film/after-the-laptop-closes.mp4');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

(async () => {
  fs.mkdirSync(framesDir, { recursive: true });
  const srv = await start(0);
  const url = `http://127.0.0.1:${srv.address().port}/dev/frame.html`;
  const browser = await chromium.launch();
  const probe = await browser.newPage();
  await probe.goto(url);
  await probe.waitForFunction(() => window.__ready === true);
  const DURATION = await probe.evaluate(() => window.DURATION);
  await probe.close();
  const t0 = +(args.from || 0), t1 = Math.min(+(args.to || DURATION), DURATION);
  const f0 = Math.round(t0 * fps), f1 = Math.floor(t1 * fps);
  const total = f1 - f0;
  console.log(`rendering ${total} frames (${t0}s → ${t1}s @ ${fps}fps, ${1920 * scale}x${1080 * scale}) with ${workers} workers`);
  let done = 0; const tStart = Date.now();
  const work = async (w) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__ready === true);
    for (let f = f0 + w; f < f1; f += workers) {
      const fn = path.join(framesDir, `${String(f).padStart(6, '0')}.jpg`);
      if (fs.existsSync(fn) && !args.force) { done++; continue; }
      const data = await page.evaluate(([t, sc]) => {
        window.renderRaw(t);
        const c = document.getElementById('c');
        if (sc === 1) return c.toDataURL('image/jpeg', 0.96);
        const s = document.createElement('canvas'); s.width = 1920 * sc; s.height = 1080 * sc;
        const x = s.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, s.width, s.height);
        return s.toDataURL('image/jpeg', 0.96);
      }, [f / fps, scale]);
      fs.writeFileSync(fn, Buffer.from(data.split(',')[1], 'base64'));
      done++;
      if (done % 150 === 0) {
        const el = (Date.now() - tStart) / 1000;
        console.log(`  ${done}/${total}  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el) / 60).toFixed(1)} min`);
      }
    }
    await page.close();
  };
  await Promise.all(Array.from({ length: workers }, (_, w) => work(w)));
  await browser.close(); srv.close();
  if (args['frames-only']) return;
  const audio = path.join(root, 'production/build/soundtrack.wav');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ff = [
    '-y', '-framerate', String(fps), '-start_number', String(f0), '-i', path.join(framesDir, '%06d.jpg'),
    ...(fs.existsSync(audio) ? ['-ss', String(t0), '-t', String(t1 - t0), '-i', audio] : []),
    '-c:v', 'libx264', '-preset', args.preset || 'slow', '-crf', args.crf || '18', '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-profile:v', 'high', '-movflags', '+faststart',
    ...(fs.existsSync(audio) ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-metadata', 'title=After the Laptop Closes / 关闭电脑之后', out,
  ];
  console.log('encoding →', out);
  const r = spawnSync(ffmpeg, ff, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
  console.log('done in', ((Date.now() - tStart) / 60000).toFixed(1), 'min');
})();

// Render a sampled scan of the film into small JPEG tiles for review.
// node scan.cjs outdir t0 t1 step [w]
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const fs = require('fs');
(async () => {
  const [out, a, b, step, w] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const srv = await start(0);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/dev/frame.html`);
  await page.waitForFunction(() => window.__ready === true);
  const t0 = Date.now(); let n = 0;
  for (let t = +a; t <= +b + 1e-6; t += +step) {
    const data = await page.evaluate(([t, w]) => { window.renderRaw(t); const c = document.getElementById('c'); const s = document.createElement('canvas'); s.width = w; s.height = w * 9 / 16; s.getContext('2d').drawImage(c, 0, 0, s.width, s.height); return s.toDataURL('image/jpeg', 0.8); }, [t, +(w || 480)]);
    fs.writeFileSync(`${out}/${t.toFixed(2).padStart(7, '0')}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
    n++;
  }
  console.log(`${n} frames, ${((Date.now() - t0) / n).toFixed(0)} ms/frame`);
  await browser.close(); srv.close();
})();

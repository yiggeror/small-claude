// Render specific film times to PNGs:  node snap.cjs out_prefix t1 t2 ...   (page: dev/frame.html)
// env PAGE=dev/cube-sheet.html to snapshot another page; W,H for size.
const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
const fs = require('fs');
(async () => {
  const [prefix, ...times] = process.argv.slice(2);
  const srv = await start(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/${process.env.PAGE || 'dev/frame.html'}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  for (const t of times.length ? times : ['0']) {
    const data = await page.evaluate((t) => window.renderAt(parseFloat(t)), t);
    const b64 = data.split(',')[1];
    const fn = `${prefix}_${String(t).replace('.', 'p')}.png`;
    fs.writeFileSync(fn, Buffer.from(b64, 'base64'));
    console.log(fn);
  }
  await browser.close(); srv.close();
})();

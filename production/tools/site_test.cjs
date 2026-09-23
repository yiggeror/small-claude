const { chromium } = require('playwright');
const { start } = require('./serve.cjs');
(async () => {
  const srv = await start(0);
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ width: 1440, height: 1000 }, { width: 400, height: 860 }]) {
    const page = await browser.newPage({ viewport: vp });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(`http://127.0.0.1:${srv.address().port}/site/index.html`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/claude-0/-home-user-small-claude/e88a0825-d6c4-5d42-8de0-f8ce5ccaa2e3/scratchpad/site_${vp.width}_a.png`, fullPage: vp.width < 500 });
    await page.click('.play-big');
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => ({ time: document.getElementById('time').textContent, cls: document.getElementById('film').className, cw: document.querySelector('canvas').width }));
    console.log(vp.width, JSON.stringify(st), errs);
    await page.screenshot({ path: `/tmp/claude-0/-home-user-small-claude/e88a0825-d6c4-5d42-8de0-f8ce5ccaa2e3/scratchpad/site_${vp.width}_b.png` });
    await page.close();
  }
  await browser.close(); srv.close();
})();

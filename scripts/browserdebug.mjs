import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on('console', m => console.log(`[${m.type()}]`, m.text().slice(0, 300)));
page.on('pageerror', e => console.log('PAGEERROR:', e.message));

await page.goto('http://localhost:3000/game', { waitUntil: 'networkidle' });
await page.waitForSelector('text=CHOOSE YOUR RACE', { timeout: 30000 });
await page.click('button:has-text("Easy")');
await page.click('text=BEGIN');
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  let rafFired = false;
  return new Promise(res => {
    requestAnimationFrame(() => { rafFired = true; });
    setTimeout(() => {
      res({
        canvasW: c?.width, canvasH: c?.height,
        clientW: c?.clientWidth, clientH: c?.clientHeight,
        rafFired,
        hudTopBar: !!document.querySelector('.font-mono'),
        bodyChildren: document.body.innerHTML.length,
        canvasCount: document.querySelectorAll('canvas').length,
      });
    }, 500);
  });
});
console.log(JSON.stringify(info, null, 2));
await browser.close();

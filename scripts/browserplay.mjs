// Interaction test: mine gold, train a worker — validates input -> sim -> HUD loop.
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

await page.goto('http://localhost:3000/game', { waitUntil: 'networkidle' });
await page.waitForSelector('text=CHOOSE YOUR RACE');
await page.click('button:has-text("Easy")');
await page.click('button:has-text("Bridge of Giants")');
await page.click('text=BEGIN');
await page.waitForSelector('canvas');
await page.waitForTimeout(2500);

const goldOf = async () => {
  const t = await page.locator('span.text-amber-300').first().innerText();
  return Number(t.replace(/[^0-9]/g, ''));
};

const g0 = await goldOf();
console.log('gold at start:', g0);

// box-select the five workers
await page.mouse.move(330, 350);
await page.mouse.down();
await page.mouse.move(620, 440, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(400);
const selText = await page.locator('div.flex-1').first().innerText();
console.log('selection panel:', selText.split('\n')[0]);

// right-click the gold mine (NW of base)
await page.mouse.click(368, 72, { button: 'right' });
console.log('sent workers to mine; waiting 20s…');
await page.waitForTimeout(20000);
const g1 = await goldOf();
console.log('gold after mining:', g1);
if (g1 <= g0) { console.log('FAIL: no gold income'); }

// select town hall, train a worker with hotkey Q
await page.mouse.click(448, 280);
await page.waitForTimeout(300);
await page.keyboard.press('q');
await page.waitForTimeout(600);
const g2 = await goldOf();
console.log('gold after queuing worker (expect -70):', g2);
const queued = await page.locator('text=Clobhsaí').count();
console.log('queue shows worker:', queued > 0);

await page.screenshot({ path: '/tmp/magtuired-shots/6-mining.png' });
console.log(errors.length ? `PAGEERRORS:\n${errors.join('\n')}` : 'NO PAGE ERRORS');
console.log(g1 > g0 && g2 < g1 ? 'PLAY TEST PASS' : 'PLAY TEST FAIL');
await browser.close();

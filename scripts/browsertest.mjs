// Headless-Chrome smoke test: landing -> setup -> in-game canvas + HUD.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/tmp/magtuired-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(`PAGEERROR: ${e.message}`));

// 1) landing
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForSelector('text=MAG TUIRED');
await page.screenshot({ path: `${OUT}/1-landing.png` });
console.log('landing OK');

// 2) setup menu
await page.click('text=PLAY');
await page.waitForSelector('text=CHOOSE YOUR RACE', { timeout: 30000 });
await page.screenshot({ path: `${OUT}/2-setup.png` });
console.log('setup OK');

// 3) pick Aos Si vs Fomoire on bridge, easy, and begin
await page.click('text=Aos Sí', { timeout: 5000 });
await page.click('button:has-text("Fomóire")');
await page.click('button:has-text("Easy")');
await page.click('button:has-text("Bridge of Giants")');
await page.click('text=BEGIN');
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForTimeout(4000); // let the sim tick + HUD publish
await page.screenshot({ path: `${OUT}/3-ingame.png` });
console.log('in-game OK');

// 4) interact: select a unit via box select (drag around base), then check HUD
const c = await page.$('canvas');
const box = await c.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.mouse.move(cx - 200, cy - 200);
await page.mouse.down();
await page.mouse.move(cx + 200, cy + 200, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/4-selected.png` });
console.log('selection OK');

// 5) pause menu via Escape
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/5-pause.png` });

const realErrors = errors.filter(e =>
  !e.includes('favicon') && !e.includes('Download the React DevTools'));
console.log(realErrors.length ? `CONSOLE ERRORS:\n${realErrors.join('\n')}` : 'NO CONSOLE ERRORS');
await browser.close();
process.exit(realErrors.length ? 1 : 0);

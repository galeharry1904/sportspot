import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3000/';
const selector = process.argv[3];
const outPath = process.argv[4] || '/tmp/screenshot.png';
const width = Number(process.argv[5] || 1440);
const height = Number(process.argv[6] || 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const el = page.locator(selector).first();
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);

const opacity = await el.evaluate(e => getComputedStyle(e).opacity);
console.log('computed opacity of', selector, '=', opacity);

await page.screenshot({ path: outPath });
await browser.close();
console.log('saved', outPath);

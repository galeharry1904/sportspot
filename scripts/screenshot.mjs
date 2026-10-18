import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3000/';
const outPath = process.argv[3] || '/tmp/screenshot.png';
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);
const waitMs = Number(process.argv[6] || 0);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: 'networkidle' });
if (waitMs) await page.waitForTimeout(waitMs);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('saved', outPath);

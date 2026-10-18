import { chromium } from 'playwright';

const url = process.argv[2];
const clickText = process.argv[3];
const outPath = process.argv[4];
const width = Number(process.argv[5] || 1440);
const height = Number(process.argv[6] || 900);

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: '/tmp/sportspot-auth.json', viewport: { width, height } });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.click(`text=${clickText}`);
await page.waitForTimeout(1200);

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('saved', outPath);

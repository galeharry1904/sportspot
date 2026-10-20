import { chromium } from 'playwright';

const outDir = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const section = page.locator('.features-grid');
await section.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await section.screenshot({ path: `${outDir}/features-grid.png` });
await browser.close();
console.log('done');

import { chromium, devices } from 'playwright';
const outDir = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
const li = page.locator('ol > li').nth(1); // step 2 has the idle/active badge pair, good visual check
await li.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await li.screenshot({ path: `${outDir}/step2-number-order.png` });
await browser.close();
console.log('done');

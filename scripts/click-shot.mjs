import { chromium } from 'playwright';

const url = process.argv[2];
const clickText = process.argv[3];
const outPath = process.argv[4];
const width = Number(process.argv[5] || 1440);
const height = Number(process.argv[6] || 900);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const matches = await page.getByText(clickText, { exact: false }).all();
console.log(`found ${matches.length} elements matching "${clickText}"`);
for (const m of matches) {
  const box = await m.boundingBox();
  const tag = await m.evaluate(el => el.tagName + '.' + el.className);
  console.log(' ->', tag, JSON.stringify(box));
}

const tabBtn = page.locator('button.tab-btn', { hasText: clickText });
console.log('tab-btn matches:', await tabBtn.count());
await tabBtn.click();
await page.waitForTimeout(1500);

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('saved', outPath);

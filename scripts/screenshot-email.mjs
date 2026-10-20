import { chromium } from 'playwright';

const [, , filePath, outPath, width] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width) || 650, height: 1200 } });
await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('done');

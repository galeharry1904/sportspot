import { chromium, devices } from 'playwright';

const outDir = process.argv[2];
const browser = await chromium.launch();

// --- Desktop ---
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const dPage = await desktop.newPage();
await dPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await dPage.waitForTimeout(500);
const dSection = dPage.locator('section[aria-labelledby="find-your-pub-title"]');
await dSection.scrollIntoViewIfNeeded();
await dPage.waitForTimeout(1500);
await dPage.screenshot({ path: `${outDir}/steps-desktop-in-context.png` });
await dSection.screenshot({ path: `${outDir}/steps-desktop-section-only.png` });
await desktop.close();

// --- Mobile ---
const mobile = await browser.newContext({ ...devices['iPhone 13'] });
const mPage = await mobile.newPage();
await mPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await mPage.waitForTimeout(500);
const mSection = mPage.locator('section[aria-labelledby="find-your-pub-title"]');
await mSection.scrollIntoViewIfNeeded();
await mPage.waitForTimeout(1500);
await mPage.screenshot({ path: `${outDir}/steps-mobile-in-context.png` });
await mSection.screenshot({ path: `${outDir}/steps-mobile-section-only.png` });
await mobile.close();

await browser.close();
console.log('done');

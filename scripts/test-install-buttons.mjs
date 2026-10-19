import { chromium, devices } from 'playwright';

const outDir = process.argv[2];
const browser = await chromium.launch();

// --- iOS: open sheet, screenshot both buttons ---
const ios = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ios.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.click('text=Add to Home Screen');
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/sheet-two-buttons.png` });

// --- Click "Got It" -> should reappear after reload (session dismiss only) ---
await page.click('text=Got It');
await page.waitForTimeout(400);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/after-got-it-same-session.png` });

await ios.close();

// --- Click "Added to Home Screen" -> should NOT reappear after reload ---
const ios2 = await browser.newContext({ ...devices['iPhone 13'] });
const page2 = await ios2.newPage();
await page2.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page2.waitForTimeout(1200);
await page2.click('text=Add to Home Screen');
await page2.waitForTimeout(500);
await page2.click('text=Added to Home Screen');
await page2.waitForTimeout(400);
await page2.screenshot({ path: `${outDir}/after-added-immediate.png` });
await page2.reload({ waitUntil: 'networkidle' });
await page2.waitForTimeout(1200);
await page2.screenshot({ path: `${outDir}/after-added-reload.png` });

// confirm localStorage flag set
const flag = await page2.evaluate(() => localStorage.getItem('sportspot-installed'));
console.log('INSTALLED_FLAG:', flag);

await ios2.close();
await browser.close();
console.log('done');

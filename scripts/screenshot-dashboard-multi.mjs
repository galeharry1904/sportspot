import { chromium, devices } from 'playwright';
import fs from 'fs';

const outDir = process.argv[2];
const link = fs.readFileSync('/tmp/magic.txt', 'utf8').trim();
const browser = await chromium.launch();

// Desktop — sign in via magic link, land on the dashboard
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto(link, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
console.log('landed on:', page.url());
await page.screenshot({ path: `${outDir}/dash-desktop.png` });

const chips = await page.locator('.venue-chip').count();
console.log('venue chips rendered:', chips);

// Switch to a different venue and confirm the fixtures panel re-renders for it
if (chips > 2) {
  await page.locator('.venue-chip').nth(2).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outDir}/dash-desktop-switched.png` });
  console.log('switched to:', await page.locator('.venue-chip').nth(2).innerText());
}

await ctx.storageState({ path: '/tmp/sportspot-owner-auth.json' });
await ctx.close();

// Mobile check of the switcher
const m = await browser.newContext({ ...devices['iPhone 13'], storageState: '/tmp/sportspot-owner-auth.json' });
const mp = await m.newPage();
await mp.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
await mp.waitForTimeout(2500);
await mp.screenshot({ path: `${outDir}/dash-mobile.png` });
await m.close();

await browser.close();
console.log('done');

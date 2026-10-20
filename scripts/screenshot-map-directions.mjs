import { chromium, devices } from 'playwright';

const outDir = process.argv[2];
const browser = await chromium.launch();

// --- Desktop ---
const desktop = await browser.newContext({ storageState: '/tmp/sportspot-auth.json', viewport: { width: 1440, height: 900 }, geolocation: { latitude: 51.5074, longitude: -0.1278 }, permissions: ['geolocation'] });
const dPage = await desktop.newPage();
await dPage.goto('http://localhost:3000/map', { waitUntil: 'networkidle' });
await dPage.waitForTimeout(2500);
await dPage.screenshot({ path: `${outDir}/map-desktop-initial.png` });

// Click the first pub card in the sidebar list
const cards = dPage.locator('div[style*="cursor: pointer"][style*="border-radius: 14px"]');
const count = await cards.count();
console.log('desktop pub cards found:', count);
if (count > 0) {
  await cards.first().click();
  await dPage.waitForTimeout(1200);
  await dPage.screenshot({ path: `${outDir}/map-desktop-infowindow.png` });
}
await desktop.close();

// --- Mobile ---
const mobile = await browser.newContext({ storageState: '/tmp/sportspot-auth.json', ...devices['iPhone 13'], geolocation: { latitude: 51.5074, longitude: -0.1278 }, permissions: ['geolocation'] });
const mPage = await mobile.newPage();
await mPage.goto('http://localhost:3000/map', { waitUntil: 'networkidle' });
await mPage.waitForTimeout(2500);
await mPage.screenshot({ path: `${outDir}/map-mobile-initial.png` });

// Tap the pub marker pin directly on the map
const pin = mPage.locator('svg path[d*="M12 2C8.13 2 5 5.13 5 9"]').first();
if (await pin.count() > 0) {
  await pin.click({ force: true });
  await mPage.waitForTimeout(1200);
  await mPage.screenshot({ path: `${outDir}/map-mobile-detail.png` });
} else {
  console.log('no pin found');
}
await mobile.close();

await browser.close();
console.log('done');

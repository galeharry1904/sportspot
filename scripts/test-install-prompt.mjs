import { chromium, devices } from 'playwright';

const outDir = process.argv[2];

const browser = await chromium.launch();

// --- iOS (iPhone) ---
const ios = await browser.newContext({ ...devices['iPhone 13'] });
const iosPage = await ios.newPage();
await iosPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await iosPage.waitForTimeout(1500);
await iosPage.screenshot({ path: `${outDir}/ios-pill.png` });

await iosPage.click('text=Add to Home Screen');
await iosPage.waitForTimeout(500);
await iosPage.screenshot({ path: `${outDir}/ios-sheet.png` });

await iosPage.click('text=Got it');
await iosPage.waitForTimeout(500);
await iosPage.reload({ waitUntil: 'networkidle' });
await iosPage.waitForTimeout(1500);
await iosPage.screenshot({ path: `${outDir}/ios-after-dismiss-same-session.png` });
await ios.close();

// --- Android (simulate beforeinstallprompt) ---
const android = await browser.newContext({ ...devices['Pixel 7'] });
const androidPage = await android.newPage();
await androidPage.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    ev.prompt = () => { window.__promptCalled = true; return Promise.resolve(); };
    ev.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(ev);
  });
});
await androidPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await androidPage.waitForTimeout(1500);
await androidPage.screenshot({ path: `${outDir}/android-pill.png` });
await android.close();

// --- Desktop (should never show) ---
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktopPage = await desktop.newPage();
await desktopPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await desktopPage.waitForTimeout(1500);
await desktopPage.screenshot({ path: `${outDir}/desktop-no-pill.png` });
await desktop.close();

// --- /map should never show it even on iOS ---
const iosMap = await browser.newContext({ ...devices['iPhone 13'] });
const iosMapPage = await iosMap.newPage();
await iosMapPage.goto('http://localhost:3000/map', { waitUntil: 'networkidle' });
await iosMapPage.waitForTimeout(1500);
await iosMapPage.screenshot({ path: `${outDir}/ios-map-no-pill.png` });
await iosMap.close();

await browser.close();
console.log('done');

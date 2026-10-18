import { chromium } from 'playwright';

const loginUrl = process.argv[2];
const outPath = process.argv[3];
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const width = Number(process.argv[4] || 1440);
const height = Number(process.argv[5] || 900);
const waitMs = Number(process.argv[6] || 5000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(loginUrl, { waitUntil: 'networkidle' });

await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await page.click('button:has-text("Sign In")');
await page.waitForTimeout(waitMs);

console.log('landed on', page.url());
await page.screenshot({ path: outPath, fullPage: true });

// Save storage state so follow-up scripts can reuse this session without re-login.
await page.context().storageState({ path: '/tmp/sportspot-auth.json' });

await browser.close();
console.log('saved', outPath);

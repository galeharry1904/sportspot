import { chromium, devices } from 'playwright';

const outDir = process.argv[2];
const browser = await chromium.launch();

const mobile = await browser.newContext({ ...devices['iPhone 13'] });
const page = await mobile.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

const section = page.locator('section[aria-labelledby="find-your-pub-title"]');
const box = await section.boundingBox();
console.log('section box:', box);

// Scroll to just above the section, then creep down in small steps,
// screenshotting + checking each step's inView/animation state along the way.
await page.evaluate((y) => window.scrollTo(0, y - 100), box.y);
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/scroll-00-just-before.png` });

const totalScroll = box.height + 200;
const increment = 220;
let shot = 1;
for (let scrolled = 0; scrolled < totalScroll; scrolled += increment) {
  await page.evaluate((y) => window.scrollBy(0, y), increment);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const lis = Array.from(document.querySelectorAll('ol > li'));
    return lis.map((li, i) => {
      const rect = li.getBoundingClientRect();
      const inView = li.className.includes('inView');
      return { step: i + 1, inView, top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
    });
  });
  console.log(`shot ${shot}:`, JSON.stringify(state));
  await page.screenshot({ path: `${outDir}/scroll-${String(shot).padStart(2, '0')}.png` });
  shot++;
}

await browser.close();
console.log('done');

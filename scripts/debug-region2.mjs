import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle' });

// Find the RegionSwitcher button (has aria-haspopup=listbox)
const regionBtns = page.locator('button[aria-haspopup="listbox"]');
const count = await regionBtns.count();
console.log('Buttons with aria-haspopup=listbox:', count);

// Also check buttons with region-related aria labels
const allBtns = page.locator('button');
const btnCount = await allBtns.count();
console.log('Total buttons:', btnCount);

for (let i = 0; i < Math.min(btnCount, 30); i++) {
  const btn = allBtns.nth(i);
  const ariaLabel = await btn.getAttribute('aria-label');
  const ariaHaspopup = await btn.getAttribute('aria-haspopup');
  const text = (await btn.textContent())?.trim();
  if (ariaLabel?.includes('Region') || ariaLabel?.includes('region') || ariaLabel?.includes('Bay') || ariaLabel?.includes('Island') || ariaHaspopup) {
    console.log('Interesting btn:', JSON.stringify({ text, ariaLabel, ariaHaspopup }));
  }
}

// Check the page source for aria-haspopup
const html = await page.content();
const hasPropIdx = html.indexOf('aria-haspopup');
if (hasPropIdx >= 0) {
  console.log('aria-haspopup found in page at index:', hasPropIdx);
  console.log('Context:', html.substring(hasPropIdx - 100, hasPropIdx + 200));
} else {
  console.log('aria-haspopup NOT found in rendered page HTML!');
}

await page.screenshot({ path: 'scripts/debug-region2.png' });
await browser.close();
console.log('DONE');

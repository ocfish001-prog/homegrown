import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

console.log('Loading homepage...');
await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle' });

// 1. Check region button is visible
const regionBtn = page.locator('button[aria-haspopup="listbox"]').first();
console.log('Region button visible:', await regionBtn.isVisible());
console.log('Region button text:', await regionBtn.textContent());

// 2. Click the region button
await regionBtn.click();
await page.waitForTimeout(500);

// 3. Check dropdown opened
const dropdown = page.locator('[role="listbox"]');
console.log('Dropdown visible after click:', await dropdown.isVisible());

// 4. Check both regions are listed
const options = page.locator('[role="option"]');
const count = await options.count();
console.log('Region options count:', count);
for (let i = 0; i < count; i++) {
  console.log('  Option:', await options.nth(i).textContent());
}

// 5. Click Big Island
const bigIslandOption = page.locator('[role="option"]').filter({ hasText: 'Big Island' });
if (await bigIslandOption.count() > 0) {
  await bigIslandOption.click();
  await page.waitForTimeout(1000);
  console.log('Clicked Big Island');
  
  // Check events loaded
  await page.waitForTimeout(2000);
  const eventCards = page.locator('[data-testid="event-card"], .event-card, article').first();
  console.log('Events visible after switch:', await eventCards.isVisible().catch(() => 'unknown'));
  
  // Check region label updated
  const newRegionText = await page.locator('button[aria-haspopup="listbox"]').first().textContent();
  console.log('Region label after switch:', newRegionText);
} else {
  console.log('ERROR: Big Island option not found in dropdown');
}

// 6. Screenshot
await page.screenshot({ path: 'scripts/smoke-test-result.png', fullPage: false });
console.log('Screenshot saved to scripts/smoke-test-result.png');

await browser.close();
console.log('DONE');

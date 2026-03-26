import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle' });

// Get SF Bay Area button attrs
const sfBtn = page.locator('button').filter({ hasText: 'SF Bay Area' }).first();
console.log('SF Bay Area btn visible:', await sfBtn.isVisible());
const allAttrs = await sfBtn.evaluate(el => {
  const attrs = {};
  for (const attr of el.attributes) { attrs[attr.name] = attr.value; }
  return attrs;
});
console.log('SF Bay Area btn attrs:', JSON.stringify(allAttrs, null, 2));

// Now click it
await sfBtn.click();
await page.waitForTimeout(1000);

// Check for listbox
const listbox = page.locator('[role="listbox"]');
console.log('Listbox count:', await listbox.count());

try {
  console.log('Listbox visible:', await listbox.isVisible());
} catch (e) {
  console.log('Listbox isVisible error:', e.message);
}

// Get all options
const opts = page.locator('[role="option"]');
const optCount = await opts.count();
console.log('Option count:', optCount);
for (let i = 0; i < optCount; i++) {
  console.log('  Option ' + i + ':', await opts.nth(i).textContent());
}

await page.screenshot({ path: 'scripts/debug-after-click.png' });
await browser.close();
console.log('DONE');

const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\final-v3';
const URL = 'https://homegrown-phase1-app.netlify.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Open dropdown
  const btn = page.locator('[aria-label*="Region:"]').filter({ visible: true }).first();
  await btn.click();
  await page.waitForTimeout(800);

  // Dump the dropdown HTML
  const dropdownHtml = await page.evaluate(() => {
    // Find the dropdown by looking for a list/menu near the region button
    const candidates = [
      document.querySelector('[role="menu"]'),
      document.querySelector('[role="listbox"]'),
      document.querySelector('[class*="dropdown"]'),
      document.querySelector('[class*="popover"]'),
      document.querySelector('[class*="region"]'),
    ].filter(Boolean);
    return candidates.map(el => ({
      tag: el.tagName,
      class: el.className,
      role: el.getAttribute('role'),
      html: el.outerHTML.slice(0, 500)
    }));
  });
  console.log('Dropdown candidates:', JSON.stringify(dropdownHtml, null, 2));

  // Check all visible elements containing "SF Bay Area"
  const sfEls = await page.locator('*:visible').filter({ hasText: /^SF Bay Area$/ }).all();
  console.log(`\nElements with exact text "SF Bay Area": ${sfEls.length}`);
  for (const el of sfEls) {
    const tag = await el.evaluate(e => e.tagName);
    const cls = await el.evaluate(e => e.className);
    const role = await el.getAttribute('role').catch(() => '');
    const box = await el.boundingBox().catch(() => null);
    console.log(`  <${tag}> class="${cls}" role="${role}" box=${JSON.stringify(box)}`);
  }

  // Screenshot with dropdown open
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'diag2-dropdown-open.png') });

  // Click outside
  await page.mouse.click(900, 100);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'diag2-after-click-outside.png') });

  // Check SF Bay Area elements again
  const sfElsAfter = await page.locator('*:visible').filter({ hasText: /^SF Bay Area$/ }).all();
  console.log(`\nElements with exact text "SF Bay Area" AFTER click-outside: ${sfElsAfter.length}`);
  for (const el of sfElsAfter) {
    const tag = await el.evaluate(e => e.tagName);
    const cls = await el.evaluate(e => e.className);
    const box = await el.boundingBox().catch(() => null);
    console.log(`  <${tag}> class="${cls}" box=${JSON.stringify(box)}`);
  }

  // Also check what's at y=236 area
  console.log('\nChecking if dropdown is gone...');
  const menuEl = await page.locator('[role="menu"], [role="listbox"], [class*="dropdown"][class*="open"]').count();
  console.log('Menu/dropdown elements visible:', menuEl);

  await context.close();
  await browser.close();
})();

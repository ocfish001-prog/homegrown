const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\final-v3';
const URL = 'https://homegrown-phase1-app.netlify.app';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // --- DESKTOP: investigate click-outside ---
  console.log('\n=== DESKTOP click-outside investigation ===');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Open dropdown
    const btn = page.locator('[aria-label*="Region:"]').first();
    await btn.click();
    await page.waitForTimeout(800);

    // Get position of the button and dropdown
    const btnBox = await btn.boundingBox();
    console.log('Button bounding box:', btnBox);

    // Check what's visible in the dropdown area
    const dropdownEls = await page.locator('text=SF Bay Area').all();
    for (const el of dropdownEls) {
      const box = await el.boundingBox().catch(() => null);
      const vis = await el.isVisible().catch(() => false);
      console.log('SF Bay Area element:', { visible: vis, box });
    }

    // Screenshot with dropdown open
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'diag-desktop-dropdown-open.png') });

    // Click far from dropdown (right side, high up)
    console.log('Clicking at (900, 100) to close dropdown...');
    await page.mouse.click(900, 100);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'diag-desktop-after-click-outside.png') });

    const sfStillVisible = await page.locator('text=SF Bay Area').first().isVisible().catch(() => false);
    console.log('SF option still visible after click at (900,100):', sfStillVisible);

    // Try keyboard escape
    await btn.click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const sfAfterEsc = await page.locator('text=SF Bay Area').first().isVisible().catch(() => false);
    console.log('SF option still visible after Escape:', sfAfterEsc);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'diag-desktop-after-escape.png') });

    await context.close();
  }

  // --- MOBILE: investigate button not found ---
  console.log('\n=== MOBILE region button investigation ===');
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'diag-mobile-loaded.png') });

    // Check all buttons
    const allBtns = await page.locator('button').all();
    console.log(`Total buttons found: ${allBtns.length}`);
    for (let i = 0; i < Math.min(allBtns.length, 20); i++) {
      const btn = allBtns[i];
      const text = await btn.textContent().catch(() => '');
      const label = await btn.getAttribute('aria-label').catch(() => '');
      const vis = await btn.isVisible().catch(() => false);
      console.log(`Button[${i}]: text="${text.trim().slice(0,40)}" aria-label="${label}" visible=${vis}`);
    }

    // Check for region-related text
    const regionTexts = await page.locator('[class*="region"], [data-region], [id*="region"]').all();
    console.log(`Region-class elements: ${regionTexts.length}`);

    // Check for any element containing "Region"
    const regionEls = await page.locator('*').filter({ hasText: /Region/i }).all();
    console.log(`Elements containing "Region": ${regionEls.length}`);
    for (let i = 0; i < Math.min(regionEls.length, 5); i++) {
      const el = regionEls[i];
      const tag = await el.evaluate(e => e.tagName);
      const text = await el.textContent().catch(() => '');
      const label = await el.getAttribute('aria-label').catch(() => '');
      const vis = await el.isVisible().catch(() => false);
      console.log(`RegionEl[${i}]: <${tag}> text="${text.trim().slice(0,50)}" aria-label="${label}" visible=${vis}`);
    }

    // Check if there's a menu/hamburger button on mobile
    const menuBtns = await page.locator('[aria-label*="menu"], [aria-label*="Menu"], button[class*="menu"], button[class*="hamburger"]').all();
    console.log(`Menu buttons: ${menuBtns.length}`);
    for (const btn of menuBtns) {
      const label = await btn.getAttribute('aria-label').catch(() => '');
      const vis = await btn.isVisible().catch(() => false);
      console.log(`  Menu btn: aria-label="${label}" visible=${vis}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDiagnostic complete.');
})();

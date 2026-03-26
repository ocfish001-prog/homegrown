const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-screenshots/inspect-initial.png', fullPage: true });
  
  // Get all buttons
  const buttons = await page.locator('button').all();
  console.log('All buttons:');
  for (const btn of buttons) {
    const text = await btn.textContent();
    const visible = await btn.isVisible();
    const cls = await btn.getAttribute('class');
    console.log(`  [${visible ? 'VISIBLE' : 'hidden'}] "${text?.trim()}" | class: ${cls?.substring(0, 80)}`);
  }
  
  // Get all nav/tab items
  const navItems = await page.locator('nav, [role="tablist"], [role="navigation"]').all();
  console.log('\nNav elements:', navItems.length);
  
  // Get page text summary
  const h1s = await page.locator('h1, h2').all();
  console.log('\nHeadings:');
  for (const h of h1s) {
    const text = await h.textContent();
    console.log(' ', text?.trim());
  }
  
  // Look for region selector
  console.log('\nLooking for region-related elements...');
  const regionEl = await page.locator('[class*="region"], [class*="location"], [data-region]').all();
  console.log('Region elements:', regionEl.length);
  
  // Get all links
  const links = await page.locator('a').all();
  console.log('\nLinks:');
  for (const link of links.slice(0, 20)) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`  "${text?.trim()}" -> ${href}`);
  }
  
  // Check URL params or page content for region info
  console.log('\nPage URL:', page.url());
  
  // Look for select dropdowns
  const selects = await page.locator('select').all();
  console.log('\nSelect elements:', selects.length);
  for (const sel of selects) {
    const options = await sel.locator('option').all();
    for (const opt of options) {
      const text = await opt.textContent();
      console.log('  option:', text?.trim());
    }
  }
  
  await browser.close();
})();

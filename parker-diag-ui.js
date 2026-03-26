const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Get all buttons
  const allButtons = await page.locator('button').all();
  console.log('=== BUTTONS ===');
  for (const btn of allButtons) {
    const text = await btn.textContent().catch(() => '');
    if (text.trim()) console.log('Button:', JSON.stringify(text.trim()));
  }
  
  // Get all selects
  const allSelects = await page.locator('select').all();
  console.log('\n=== SELECTS ===');
  for (const sel of allSelects) {
    const id = await sel.getAttribute('id').catch(() => '');
    const name = await sel.getAttribute('name').catch(() => '');
    console.log('Select id:', id, 'name:', name);
    const opts = await sel.locator('option').all();
    for (const o of opts) {
      const val = await o.getAttribute('value').catch(() => '');
      const txt = await o.textContent().catch(() => '');
      console.log('  Option val:', val, 'text:', txt?.trim());
    }
  }
  
  // Get nav elements
  console.log('\n=== NAV/TABS ===');
  const tabs = await page.locator('[role="tab"], [role="tablist"] *, nav a, nav button').all();
  for (const t of tabs) {
    const text = await t.textContent().catch(() => '');
    if (text.trim()) console.log('Tab/Nav:', JSON.stringify(text.trim()));
  }
  
  // Get header content
  console.log('\n=== PAGE SNAPSHOT (first 3000 chars) ===');
  const content = await page.evaluate(() => document.body.innerText.slice(0, 3000));
  console.log(content);
  
  await browser.close();
})();

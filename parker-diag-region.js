const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  console.log('=== Clicking "Big Island, Hawaii" button ===');
  const regionBtn = await page.locator('button').filter({ hasText: 'Big Island, Hawaii' }).first();
  await regionBtn.click();
  await page.waitForTimeout(1500);
  
  // Take screenshot
  await page.screenshot({ path: 'test-screenshots/diag-region-click.png' });
  
  // Get new buttons
  const allButtons = await page.locator('button').all();
  console.log('Buttons after click:');
  for (const btn of allButtons) {
    const text = await btn.textContent().catch(() => '');
    if (text.trim()) console.log('  Button:', JSON.stringify(text.trim()));
  }
  
  // Get new content
  const content = await page.evaluate(() => document.body.innerText.slice(0, 2000));
  console.log('\nPage content after click:');
  console.log(content);
  
  // Check for modal/dialog
  const dialogs = await page.locator('[role="dialog"], [role="modal"], [class*="modal"], [class*="dialog"], [class*="sheet"]').all();
  console.log('\nDialogs/Modals:', dialogs.length);
  for (const d of dialogs) {
    const text = await d.textContent().catch(() => '');
    console.log('Dialog text:', text.slice(0, 300));
  }
  
  await browser.close();
})();

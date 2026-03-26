const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Switch to SF Bay
  const regionBtn = await page.locator('button').filter({ hasText: 'Big Island, Hawaii' }).first();
  await regionBtn.click();
  await page.waitForTimeout(1000);
  
  const sfBtn = await page.locator('button').filter({ hasText: /SF Bay/ }).first();
  await sfBtn.click();
  await page.waitForTimeout(2500);
  
  await page.screenshot({ path: 'test-screenshots/sf-bay-baseline.png' });
  
  // Get full page text
  const content = await page.evaluate(() => document.body.innerText);
  console.log('=== SF Bay Baseline (no filters) ===');
  console.log(content.slice(0, 3000));
  
  // Now apply Young Kids
  const youngBtn = await page.locator('button').filter({ hasText: 'Young Kids' }).first();
  await youngBtn.click();
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: 'test-screenshots/sf-bay-youngkids.png' });
  
  const contentFiltered = await page.evaluate(() => document.body.innerText);
  console.log('\n=== SF Bay + Young Kids ===');
  console.log(contentFiltered.slice(0, 3000));
  
  await browser.close();
})();

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Already on Big Island - apply Young Kids
  const youngBtn = await page.locator('button').filter({ hasText: 'Young Kids' }).first();
  await youngBtn.click();
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: 'test-screenshots/bi-youngkids.png' });
  const content1 = await page.evaluate(() => document.body.innerText);
  console.log('=== Big Island + Young Kids ===');
  console.log(content1.slice(0, 2000));
  
  // Reset, apply Older Kids
  const allAgesBtn = await page.locator('button').filter({ hasText: 'All Ages' }).first();
  await allAgesBtn.click();
  await page.waitForTimeout(500);
  
  const olderBtn = await page.locator('button').filter({ hasText: 'Older Kids' }).first();
  await olderBtn.click();
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: 'test-screenshots/bi-olderkids.png' });
  const content2 = await page.evaluate(() => document.body.innerText);
  console.log('\n=== Big Island + Older Kids ===');
  console.log(content2.slice(0, 2000));
  
  // Reset, apply Family
  await allAgesBtn.click();
  await page.waitForTimeout(500);
  
  const familyBtn = await page.locator('button').filter({ hasText: 'Family' }).first();
  await familyBtn.click();
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: 'test-screenshots/bi-family.png' });
  const content3 = await page.evaluate(() => document.body.innerText);
  console.log('\n=== Big Island + Family ===');
  console.log(content3.slice(0, 2000));
  
  await browser.close();
})();

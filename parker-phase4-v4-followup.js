const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-v4';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // Switch to Big Island first
  await page.locator('button:has-text("Bay Area")').first().click();
  await page.waitForTimeout(800);
  await page.locator('text=Big Island').first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  const hawaiiCount = await page.locator('text=results').first().textContent().catch(() => '');
  console.log('Hawaii results count text:', hawaiiCount);

  // === TEST: Young Kids filter on Big Island ===
  console.log('\n=== Young Kids filter test ===');
  const allResults = await page.evaluate(() => document.body.innerText.match(/(\d+) results/)?.[0] || 'unknown');
  console.log('Before filter:', allResults);

  await page.locator('button:has-text("Young Kids")').first().click();
  await page.waitForTimeout(1500);
  await page.waitForLoadState('networkidle').catch(() => {});

  const youngKidsResults = await page.evaluate(() => document.body.innerText.match(/(\d+) results/)?.[0] || 'unknown');
  console.log('After Young Kids filter:', youngKidsResults);

  const youngKidsEvents = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('h2, h3, [class*="title"], [class*="card"] h2, [class*="card"] h3'))
      .map(el => el.textContent.trim())
      .filter(t => t.length > 2 && t.length < 200);
    return titles.slice(0, 5);
  });
  console.log('Young Kids events:', JSON.stringify(youngKidsEvents));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-hawaii-young-kids.png'), fullPage: true });

  // === TEST: Switch back to SF Bay ===
  console.log('\n=== Switch back to SF Bay ===');
  await page.locator('button:has-text("Big Island")').first().click();
  await page.waitForTimeout(800);
  
  // Find SF Bay option
  const sfLocators = ['text=SF Bay Area', 'text=San Francisco Bay', 'text=Bay Area'];
  for (const loc of sfLocators) {
    const el = page.locator(loc).first();
    if (await el.count() > 0) {
      await el.click();
      console.log('Selected SF Bay with:', loc);
      break;
    }
  }
  
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  const sfBodyText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('SF Bay page after return:', sfBodyText);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-back-to-sf.png'), fullPage: true });

  const sfEvents = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('h2, h3, [class*="title"], [class*="card"] h2, [class*="card"] h3'))
      .map(el => el.textContent.trim())
      .filter(t => t.length > 2 && t.length < 200);
    return titles.slice(0, 5);
  });
  console.log('SF events after return:', JSON.stringify(sfEvents));

  await browser.close();
}

run().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

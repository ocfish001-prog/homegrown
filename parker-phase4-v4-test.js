const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-v4';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Load fresh with cleared localStorage
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-default-loaded.png'), fullPage: true });
  console.log('=== STEP 1: Page loaded ===');

  // 2. Check default region
  const regionText = await page.locator('[data-testid="region-switcher"], button:has-text("Bay"), button:has-text("Region"), select').first().textContent().catch(() => null);
  console.log('Region element text:', regionText);

  // Get all visible text on page to see what region is shown
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);

  // Look for region indicator
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('Body text (first 2000):', bodyText);

  // 3. Get SF Bay events
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-sf-events.png'), fullPage: true });

  // Find event titles
  const sfEvents = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('h2, h3, [class*="title"], [class*="event-name"], [class*="card"] h2, [class*="card"] h3'))
      .map(el => el.textContent.trim())
      .filter(t => t.length > 2 && t.length < 200);
    return titles.slice(0, 10);
  });
  console.log('SF events found:', JSON.stringify(sfEvents));

  // 4. Find and click region switcher
  console.log('\n=== STEP 4: Looking for region switcher ===');
  
  // Try various selectors for region switcher
  let regionSwitcherFound = false;
  
  // Look for select element
  const selects = await page.locator('select').all();
  console.log('Select elements found:', selects.length);
  for (const sel of selects) {
    const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.text));
    console.log('Select options:', opts);
  }

  // Look for buttons with region-related text
  const allButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"], [role="combobox"]'))
      .map(el => ({ text: el.textContent.trim().substring(0, 50), class: el.className.substring(0, 50) }));
  });
  console.log('Buttons:', JSON.stringify(allButtons.slice(0, 20)));

  // Try to find region dropdown/button
  const regionLocators = [
    'button:has-text("Bay Area")',
    'button:has-text("SF Bay")',
    'button:has-text("San Francisco")',
    '[data-testid="region"]',
    'select[name*="region"]',
    'button:has-text("Region")',
  ];

  for (const loc of regionLocators) {
    const el = page.locator(loc).first();
    const count = await el.count();
    if (count > 0) {
      console.log('Found region switcher with:', loc);
      await el.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-region-dropdown-open.png'), fullPage: true });
      regionSwitcherFound = true;
      break;
    }
  }

  if (!regionSwitcherFound) {
    // Try select element - change value
    const selectEl = page.locator('select').first();
    if (await selectEl.count() > 0) {
      const options = await selectEl.evaluate(el => Array.from(el.options).map(o => ({ value: o.value, text: o.text })));
      console.log('Select options detail:', JSON.stringify(options));
      
      // Find Hawaii option
      const hawaiiOpt = options.find(o => o.text.includes('Hawaii') || o.text.includes('Big Island') || o.value.includes('hawaii'));
      if (hawaiiOpt) {
        await selectEl.selectOption(hawaiiOpt.value);
        console.log('Selected Hawaii via select:', hawaiiOpt.text);
        regionSwitcherFound = true;
      }
    }
  }

  if (!regionSwitcherFound) {
    // Dump full DOM structure to understand the page
    const domStructure = await page.evaluate(() => {
      function getStructure(el, depth = 0) {
        if (depth > 4) return '';
        const tag = el.tagName;
        const cls = el.className ? ` class="${el.className.substring(0, 40)}"` : '';
        const id = el.id ? ` id="${el.id}"` : '';
        const text = el.children.length === 0 ? ` "${el.textContent.trim().substring(0, 30)}"` : '';
        let result = `${'  '.repeat(depth)}<${tag}${id}${cls}${text}>\n`;
        for (const child of Array.from(el.children).slice(0, 8)) {
          result += getStructure(child, depth + 1);
        }
        return result;
      }
      return getStructure(document.body).substring(0, 5000);
    });
    console.log('DOM structure:', domStructure);
  }

  // 5. Look for Hawaii option in dropdown
  await page.waitForTimeout(500);
  
  const hawaiiLocators = [
    'text=Big Island',
    'text=Hawaii',
    'text=Big Island, Hawaii',
    '[role="option"]:has-text("Hawaii")',
    'li:has-text("Hawaii")',
    'option:has-text("Hawaii")',
  ];

  let hawaiiSelected = false;
  for (const loc of hawaiiLocators) {
    const el = page.locator(loc).first();
    if (await el.count() > 0) {
      console.log('Found Hawaii option with:', loc);
      await el.click();
      await page.waitForTimeout(2000);
      hawaiiSelected = true;
      break;
    }
  }

  if (hawaiiSelected) {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-hawaii-selected.png'), fullPage: true });
    
    const hawaiiEvents = await page.evaluate(() => {
      const titles = Array.from(document.querySelectorAll('h2, h3, [class*="title"], [class*="event-name"], [class*="card"] h2, [class*="card"] h3'))
        .map(el => el.textContent.trim())
        .filter(t => t.length > 2 && t.length < 200);
      return titles.slice(0, 10);
    });
    console.log('\n=== HAWAII EVENTS ===');
    console.log(JSON.stringify(hawaiiEvents));

    const bodyAfterHawaii = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log('\nPage text after Hawaii selection:', bodyAfterHawaii);
  } else {
    console.log('Could not select Hawaii option');
    const fullBody = await page.evaluate(() => document.body.innerText.substring(0, 5000));
    console.log('Full page text:', fullBody);
  }

  await browser.close();
}

run().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

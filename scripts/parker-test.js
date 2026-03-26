const { chromium } = require('@playwright/test');
const path = require('path');

const URL = 'https://homegrown-phase1-app.netlify.app';
const SCREENSHOTS = path.join(__dirname, 'parker-screenshots');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runDesktopTest(browser) {
  console.log('\n=== DESKTOP TEST (1280x800) ===');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const results = {
    dropdownOpens: false,
    bothRegionsVisible: false,
    switchingWorks: false,
    eventsUpdate: false,
    notes: []
  };

  try {
    // Load page
    console.log('Loading page...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/desktop-01-page-loaded.png`, fullPage: false });
    console.log('Screenshot: desktop-01-page-loaded.png');

    // Log what's visible on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Look for region switcher - try various selectors
    const possibleSelectors = [
      '[data-testid="region-switcher"]',
      'button:has-text("SF Bay Area")',
      'button:has-text("Bay Area")',
      'select[name*="region"]',
      '[class*="region"]',
      '[aria-label*="region"]',
      'button:has-text("Region")',
      'text=SF Bay Area',
      'text=Bay Area',
    ];

    let regionSwitcher = null;
    let foundSelector = null;
    for (const sel of possibleSelectors) {
      try {
        const el = page.locator(sel).first();
        const count = await el.count();
        if (count > 0) {
          const visible = await el.isVisible();
          console.log(`Selector "${sel}" found (${count}), visible: ${visible}`);
          if (visible && !regionSwitcher) {
            regionSwitcher = el;
            foundSelector = sel;
          }
        }
      } catch (e) {}
    }

    if (!regionSwitcher) {
      // Dump all buttons on the page
      const buttons = await page.locator('button').all();
      console.log(`Total buttons found: ${buttons.length}`);
      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        try {
          const text = await buttons[i].textContent();
          const visible = await buttons[i].isVisible();
          console.log(`  Button[${i}]: "${text?.trim()}" visible:${visible}`);
        } catch (e) {}
      }

      // Also check select elements
      const selects = await page.locator('select').all();
      console.log(`Total selects found: ${selects.length}`);
      for (let i = 0; i < selects.length; i++) {
        try {
          const name = await selects[i].getAttribute('name');
          const id = await selects[i].getAttribute('id');
          const visible = await selects[i].isVisible();
          console.log(`  Select[${i}]: name="${name}" id="${id}" visible:${visible}`);
        } catch (e) {}
      }

      results.notes.push('Region switcher not found with standard selectors');
    } else {
      console.log(`Found region switcher with: ${foundSelector}`);

      // Click it
      await regionSwitcher.click();
      await sleep(1000);
      await page.screenshot({ path: `${SCREENSHOTS}/desktop-02-dropdown-open.png`, fullPage: false });
      console.log('Screenshot: desktop-02-dropdown-open.png');

      // Check for options
      const sfBayArea = page.locator('text=SF Bay Area').first();
      const bigIsland = page.locator('text=Big Island, Hawaii').first();
      const bigIsland2 = page.locator('text=Big Island').first();

      const hasSF = await sfBayArea.count() > 0 ? await sfBayArea.isVisible() : false;
      const hasHawaii = await bigIsland.count() > 0 ? await bigIsland.isVisible() : false;
      const hasHawaii2 = await bigIsland2.count() > 0 ? await bigIsland2.isVisible() : false;

      console.log(`SF Bay Area visible: ${hasSF}`);
      console.log(`Big Island, Hawaii visible: ${hasHawaii}`);
      console.log(`Big Island visible (partial): ${hasHawaii2}`);

      results.dropdownOpens = true;
      results.bothRegionsVisible = hasSF && (hasHawaii || hasHawaii2);

      if (results.bothRegionsVisible || hasHawaii || hasHawaii2) {
        // Get initial events
        const initialEvents = await page.locator('[class*="event"], [data-testid*="event"], article, .card').count();
        console.log(`Initial event count: ${initialEvents}`);

        // Click Big Island
        const bigIslandOption = hasHawaii ? bigIsland : bigIsland2;
        await bigIslandOption.click();
        await sleep(2000);

        await page.screenshot({ path: `${SCREENSHOTS}/desktop-03-after-hawaii-switch.png`, fullPage: false });
        console.log('Screenshot: desktop-03-after-hawaii-switch.png');

        const afterEvents = await page.locator('[class*="event"], [data-testid*="event"], article, .card').count();
        console.log(`After switch event count: ${afterEvents}`);

        // Check URL or page content changed
        const newUrl = page.url();
        console.log('URL after switch:', newUrl);

        // Check if page content mentions Hawaii
        const pageContent = await page.textContent('body');
        const hasHawaiiContent = pageContent.toLowerCase().includes('hawaii') || 
                                  pageContent.toLowerCase().includes('big island') ||
                                  pageContent.toLowerCase().includes('honolulu') ||
                                  pageContent.toLowerCase().includes('hilo');
        console.log(`Page contains Hawaii content: ${hasHawaiiContent}`);

        results.switchingWorks = true;
        results.eventsUpdate = hasHawaiiContent || afterEvents !== initialEvents;

        if (!hasHawaiiContent) {
          results.notes.push('Switched to Big Island but page content did not update with Hawaii-specific content');
        }
      } else {
        results.notes.push('Dropdown opened but Big Island, Hawaii option not found');
        // Screenshot to capture what IS in the dropdown
        await page.screenshot({ path: `${SCREENSHOTS}/desktop-02b-dropdown-contents.png`, fullPage: true });
      }
    }
  } catch (err) {
    console.error('Desktop test error:', err.message);
    results.notes.push(`Error: ${err.message}`);
    try {
      await page.screenshot({ path: `${SCREENSHOTS}/desktop-ERROR.png`, fullPage: false });
    } catch (e) {}
  }

  await context.close();
  return results;
}

async function runMobileTest(browser) {
  console.log('\n=== MOBILE TEST (375x812) ===');
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15' });
  const page = await context.newPage();
  const results = {
    switcherVisible: false,
    dropdownOpens: false,
    switchingWorks: false,
    notes: []
  };

  try {
    console.log('Loading page...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/mobile-01-page-loaded.png`, fullPage: false });
    console.log('Screenshot: mobile-01-page-loaded.png');

    // Look for region switcher on mobile
    const possibleSelectors = [
      '[data-testid="region-switcher"]',
      'button:has-text("SF Bay Area")',
      'button:has-text("Bay Area")',
      'select[name*="region"]',
      '[class*="region"]',
      'button:has-text("Region")',
      'text=SF Bay Area',
      'text=Bay Area',
    ];

    let regionSwitcher = null;
    let foundSelector = null;
    for (const sel of possibleSelectors) {
      try {
        const el = page.locator(sel).first();
        const count = await el.count();
        if (count > 0) {
          const visible = await el.isVisible();
          console.log(`Mobile selector "${sel}" found (${count}), visible: ${visible}`);
          if (visible && !regionSwitcher) {
            regionSwitcher = el;
            foundSelector = sel;
          }
        }
      } catch (e) {}
    }

    if (!regionSwitcher) {
      const buttons = await page.locator('button').all();
      console.log(`Mobile total buttons: ${buttons.length}`);
      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        try {
          const text = await buttons[i].textContent();
          const visible = await buttons[i].isVisible();
          console.log(`  Mobile Button[${i}]: "${text?.trim()}" visible:${visible}`);
        } catch (e) {}
      }
      results.notes.push('Region switcher not found on mobile');
    } else {
      console.log(`Mobile: found region switcher with: ${foundSelector}`);
      results.switcherVisible = true;

      await regionSwitcher.click();
      await sleep(1000);
      await page.screenshot({ path: `${SCREENSHOTS}/mobile-02-dropdown-open.png`, fullPage: false });
      console.log('Screenshot: mobile-02-dropdown-open.png');

      const sfBayArea = page.locator('text=SF Bay Area').first();
      const bigIsland = page.locator('text=Big Island, Hawaii').first();
      const bigIsland2 = page.locator('text=Big Island').first();

      const hasSF = await sfBayArea.count() > 0 ? await sfBayArea.isVisible() : false;
      const hasHawaii = await bigIsland.count() > 0 ? await bigIsland.isVisible() : false;
      const hasHawaii2 = await bigIsland2.count() > 0 ? await bigIsland2.isVisible() : false;

      console.log(`Mobile SF Bay Area visible: ${hasSF}`);
      console.log(`Mobile Big Island, Hawaii visible: ${hasHawaii}`);

      results.dropdownOpens = true;

      if (hasHawaii || hasHawaii2) {
        const bigIslandOption = hasHawaii ? bigIsland : bigIsland2;
        await bigIslandOption.click();
        await sleep(2000);
        await page.screenshot({ path: `${SCREENSHOTS}/mobile-03-after-hawaii-switch.png`, fullPage: false });
        console.log('Screenshot: mobile-03-after-hawaii-switch.png');

        const pageContent = await page.textContent('body');
        const hasHawaiiContent = pageContent.toLowerCase().includes('hawaii') || 
                                  pageContent.toLowerCase().includes('big island');
        console.log(`Mobile page contains Hawaii content: ${hasHawaiiContent}`);
        results.switchingWorks = hasHawaiiContent;

        if (!hasHawaiiContent) {
          results.notes.push('Mobile: switched but no Hawaii content appeared');
        }
      } else {
        results.notes.push('Mobile: dropdown opened but Big Island option not visible');
      }
    }
  } catch (err) {
    console.error('Mobile test error:', err.message);
    results.notes.push(`Error: ${err.message}`);
    try {
      await page.screenshot({ path: `${SCREENSHOTS}/mobile-ERROR.png`, fullPage: false });
    } catch (e) {}
  }

  await context.close();
  return results;
}

async function main() {
  console.log('Parker — Region Switcher Test');
  console.log('URL:', URL);
  console.log('Date: 2026-03-26');

  const browser = await chromium.launch({ headless: true });

  const desktopResults = await runDesktopTest(browser);
  const mobileResults = await runMobileTest(browser);

  await browser.close();

  console.log('\n=== RESULTS SUMMARY ===');
  console.log('Desktop:', JSON.stringify(desktopResults, null, 2));
  console.log('Mobile:', JSON.stringify(mobileResults, null, 2));

  // Write results to file
  const results = { desktop: desktopResults, mobile: mobileResults, timestamp: new Date().toISOString() };
  require('fs').writeFileSync(`${SCREENSHOTS}/results.json`, JSON.stringify(results, null, 2));
  console.log('\nResults saved to parker-screenshots/results.json');
}

main().catch(console.error);

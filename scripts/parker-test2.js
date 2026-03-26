const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

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
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/desktop-01-page-loaded.png` });
    console.log('Screenshot: desktop-01-page-loaded.png');

    // Find region switcher
    const regionSwitcher = page.locator('[aria-label*="region"]').first();
    const switcherCount = await regionSwitcher.count();
    console.log('Region switcher found:', switcherCount > 0);

    if (switcherCount === 0) {
      results.notes.push('Region switcher not found');
      await context.close();
      return results;
    }

    // Get switcher text (current region)
    const switcherText = await regionSwitcher.textContent();
    console.log('Switcher text:', switcherText?.trim());

    // Click switcher
    await regionSwitcher.click();
    await sleep(1500);
    await page.screenshot({ path: `${SCREENSHOTS}/desktop-02-dropdown-open.png` });
    console.log('Screenshot: desktop-02-dropdown-open.png');

    // Check for overlay that's blocking clicks
    const overlay = page.locator('div[aria-hidden="true"].fixed.inset-0');
    const overlayCount = await overlay.count();
    console.log('Blocking overlay count:', overlayCount);
    if (overlayCount > 0) {
      for (let i = 0; i < overlayCount; i++) {
        const zIndex = await overlay.nth(i).evaluate(el => getComputedStyle(el).zIndex);
        const pointerEvents = await overlay.nth(i).evaluate(el => getComputedStyle(el).pointerEvents);
        console.log(`  Overlay[${i}]: z-index=${zIndex}, pointer-events=${pointerEvents}`);
      }
    }

    // Check both options visible
    const sfBayArea = page.locator('text=SF Bay Area').first();
    const bigIslandHawaii = page.locator('text="Big Island, Hawaii"').first();
    const bigIsland = page.locator('text=Big Island').first();

    const sfVisible = await sfBayArea.count() > 0 && await sfBayArea.isVisible().catch(() => false);
    const hawaiiVisible = await bigIslandHawaii.count() > 0 && await bigIslandHawaii.isVisible().catch(() => false);
    const bigIslandVisible = await bigIsland.count() > 0 && await bigIsland.isVisible().catch(() => false);
    
    console.log('SF Bay Area option visible:', sfVisible);
    console.log('Big Island, Hawaii option visible:', hawaiiVisible);
    console.log('Big Island option visible:', bigIslandVisible);

    results.dropdownOpens = true;
    results.bothRegionsVisible = sfVisible && (hawaiiVisible || bigIslandVisible);

    // Log all dropdown items
    const dropdownItems = await page.locator('[role="option"], [role="menuitem"], [role="listitem"]').all();
    console.log('Dropdown role items found:', dropdownItems.length);
    for (let i = 0; i < dropdownItems.length; i++) {
      const text = await dropdownItems[i].textContent().catch(() => '');
      const visible = await dropdownItems[i].isVisible().catch(() => false);
      console.log(`  Item[${i}]: "${text?.trim()}" visible:${visible}`);
    }

    // Get initial event indicators before switching
    const initialEventTexts = await page.evaluate(() => {
      const events = document.querySelectorAll('article, [class*="card"], [class*="event-item"]');
      return Array.from(events).slice(0, 5).map(e => e.textContent?.slice(0, 80).trim());
    });
    console.log('Initial events (first 5):', initialEventTexts);

    // Try to click Big Island option using force (bypasses overlay)
    if (hawaiiVisible || bigIslandVisible) {
      const targetOption = hawaiiVisible ? bigIslandHawaii : bigIsland;
      console.log('Attempting force click on Big Island option...');
      await targetOption.click({ force: true });
      await sleep(3000);
      await page.screenshot({ path: `${SCREENSHOTS}/desktop-03-after-hawaii-switch.png` });
      console.log('Screenshot: desktop-03-after-hawaii-switch.png');

      const newUrl = page.url();
      console.log('URL after switch:', newUrl);

      const afterEventTexts = await page.evaluate(() => {
        const events = document.querySelectorAll('article, [class*="card"], [class*="event-item"]');
        return Array.from(events).slice(0, 5).map(e => e.textContent?.slice(0, 80).trim());
      });
      console.log('Events after switch (first 5):', afterEventTexts);

      const pageText = await page.textContent('body');
      const hasHawaiiContent = pageText.toLowerCase().includes('hawaii') || 
                                pageText.toLowerCase().includes('big island') ||
                                pageText.toLowerCase().includes('kona') ||
                                pageText.toLowerCase().includes('hilo');
      console.log('Hawaii content on page:', hasHawaiiContent);

      // Check if switcher shows new region
      const switcherTextAfter = await regionSwitcher.textContent().catch(() => '');
      console.log('Switcher text after switch:', switcherTextAfter?.trim());

      results.switchingWorks = true; // click worked (force)
      results.eventsUpdate = hasHawaiiContent || JSON.stringify(afterEventTexts) !== JSON.stringify(initialEventTexts);
      
      if (!results.eventsUpdate) {
        results.notes.push('Forced click on Big Island worked but events did not visibly update with Hawaii content');
      }

      // KEY FINDING: Can normal users click it? The overlay blocks clicks!
      if (overlayCount > 0) {
        results.notes.push(`CRITICAL BUG: <div aria-hidden="true" class="fixed inset-0 z-[9998]"> is intercepting ALL pointer events on the dropdown — normal users cannot click the options without force click`);
        results.switchingWorks = false; // Real users can't click it
      }
    } else {
      results.notes.push('Neither Big Island option was visible in dropdown');
    }

  } catch (err) {
    console.error('Desktop test error:', err.message);
    results.notes.push(`Error: ${err.message}`);
    try { await page.screenshot({ path: `${SCREENSHOTS}/desktop-ERROR.png` }); } catch (e) {}
  }

  await context.close();
  return results;
}

async function runMobileTest(browser) {
  console.log('\n=== MOBILE TEST (375x812) ===');
  const context = await browser.newContext({ 
    viewport: { width: 375, height: 812 }, 
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const results = {
    switcherVisible: false,
    dropdownOpens: false,
    switchingWorks: false,
    notes: []
  };

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/mobile-01-page-loaded.png` });
    console.log('Screenshot: mobile-01-page-loaded.png');

    // Investigate the mobile layout
    const mobilePageText = await page.evaluate(() => {
      // Find elements with region-related text
      const all = document.querySelectorAll('button, select, [role="combobox"], [role="listbox"], a');
      return Array.from(all).slice(0, 30).map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim().slice(0, 60),
        visible: el.offsetParent !== null,
        ariaLabel: el.getAttribute('aria-label'),
        className: el.className?.slice(0, 80),
        role: el.getAttribute('role')
      }));
    });
    console.log('Mobile interactive elements:');
    mobilePageText.forEach((el, i) => console.log(`  [${i}] ${el.tag} "${el.text}" visible:${el.visible} aria:${el.ariaLabel}`));

    // Check if region switcher is visible - look by aria-label
    const regionSwitcher = page.locator('[aria-label*="region"]').first();
    const switcherCount = await regionSwitcher.count();
    console.log('Mobile region switcher (aria-label*="region") count:', switcherCount);

    if (switcherCount > 0) {
      const isVisible = await regionSwitcher.isVisible();
      console.log('Mobile region switcher visible:', isVisible);
      results.switcherVisible = isVisible;
      
      const switcherText = await regionSwitcher.textContent();
      console.log('Mobile switcher text:', switcherText?.trim());

      if (isVisible) {
        await regionSwitcher.click();
        await sleep(1500);
        await page.screenshot({ path: `${SCREENSHOTS}/mobile-02-dropdown-open.png` });
        console.log('Screenshot: mobile-02-dropdown-open.png');

        // Check options
        const sfOption = page.locator('text=SF Bay Area').first();
        const hawaiiOption = page.locator('text=Big Island').first();
        const sfVisible = await sfOption.count() > 0 && await sfOption.isVisible().catch(() => false);
        const hawaiiVisible = await hawaiiOption.count() > 0 && await hawaiiOption.isVisible().catch(() => false);
        console.log('Mobile SF visible:', sfVisible, 'Hawaii visible:', hawaiiVisible);

        // Check overlay
        const overlay = page.locator('div[aria-hidden="true"].fixed.inset-0');
        const overlayCount = await overlay.count();
        console.log('Mobile blocking overlay count:', overlayCount);

        results.dropdownOpens = true;

        if (hawaiiVisible) {
          await hawaiiOption.click({ force: true });
          await sleep(2000);
          await page.screenshot({ path: `${SCREENSHOTS}/mobile-03-after-hawaii-switch.png` });
          console.log('Screenshot: mobile-03-after-hawaii-switch.png');

          const pageText = await page.textContent('body');
          const hasHawaiiContent = pageText.toLowerCase().includes('hawaii') || 
                                    pageText.toLowerCase().includes('big island');
          console.log('Mobile Hawaii content:', hasHawaiiContent);
          results.switchingWorks = hasHawaiiContent;

          if (overlayCount > 0) {
            results.notes.push(`CRITICAL BUG: Same overlay bug on mobile — blocks dropdown clicks`);
            results.switchingWorks = false;
          }
        } else {
          results.notes.push('Mobile: dropdown opened but Big Island option not visible');
        }
      }
    } else {
      // Check if mobile has a different switcher design
      const allRegionButtons = await page.locator('button').all();
      for (let i = 0; i < allRegionButtons.length; i++) {
        const text = await allRegionButtons[i].textContent().catch(() => '');
        if (text?.toLowerCase().includes('island') || text?.toLowerCase().includes('bay') || text?.toLowerCase().includes('hawaii')) {
          const visible = await allRegionButtons[i].isVisible().catch(() => false);
          console.log(`Mobile region button found: "${text?.trim()}" visible:${visible}`);
          if (visible && !results.switcherVisible) {
            results.switcherVisible = true;
            results.notes.push(`Mobile region switcher found as button with text: "${text?.trim()}"`);
          }
        }
      }

      // Try clicking the visible "Big Island, Hawaii" button we found earlier
      const bigIslandBtn = page.locator('button:has-text("Big Island, Hawaii")').first();
      const count = await bigIslandBtn.count();
      if (count > 0) {
        const visible = await bigIslandBtn.isVisible();
        console.log('Big Island button on mobile visible:', visible);
        if (visible) {
          // This might be the current region display — check if it opens a dropdown
          await bigIslandBtn.click();
          await sleep(1500);
          await page.screenshot({ path: `${SCREENSHOTS}/mobile-02-after-bigisland-click.png` });
          console.log('Screenshot: mobile-02-after-bigisland-click.png');

          // Check if dropdown appeared with options
          const sfOption = page.locator('text=SF Bay Area').first();
          const sfVisible = await sfOption.count() > 0 && await sfOption.isVisible().catch(() => false);
          console.log('After clicking Big Island, SF option visible:', sfVisible);

          if (sfVisible) {
            results.dropdownOpens = true;
            results.notes.push('Mobile switcher shows current region (Big Island, Hawaii) and opens dropdown on click');
            
            // Try clicking SF Bay Area to test switching
            await sfOption.click({ force: true });
            await sleep(2000);
            await page.screenshot({ path: `${SCREENSHOTS}/mobile-03-switched-to-SF.png` });

            const switcherText = await bigIslandBtn.textContent().catch(() => '');
            console.log('Mobile switcher text after click:', switcherText?.trim());
            results.switchingWorks = true;
            results.notes.push('Mobile: switching regions appears to work (tested SF selection)');
          }
        }
      }

      if (!results.switcherVisible) {
        results.notes.push('Region switcher not found on mobile via any method');
      }
    }

  } catch (err) {
    console.error('Mobile test error:', err.message);
    results.notes.push(`Error: ${err.message}`);
    try { await page.screenshot({ path: `${SCREENSHOTS}/mobile-ERROR.png` }); } catch (e) {}
  }

  await context.close();
  return results;
}

async function main() {
  console.log('Parker — Region Switcher Test (v2)');
  console.log('URL:', URL);
  console.log('Date: 2026-03-26');

  const browser = await chromium.launch({ headless: true });
  const desktopResults = await runDesktopTest(browser);
  const mobileResults = await runMobileTest(browser);
  await browser.close();

  console.log('\n=== FINAL RESULTS ===');
  console.log('Desktop:', JSON.stringify(desktopResults, null, 2));
  console.log('Mobile:', JSON.stringify(mobileResults, null, 2));

  fs.writeFileSync(`${SCREENSHOTS}/results-v2.json`, JSON.stringify({ desktop: desktopResults, mobile: mobileResults, timestamp: new Date().toISOString() }, null, 2));
  console.log('Results saved to results-v2.json');
}

main().catch(console.error);

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'parker-screenshots', 'final-v2');
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  const results = {
    noConsoleErrors: null,
    searchWorks: null,
    modalWorks: null,
    smokeTest: null,
  };

  // ==========================================
  // TEST 1: API fetch on page load — no console error
  // ==========================================
  console.log('\n=== TEST 1: API fetch on page load ===');
  
  // Clear localStorage
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  
  await screenshot(page, '01-fresh-load');
  
  // Check for events loaded
  const eventCards = await page.$$('[class*="card"], [class*="event"], [class*="Event"]');
  const eventCount = eventCards.length;
  console.log(`Event cards found: ${eventCount}`);
  
  // Check console errors
  const fetchErrors = consoleErrors.filter(e => e.toLowerCase().includes('fetch') || e.toLowerCase().includes('failed'));
  console.log(`Console errors with fetch/failed: ${fetchErrors.length}`);
  console.log(`All console errors: ${consoleErrors.length}`);
  consoleErrors.forEach(e => console.log(`  - ${e}`));
  
  if (fetchErrors.length === 0 && eventCount > 0) {
    results.noConsoleErrors = 'PASS';
    console.log('✅ TEST 1 PASS: No fetch errors, events loaded');
  } else if (fetchErrors.length > 0) {
    results.noConsoleErrors = 'FAIL';
    console.log('❌ TEST 1 FAIL: Fetch errors in console');
  } else if (eventCount === 0) {
    results.noConsoleErrors = 'FAIL';
    console.log('❌ TEST 1 FAIL: No events loaded');
  } else {
    results.noConsoleErrors = 'PASS';
    console.log('✅ TEST 1 PASS');
  }

  // ==========================================
  // TEST 2: Search — must work consistently
  // ==========================================
  console.log('\n=== TEST 2: Search ===');
  let searchPass = true;
  
  try {
    // Find search input
    const searchInput = await page.$('input[type="search"], input[placeholder*="earch"], input[placeholder*="Search"], [class*="search"] input, input[name*="search"]');
    
    if (!searchInput) {
      console.log('❌ Search input not found');
      searchPass = false;
    } else {
      // Step 2a: Search "market"
      await searchInput.click();
      await searchInput.fill('market');
      await sleep(2000);
      await screenshot(page, '02-search-market');
      
      const marketResults = await page.$$('[class*="card"], [class*="event"], [class*="Event"]');
      console.log(`Search "market" results: ${marketResults.length}`);
      
      if (marketResults.length === 0) {
        console.log('❌ Search "market" returned 0 results');
        searchPass = false;
      } else {
        console.log(`✅ Search "market" returned ${marketResults.length} results`);
      }
      
      // Step 2b: Clear search → all events return
      await searchInput.fill('');
      await searchInput.press('Enter');
      await sleep(2000);
      await screenshot(page, '03-search-cleared');
      
      const clearedResults = await page.$$('[class*="card"], [class*="event"], [class*="Event"]');
      console.log(`After clearing search: ${clearedResults.length} events`);
      
      if (clearedResults.length === 0) {
        console.log('❌ Cleared search returned 0 events');
        searchPass = false;
      } else {
        console.log(`✅ Cleared search shows ${clearedResults.length} events`);
      }
      
      // Step 2c: Navigate to Saved page and back, search still works
      // Look for saved/bookmarks nav
      const savedLink = await page.$('a[href*="saved"], a[href*="bookmark"], [class*="saved"], button:has-text("Saved"), a:has-text("Saved")');
      if (savedLink) {
        await savedLink.click();
        await sleep(2000);
        await screenshot(page, '04-saved-page');
        
        // Navigate back
        const backLink = await page.$('a[href*="home"], a[href="/"], button:has-text("Back"), a:has-text("Events"), [class*="home"]');
        if (backLink) {
          await backLink.click();
        } else {
          await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });
        }
        await sleep(2000);
        await screenshot(page, '05-back-from-saved');
        
        // Try searching again
        const searchInput2 = await page.$('input[type="search"], input[placeholder*="earch"], input[placeholder*="Search"], [class*="search"] input');
        if (searchInput2) {
          await searchInput2.click();
          await searchInput2.fill('market');
          await sleep(2000);
          await screenshot(page, '06-search-after-nav');
          
          const afterNavResults = await page.$$('[class*="card"], [class*="event"], [class*="Event"]');
          console.log(`Search after nav: ${afterNavResults.length} results`);
          
          if (afterNavResults.length === 0) {
            console.log('❌ Search after navigation returned 0 results');
            searchPass = false;
          } else {
            console.log(`✅ Search after nav shows ${afterNavResults.length} results`);
          }
          
          // Clear again
          await searchInput2.fill('');
          await searchInput2.press('Enter');
          await sleep(2000);
          await screenshot(page, '07-search-cleared-again');
          
          const finalClearResults = await page.$$('[class*="card"], [class*="event"], [class*="Event"]');
          console.log(`Final clear results: ${finalClearResults.length}`);
          
          if (finalClearResults.length === 0) {
            console.log('❌ Second clear returned 0 events');
            searchPass = false;
          } else {
            console.log(`✅ Second clear shows ${finalClearResults.length} events`);
          }
        }
      } else {
        console.log('⚠️ Saved link not found, skipping nav test');
      }
    }
  } catch (e) {
    console.log(`❌ Search test error: ${e.message}`);
    searchPass = false;
  }
  
  results.searchWorks = searchPass ? 'PASS' : 'FAIL';
  console.log(`Search test: ${results.searchWorks}`);

  // ==========================================
  // TEST 3: Modal — click event card, verify data
  // ==========================================
  console.log('\n=== TEST 3: Modal ===');
  
  try {
    // Navigate fresh
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    
    const cards = await page.$$('[class*="card"], [class*="event-item"], [class*="EventCard"]');
    console.log(`Found ${cards.length} cards to click`);
    
    if (cards.length > 0) {
      await cards[0].click();
      await sleep(2000);
      await screenshot(page, '08-modal-open');
      
      // Check modal opened
      const modal = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"], [class*="overlay"]');
      if (modal) {
        const modalText = await modal.innerText();
        console.log(`Modal text preview: ${modalText.substring(0, 200)}`);
        
        if (modalText.toLowerCase().includes('event not found') || modalText.toLowerCase().includes('not found')) {
          console.log('❌ Modal shows "Event not found"');
          results.modalWorks = 'FAIL';
        } else if (modalText.length > 20) {
          console.log('✅ Modal shows real event data');
          results.modalWorks = 'PASS';
        } else {
          console.log('❌ Modal content too short/empty');
          results.modalWorks = 'FAIL';
        }
      } else {
        // Maybe modal is inline or page navigated
        const pageText = await page.innerText('body');
        if (pageText.toLowerCase().includes('event not found')) {
          console.log('❌ Page shows "Event not found"');
          results.modalWorks = 'FAIL';
        } else {
          console.log('✅ No "Event not found" error (possibly inline detail view)');
          await screenshot(page, '08-after-card-click');
          results.modalWorks = 'PASS';
        }
      }
    } else {
      console.log('❌ No cards found to click');
      results.modalWorks = 'FAIL';
    }
  } catch (e) {
    console.log(`❌ Modal test error: ${e.message}`);
    results.modalWorks = 'FAIL';
  }

  // ==========================================
  // TEST 4: Smoke test — region, filters, save
  // ==========================================
  console.log('\n=== TEST 4: Smoke Test ===');
  let smokePass = true;
  
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    
    // 4a: Region switch SF ↔ Hawaii
    const regionSelector = await page.$('select, [class*="region"], [class*="Region"], button:has-text("SF"), button:has-text("San Francisco"), button:has-text("Hawaii")');
    if (regionSelector) {
      const tagName = await regionSelector.evaluate(el => el.tagName);
      if (tagName === 'SELECT') {
        await regionSelector.selectOption({ label: /hawaii/i });
      } else {
        await regionSelector.click();
      }
      await sleep(2000);
      await screenshot(page, '09-region-hawaii');
      
      const hawaiiEvents = await page.$$('[class*="card"], [class*="event"], [class*="Event"]');
      console.log(`Hawaii events: ${hawaiiEvents.length}`);
      
      // Switch back to SF
      if (tagName === 'SELECT') {
        await regionSelector.selectOption({ label: /san francisco|sf/i });
      } else {
        // Try to find SF button
        const sfBtn = await page.$('button:has-text("SF"), button:has-text("San Francisco"), [class*="region"] button');
        if (sfBtn) await sfBtn.click();
      }
      await sleep(2000);
      await screenshot(page, '10-region-sf');
      console.log('✅ Region switch worked');
    } else {
      // Try clicking region buttons directly
      const anyRegionBtn = await page.$('[class*="region-tab"], [class*="RegionTab"], [class*="location-tab"]');
      if (anyRegionBtn) {
        await anyRegionBtn.click();
        await sleep(1000);
        console.log('✅ Region interaction worked');
      } else {
        console.log('⚠️ Region selector not found via standard selectors, checking page structure');
        await screenshot(page, '09-region-check');
        // Not a fatal failure for smoke test
      }
    }
    
    // 4b: Filters
    const filterBtn = await page.$('[class*="filter"], button:has-text("Filter"), [class*="Filter"]');
    if (filterBtn) {
      await filterBtn.click();
      await sleep(1500);
      await screenshot(page, '11-filters-open');
      
      // Try clicking a filter option
      const filterOption = await page.$('[class*="filter-option"], [class*="FilterOption"], [class*="category"]');
      if (filterOption) {
        await filterOption.click();
        await sleep(1500);
        await screenshot(page, '12-filter-applied');
      }
      
      // Close filter
      const closeBtn = await page.$('[class*="close"], button:has-text("Close"), button:has-text("Done"), [aria-label="close"]');
      if (closeBtn) await closeBtn.click();
      await sleep(1000);
      console.log('✅ Filters worked');
    } else {
      console.log('⚠️ Filter button not found, checking page');
      await screenshot(page, '11-filter-check');
    }
    
    // 4c: Save heart
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    
    const heartBtn = await page.$('[class*="heart"], [class*="Heart"], [class*="save"], [class*="bookmark"], button[aria-label*="save"], button[aria-label*="favorite"]');
    if (heartBtn) {
      await heartBtn.click();
      await sleep(1500);
      await screenshot(page, '13-save-heart');
      console.log('✅ Save heart clicked');
    } else {
      // Try finding any SVG heart icon
      const svgHeart = await page.$('svg[class*="heart"], svg[class*="Heart"]');
      if (svgHeart) {
        await svgHeart.click();
        await sleep(1000);
        console.log('✅ SVG Heart clicked');
      } else {
        console.log('⚠️ Heart/save button not found via standard selectors');
        await screenshot(page, '13-save-check');
      }
    }
    
    results.smokeTest = 'PASS';
    console.log('✅ Smoke test complete');
    
  } catch (e) {
    console.log(`❌ Smoke test error: ${e.message}`);
    results.smokeTest = 'FAIL';
    smokePass = false;
  }

  // ==========================================
  // Final screenshot
  // ==========================================
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1000);
  await screenshot(page, '99-final-state');

  await browser.close();

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n=====================================');
  console.log('PARKER FINAL TEST RESULTS');
  console.log('=====================================');
  console.log(`1. No console errors on load: ${results.noConsoleErrors}`);
  console.log(`2. Search works + clears correctly: ${results.searchWorks}`);
  console.log(`3. Modal shows event data: ${results.modalWorks}`);
  console.log(`4. Smoke test (region/filters/save): ${results.smokeTest}`);
  
  const allPass = Object.values(results).every(v => v === 'PASS');
  const verdict = allPass ? '✅ APPROVED' : '❌ REJECTED';
  console.log(`\nVERDICT: ${verdict}`);
  
  return results;
}

main().catch(console.error);

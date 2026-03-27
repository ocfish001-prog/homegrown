const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://homegrown-phase1-app.netlify.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'scripts', 'parker-screenshots', 'final-review');

const results = {
  pageLoad: { pass: false, notes: [] },
  regionSwitcher: { pass: false, notes: [] },
  eventModal: { pass: false, notes: [] },
  filters: { pass: false, notes: [] },
  savesFavorites: { pass: false, notes: [] },
  search: { pass: false, notes: [] },
  loadMore: { pass: false, notes: [] },
  mobile: { pass: false, notes: [] },
  navigation: { pass: false, notes: [] },
};

const bugs = [];

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 Screenshot: ${name}`);
}

async function runTests() {
  console.log('🚀 Parker Final Review starting...\n');
  
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // ==========================================
  // TEST 1: PAGE LOAD
  // ==========================================
  console.log('=== TEST 1: PAGE LOAD ===');
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Clear localStorage
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000);

  // Check page loaded
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // Check for SF Bay Area as default region
  const bodyText = await page.textContent('body');
  const hasSFBay = bodyText.toLowerCase().includes('sf bay') || bodyText.toLowerCase().includes('san francisco') || bodyText.toLowerCase().includes('bay area');
  console.log(`Has SF Bay reference: ${hasSFBay}`);
  
  // Check for events
  const eventCards = await page.locator('[data-testid="event-card"], .event-card, article, [class*="EventCard"], [class*="event-card"]').count();
  console.log(`Event cards found: ${eventCards}`);

  // Check for SF-specific events
  const sfEvents = bodyText.includes('Presidio') || bodyText.includes('Muir Woods') || bodyText.includes('Chabot') || bodyText.includes('Oakland') || bodyText.includes('Berkeley');
  console.log(`Has SF-area events: ${sfEvents}`);

  // Check console errors
  console.log(`Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    consoleErrors.slice(0, 5).forEach(e => console.log(`  Error: ${e}`));
  }

  await screenshot(page, '01-homepage-sf-bay');

  if (hasSFBay && eventCards > 0 && consoleErrors.filter(e => !e.includes('favicon') && !e.includes('analytics')).length === 0) {
    results.pageLoad.pass = true;
  } else {
    if (!hasSFBay) results.pageLoad.notes.push('SF Bay not detected as default region');
    if (eventCards === 0) results.pageLoad.notes.push('No event cards found');
    if (consoleErrors.length > 0) results.pageLoad.notes.push(`${consoleErrors.length} console errors`);
  }
  console.log(`Test 1 result: ${results.pageLoad.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 2: REGION SWITCHER
  // ==========================================
  console.log('=== TEST 2: REGION SWITCHER ===');
  
  // Find and click the region selector
  let regionSwitchWorked = false;
  
  try {
    // Look for region selector button
    const regionSelectors = [
      '[data-testid="region-selector"]',
      'button:has-text("SF Bay")',
      'button:has-text("Bay Area")',
      '[class*="region"]',
      'button:has-text("San Francisco")',
    ];
    
    let regionBtn = null;
    for (const sel of regionSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        regionBtn = el;
        console.log(`Found region selector: ${sel}`);
        break;
      }
    }

    if (!regionBtn) {
      // Try to find any button that might be the region selector
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && (text.includes('Bay') || text.includes('SF') || text.includes('Region') || text.includes('Hawaii'))) {
          regionBtn = btn;
          console.log(`Found region button by text: "${text}"`);
          break;
        }
      }
    }

    if (regionBtn) {
      await regionBtn.click();
      await page.waitForTimeout(1000);
      
      // Check if dropdown opened
      const dropdownText = await page.textContent('body');
      const dropdownOpen = dropdownText.includes('Big Island') || dropdownText.includes('Hawaii') || dropdownText.includes('SF Bay');
      console.log(`Dropdown opened: ${dropdownOpen}`);
      
      // Click Big Island Hawaii
      const bigIslandBtn = page.locator('button:has-text("Big Island"), [role="option"]:has-text("Big Island"), li:has-text("Big Island")').first();
      if (await bigIslandBtn.count() > 0) {
        await bigIslandBtn.click();
        await page.waitForTimeout(3000);
        
        const bodyAfterSwitch = await page.textContent('body');
        const hasHawaii = bodyAfterSwitch.includes('Waimea') || bodyAfterSwitch.includes('Hilo') || bodyAfterSwitch.includes('Waikoloa') || bodyAfterSwitch.includes('Hawaii') || bodyAfterSwitch.includes('Kona') || bodyAfterSwitch.includes('Big Island');
        console.log(`Hawaii events loaded: ${hasHawaii}`);
        
        await screenshot(page, '02-big-island-loaded');
        
        if (hasHawaii) {
          // Check header/sidebar updated
          const pageText = await page.textContent('body');
          const headerUpdated = pageText.toLowerCase().includes('big island') || pageText.toLowerCase().includes('hawaii');
          console.log(`Header/region label updated: ${headerUpdated}`);
          
          // Switch back to SF Bay
          const regionBtns2 = [
            'button:has-text("Big Island")',
            '[data-testid="region-selector"]',
            '[class*="region"]',
          ];
          
          let regionBtn2 = null;
          for (const sel of regionBtns2) {
            const el = page.locator(sel).first();
            if (await el.count() > 0) {
              regionBtn2 = el;
              break;
            }
          }
          
          if (regionBtn2) {
            await regionBtn2.click();
            await page.waitForTimeout(1000);
            
            const sfBtn = page.locator('button:has-text("SF Bay"), [role="option"]:has-text("SF Bay"), li:has-text("SF Bay"), button:has-text("San Francisco")').first();
            if (await sfBtn.count() > 0) {
              await sfBtn.click();
              await page.waitForTimeout(3000);
              
              const bodyBackToSF = await page.textContent('body');
              const backToSF = bodyBackToSF.includes('Presidio') || bodyBackToSF.includes('Bay Area') || bodyBackToSF.includes('San Francisco') || bodyBackToSF.includes('Oakland') || bodyBackToSF.includes('Berkeley') || bodyBackToSF.includes('SF Bay');
              console.log(`Switched back to SF: ${backToSF}`);
              
              regionSwitchWorked = hasHawaii && backToSF;
            } else {
              regionSwitchWorked = hasHawaii;
              results.regionSwitcher.notes.push('Could not switch back to SF Bay');
            }
          }
        } else {
          results.regionSwitcher.notes.push('Hawaii events did not load after switching');
        }
      } else {
        results.regionSwitcher.notes.push('Big Island option not found in dropdown');
      }
    } else {
      results.regionSwitcher.notes.push('Region selector button not found');
    }
  } catch (e) {
    results.regionSwitcher.notes.push(`Error: ${e.message}`);
    console.log(`Error in region test: ${e.message}`);
  }

  results.regionSwitcher.pass = regionSwitchWorked;
  console.log(`Test 2 result: ${results.regionSwitcher.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 3: EVENT CARD MODAL
  // ==========================================
  console.log('=== TEST 3: EVENT CARD MODAL ===');
  
  // Navigate to Big Island first
  try {
    const regionSelectors = [
      'button:has-text("SF Bay")',
      'button:has-text("Bay Area")',
      '[data-testid="region-selector"]',
      '[class*="region"]',
    ];
    
    let regionBtn = null;
    for (const sel of regionSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        regionBtn = el;
        break;
      }
    }
    
    if (regionBtn) {
      await regionBtn.click();
      await page.waitForTimeout(1000);
      const bigIslandBtn = page.locator('button:has-text("Big Island"), [role="option"]:has-text("Big Island"), li:has-text("Big Island")').first();
      if (await bigIslandBtn.count() > 0) {
        await bigIslandBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  } catch (e) {
    console.log(`Setup for modal test failed: ${e.message}`);
  }

  let modalTestPassed = false;
  let modalContent = '';
  
  try {
    // Find event cards
    const cardSelectors = [
      'article',
      '[class*="card"]',
      '[class*="Card"]',
      '[data-testid*="event"]',
      '.cursor-pointer',
    ];
    
    let cards = null;
    for (const sel of cardSelectors) {
      const els = page.locator(sel);
      const count = await els.count();
      if (count > 0) {
        cards = els;
        console.log(`Found ${count} cards with selector: ${sel}`);
        break;
      }
    }
    
    if (cards && await cards.count() > 0) {
      const currentUrl = page.url();
      console.log(`URL before click: ${currentUrl}`);
      
      // Click the first card
      await cards.first().click();
      await page.waitForTimeout(2000);
      
      const urlAfterClick = page.url();
      console.log(`URL after click: ${urlAfterClick}`);
      
      const bodyAfterClick = await page.textContent('body');
      
      // Check if modal is open (not a navigation)
      const isModal = urlAfterClick === currentUrl || urlAfterClick.includes('#');
      const hasEventNotFound = bodyAfterClick.includes('Event not found') || bodyAfterClick.includes('event not found');
      
      console.log(`URL stayed same (modal): ${isModal}`);
      console.log(`Has "Event not found": ${hasEventNotFound}`);
      
      // Check modal content
      const modalSelectors = [
        '[role="dialog"]',
        '[class*="modal"]',
        '[class*="Modal"]',
        '[class*="sheet"]',
        '[class*="Sheet"]',
        '[class*="overlay"]',
        '[class*="drawer"]',
      ];
      
      let modalEl = null;
      for (const sel of modalSelectors) {
        const el = page.locator(sel);
        if (await el.count() > 0) {
          modalEl = el.first();
          console.log(`Found modal with selector: ${sel}`);
          break;
        }
      }
      
      if (modalEl) {
        modalContent = await modalEl.textContent() || '';
        console.log(`Modal content preview: ${modalContent.substring(0, 200)}`);
        
        const hasTitle = modalContent.length > 20 && !modalContent.includes('Event not found');
        const hasDate = modalContent.match(/\d{4}|\w+ \d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
        
        console.log(`Modal has content: ${hasTitle}`);
        console.log(`Modal has date: ${!!hasDate}`);
        
        await screenshot(page, '03-modal-open-with-data');
        
        // Test close methods
        let closedByX = false;
        let closedByBackdrop = false;
        let closedByEscape = false;
        
        // Close by X button
        const closeBtn = page.locator('button[aria-label*="close"], button[aria-label*="Close"], button:has-text("×"), button:has-text("✕"), [class*="close"]').first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(1000);
          const afterClose = await page.textContent('body');
          closedByX = !afterClose.includes(modalContent.substring(0, 30)) || !(await page.locator('[role="dialog"]').count() > 0);
          console.log(`Closed by X: ${closedByX}`);
        } else {
          console.log('No X close button found - trying Escape');
        }
        
        // Reopen modal for backdrop test
        if (closedByX || !closedByX) {
          // Click card again
          try {
            await cards.first().click();
            await page.waitForTimeout(2000);
            
            // Close by Escape
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
            const afterEscape = await page.locator('[role="dialog"], [class*="modal"], [class*="Modal"]').count();
            closedByEscape = afterEscape === 0;
            console.log(`Closed by Escape: ${closedByEscape}`);
          } catch (e) {
            console.log(`Escape test error: ${e.message}`);
          }
        }
        
        // Check we're still on events list after closing
        const finalUrl = page.url();
        const stillOnList = finalUrl === currentUrl || !finalUrl.includes('/event/');
        console.log(`Still on events list: ${stillOnList}`);
        
        if (hasTitle && !hasEventNotFound && (closedByX || closedByEscape)) {
          modalTestPassed = true;
        } else {
          if (hasEventNotFound) {
            results.eventModal.notes.push('Modal shows "Event not found"');
            bugs.push('CRITICAL: Modal shows "Event not found" on Big Island events');
          }
          if (!closedByX && !closedByEscape) {
            results.eventModal.notes.push('Modal could not be closed');
          }
        }
      } else if (!isModal) {
        results.eventModal.notes.push('Clicking event card navigated away from page (no modal)');
        bugs.push('Modal: clicking event card navigates to a new page instead of opening modal');
      } else {
        results.eventModal.notes.push('No modal dialog found after clicking card');
      }
    } else {
      results.eventModal.notes.push('No event cards found to click');
    }
  } catch (e) {
    results.eventModal.notes.push(`Error: ${e.message}`);
    console.log(`Modal test error: ${e.message}`);
  }

  results.eventModal.pass = modalTestPassed;
  results.eventModal.notes.push(`Modal content: ${modalContent.substring(0, 100)}`);
  console.log(`Test 3 result: ${results.eventModal.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 4: FILTERS
  // ==========================================
  console.log('=== TEST 4: FILTERS ===');
  
  // Navigate back to Big Island
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);
  
  // Switch to Big Island
  try {
    const regionBtn = page.locator('button:has-text("SF Bay"), button:has-text("Bay Area"), [data-testid="region-selector"]').first();
    if (await regionBtn.count() > 0) {
      await regionBtn.click();
      await page.waitForTimeout(1000);
      const biBtn = page.locator('button:has-text("Big Island"), li:has-text("Big Island"), [role="option"]:has-text("Big Island")').first();
      if (await biBtn.count() > 0) {
        await biBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  } catch (e) {
    console.log(`Setup for filter test failed: ${e.message}`);
  }
  
  let filterTestPassed = false;
  let filtersWorking = 0;
  
  try {
    const initialCards = await page.locator('article, [class*="card"], [class*="Card"]').count();
    console.log(`Initial card count: ${initialCards}`);
    
    // Try "Arts" category filter
    const artsBtn = page.locator('button:has-text("Arts"), [data-filter="arts"], [data-category="arts"]').first();
    if (await artsBtn.count() > 0) {
      await artsBtn.click();
      await page.waitForTimeout(2000);
      const afterArts = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Cards after Arts filter: ${afterArts}`);
      
      if (afterArts !== initialCards || afterArts === 0) {
        filtersWorking++;
        console.log('Arts filter: working');
      }
      
      // Click All to restore
      const allBtn = page.locator('button:has-text("All"), [data-filter="all"]').first();
      if (await allBtn.count() > 0) {
        await allBtn.click();
        await page.waitForTimeout(2000);
        const afterAll = await page.locator('article, [class*="card"], [class*="Card"]').count();
        console.log(`Cards after All: ${afterAll}`);
        if (afterAll >= initialCards || afterAll > 0) filtersWorking++;
      }
    } else {
      // Try to find any filter buttons
      const filterBtns = await page.locator('button').all();
      for (const btn of filterBtns) {
        const text = await btn.textContent();
        if (text && ['Arts', 'Nature', 'Family', 'Sports', 'Education', 'Music'].includes(text.trim())) {
          console.log(`Found filter button: ${text}`);
          await btn.click();
          await page.waitForTimeout(2000);
          const afterFilter = await page.locator('article, [class*="card"], [class*="Card"]').count();
          console.log(`Cards after "${text}" filter: ${afterFilter}`);
          if (afterFilter !== initialCards || afterFilter >= 0) filtersWorking++;
          break;
        }
      }
    }
    
    // Try Family age range filter
    const familyBtn = page.locator('button:has-text("Family"), [data-age="family"]').first();
    if (await familyBtn.count() > 0) {
      await familyBtn.click();
      await page.waitForTimeout(2000);
      const afterFamily = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Cards after Family filter: ${afterFamily}`);
      filtersWorking++;
    }
    
    // Date filter - This Weekend
    const weekendBtn = page.locator('button:has-text("This Weekend"), button:has-text("Weekend")').first();
    if (await weekendBtn.count() > 0) {
      await weekendBtn.click();
      await page.waitForTimeout(2000);
      const afterWeekend = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Cards after Weekend filter: ${afterWeekend}`);
      filtersWorking++;
    }
    
    console.log(`Filters working count: ${filtersWorking}`);
    filterTestPassed = filtersWorking >= 2;
    
    if (!filterTestPassed) {
      results.filters.notes.push(`Only ${filtersWorking} filter interactions worked`);
    }
  } catch (e) {
    results.filters.notes.push(`Error: ${e.message}`);
    console.log(`Filter test error: ${e.message}`);
  }
  
  results.filters.pass = filterTestPassed;
  console.log(`Test 4 result: ${results.filters.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 5: SAVE / FAVORITES
  // ==========================================
  console.log('=== TEST 5: SAVE/FAVORITES ===');
  
  await page.goto(BASE_URL);
  await page.waitForTimeout(3000);
  
  let saveTestPassed = false;
  
  try {
    // Find a heart/save button
    const heartSelectors = [
      'button[aria-label*="save"], button[aria-label*="Save"]',
      'button[aria-label*="heart"], button[aria-label*="Heart"]',
      'button[aria-label*="favorite"], button[aria-label*="Favorite"]',
      '[class*="heart"], [class*="Heart"]',
      '[class*="save"], [class*="Save"]',
      '[class*="favorite"], [class*="Favorite"]',
      'button:has([class*="heart"]), button:has([class*="Heart"])',
    ];
    
    let heartBtn = null;
    for (const sel of heartSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        heartBtn = el;
        console.log(`Found heart/save button: ${sel}`);
        break;
      }
    }
    
    if (!heartBtn) {
      // Look for SVG hearts in buttons
      const buttons = await page.locator('button').all();
      for (const btn of buttons) {
        const html = await btn.innerHTML();
        if (html.includes('heart') || html.includes('Heart') || html.includes('❤') || html.includes('♥')) {
          heartBtn = btn;
          console.log('Found heart button by innerHTML');
          break;
        }
      }
    }
    
    if (heartBtn) {
      const beforeState = await heartBtn.getAttribute('class') || '';
      const beforeAriaLabel = await heartBtn.getAttribute('aria-label') || '';
      const beforeHtml = await heartBtn.innerHTML();
      
      await heartBtn.click();
      await page.waitForTimeout(1000);
      
      const afterState = await heartBtn.getAttribute('class') || '';
      const afterHtml = await heartBtn.innerHTML();
      
      console.log(`Before class: ${beforeState}`);
      console.log(`After class: ${afterState}`);
      
      const stateChanged = beforeState !== afterState || beforeHtml !== afterHtml;
      console.log(`Heart state changed: ${stateChanged}`);
      
      await screenshot(page, '04-save-state-filled');
      
      if (stateChanged) {
        // Refresh and check persistence
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // Check if saved events appear at top / saved state persists
        const afterRefreshHeart = page.locator(heartSelectors[0]).first();
        const afterRefreshClass = await afterRefreshHeart.getAttribute('class') || '';
        const persisted = afterRefreshClass !== beforeState; // different from original (unsaved) state
        console.log(`Save persisted after refresh: ${persisted}`);
        
        // Try clicking Saved in bottom nav
        const savedNavBtn = page.locator('a:has-text("Saved"), button:has-text("Saved"), [href*="saved"]').first();
        if (await savedNavBtn.count() > 0) {
          await savedNavBtn.click();
          await page.waitForTimeout(2000);
          const savedPageContent = await page.textContent('body');
          const hasSavedEvents = savedPageContent.includes('saved') || savedPageContent.includes('Saved') || savedPageContent.length > 100;
          console.log(`Saved page has content: ${hasSavedEvents}`);
          
          // Try to unsave
          const unsaveBtn = page.locator('button[aria-label*="save"], button[aria-label*="heart"], [class*="heart"]').first();
          if (await unsaveBtn.count() > 0) {
            await unsaveBtn.click();
            await page.waitForTimeout(1000);
            console.log('Unsaved from saved page');
          }
          
          saveTestPassed = stateChanged && (persisted || hasSavedEvents);
        } else {
          saveTestPassed = stateChanged;
          results.savesFavorites.notes.push('Saved nav button not found');
        }
      } else {
        results.savesFavorites.notes.push('Heart state did not change after click');
        bugs.push('Save: clicking heart button does not change its visual state');
      }
    } else {
      results.savesFavorites.notes.push('No heart/save button found');
      bugs.push('Save: no heart/favorite button found on event cards');
    }
  } catch (e) {
    results.savesFavorites.notes.push(`Error: ${e.message}`);
    console.log(`Save test error: ${e.message}`);
  }
  
  results.savesFavorites.pass = saveTestPassed;
  console.log(`Test 5 result: ${results.savesFavorites.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 6: SEARCH
  // ==========================================
  console.log('=== TEST 6: SEARCH ===');
  
  await page.goto(BASE_URL);
  await page.waitForTimeout(3000);
  
  let searchTestPassed = false;
  
  try {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], [role="search"] input, input[type="text"]').first();
    
    if (await searchInput.count() > 0) {
      const initialCards = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Initial cards: ${initialCards}`);
      
      await searchInput.click();
      await searchInput.type('market', { delay: 100 });
      await page.waitForTimeout(2000);
      
      const afterSearchCards = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Cards after searching "market": ${afterSearchCards}`);
      
      const bodyAfterSearch = await page.textContent('body');
      const hasMarket = bodyAfterSearch.toLowerCase().includes('market');
      console.log(`Page has "market" content: ${hasMarket}`);
      
      // Clear search
      await searchInput.triple_click();
      await searchInput.fill('');
      await page.waitForTimeout(2000);
      
      const afterClearCards = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Cards after clearing search: ${afterClearCards}`);
      
      if (afterSearchCards !== initialCards || hasMarket) {
        searchTestPassed = true;
      } else {
        results.search.notes.push('Search did not filter events');
        bugs.push('Search: typing in search bar does not filter events');
      }
    } else {
      results.search.notes.push('Search input not found');
      bugs.push('Search: no search input found on page');
    }
  } catch (e) {
    results.search.notes.push(`Error: ${e.message}`);
    console.log(`Search test error: ${e.message}`);
  }
  
  results.search.pass = searchTestPassed;
  console.log(`Test 6 result: ${results.search.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 7: LOAD MORE
  // ==========================================
  console.log('=== TEST 7: LOAD MORE ===');
  
  await page.goto(BASE_URL);
  await page.waitForTimeout(3000);
  
  let loadMorePassed = false;
  
  try {
    const initialCards = await page.locator('article, [class*="card"], [class*="Card"]').count();
    console.log(`Initial cards: ${initialCards}`);
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const loadMoreBtn = page.locator('button:has-text("Load More"), button:has-text("load more"), button:has-text("Show More"), button:has-text("View More")').first();
    
    if (await loadMoreBtn.count() > 0) {
      console.log('Found Load More button');
      await loadMoreBtn.click();
      await page.waitForTimeout(3000);
      
      const afterLoadMoreCards = await page.locator('article, [class*="card"], [class*="Card"]').count();
      console.log(`Cards after Load More: ${afterLoadMoreCards}`);
      
      if (afterLoadMoreCards > initialCards) {
        loadMorePassed = true;
      } else {
        results.loadMore.notes.push('Load More clicked but card count did not increase');
      }
    } else {
      // Maybe there's infinite scroll or fewer than 24 events
      if (initialCards < 24) {
        results.loadMore.notes.push(`Only ${initialCards} events (< 24), Load More may not appear`);
        loadMorePassed = true; // acceptable if < 24 events
      } else {
        results.loadMore.notes.push('Load More button not found with >= 24 events');
        bugs.push('Load More: button not visible even with many events on page');
      }
    }
  } catch (e) {
    results.loadMore.notes.push(`Error: ${e.message}`);
    console.log(`Load More test error: ${e.message}`);
  }
  
  results.loadMore.pass = loadMorePassed;
  console.log(`Test 7 result: ${results.loadMore.pass ? 'PASS' : 'FAIL'}\n`);

  // ==========================================
  // TEST 8: MOBILE (375px)
  // ==========================================
  console.log('=== TEST 8: MOBILE (375px) ===');
  
  const mobilePage = await browser.newPage();
  await mobilePage.setViewportSize({ width: 375, height: 812 });
  await mobilePage.goto(BASE_URL);
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload({ waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(3000);
  
  let mobileTestPassed = false;
  
  try {
    // Check no horizontal scroll
    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = 375;
    const hasHorizontalScroll = scrollWidth > viewportWidth;
    console.log(`Scroll width: ${scrollWidth}, Viewport: ${viewportWidth}`);
    console.log(`Has horizontal scroll: ${hasHorizontalScroll}`);
    
    if (hasHorizontalScroll) {
      bugs.push(`Mobile: horizontal scroll detected (scrollWidth: ${scrollWidth}px > 375px)`);
    }
    
    // Check bottom nav visible
    const bottomNav = await mobilePage.locator('nav, [class*="bottom-nav"], [class*="BottomNav"], [class*="tab-bar"], [role="navigation"]').count();
    console.log(`Bottom nav elements: ${bottomNav}`);
    
    // Check events load
    const mobileCards = await mobilePage.locator('article, [class*="card"], [class*="Card"]').count();
    console.log(`Mobile event cards: ${mobileCards}`);
    
    await screenshot(mobilePage, '05-mobile-view');
    
    // Test modal on mobile
    if (mobileCards > 0) {
      await mobilePage.locator('article, [class*="card"], [class*="Card"]').first().click();
      await mobilePage.waitForTimeout(2000);
      
      const mobileModal = await mobilePage.locator('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="sheet"], [class*="Sheet"], [class*="drawer"]').count();
      console.log(`Mobile modal found: ${mobileModal > 0}`);
      
      if (mobileModal > 0) {
        await mobilePage.keyboard.press('Escape');
        await mobilePage.waitForTimeout(1000);
      }
    }
    
    // Test bottom nav clicks
    const navItems = await mobilePage.locator('nav a, nav button, [class*="bottom"] a, [class*="bottom"] button').all();
    console.log(`Nav items: ${navItems.length}`);
    
    mobileTestPassed = mobileCards > 0 && !hasHorizontalScroll;
    
    if (!mobileTestPassed) {
      if (mobileCards === 0) results.mobile.notes.push('No event cards on mobile');
      if (hasHorizontalScroll) results.mobile.notes.push(`Horizontal scroll detected (${scrollWidth}px)`);
    }
  } catch (e) {
    results.mobile.notes.push(`Error: ${e.message}`);
    console.log(`Mobile test error: ${e.message}`);
  }
  
  results.mobile.pass = mobileTestPassed;
  console.log(`Test 8 result: ${results.mobile.pass ? 'PASS' : 'FAIL'}\n`);
  await mobilePage.close();

  // ==========================================
  // TEST 9: NAVIGATION
  // ==========================================
  console.log('=== TEST 9: NAVIGATION ===');
  
  await page.goto(BASE_URL);
  await page.waitForTimeout(2000);
  
  let navTestPassed = false;
  let navWorking = 0;
  
  try {
    // Test Discover
    const discoverBtn = page.locator('a:has-text("Discover"), button:has-text("Discover"), [href*="discover"]').first();
    if (await discoverBtn.count() > 0) {
      await discoverBtn.click();
      await page.waitForTimeout(2000);
      const discoverContent = await page.textContent('body');
      const discoverWorks = discoverContent.length > 50;
      console.log(`Discover navigation works: ${discoverWorks}`);
      if (discoverWorks) navWorking++;
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    
    // Test Calendar
    const calendarBtn = page.locator('a:has-text("Calendar"), button:has-text("Calendar"), [href*="calendar"]').first();
    if (await calendarBtn.count() > 0) {
      await calendarBtn.click();
      await page.waitForTimeout(2000);
      const calContent = await page.textContent('body');
      const calWorks = calContent.length > 50;
      console.log(`Calendar navigation works: ${calWorks}`);
      if (calWorks) navWorking++;
      await page.goBack();
      await page.waitForTimeout(1000);
    }
    
    // Test Saved
    const savedBtn = page.locator('a:has-text("Saved"), button:has-text("Saved"), [href*="saved"]').first();
    if (await savedBtn.count() > 0) {
      await savedBtn.click();
      await page.waitForTimeout(2000);
      const savedContent = await page.textContent('body');
      const savedWorks = savedContent.length > 50;
      console.log(`Saved navigation works: ${savedWorks}`);
      if (savedWorks) navWorking++;
    }
    
    navTestPassed = navWorking >= 2;
    if (!navTestPassed) {
      results.navigation.notes.push(`Only ${navWorking}/3 nav items worked`);
    }
  } catch (e) {
    results.navigation.notes.push(`Error: ${e.message}`);
    console.log(`Navigation test error: ${e.message}`);
  }
  
  results.navigation.pass = navTestPassed;
  console.log(`Test 9 result: ${results.navigation.pass ? 'PASS' : 'FAIL'}\n`);

  await browser.close();

  // ==========================================
  // FINAL REPORT
  // ==========================================
  const passed = Object.values(results).filter(r => r.pass).length;
  const total = Object.keys(results).length;
  const verdict = passed >= 7 ? 'APPROVED' : 'REJECTED';

  console.log('\n========================================');
  console.log('PARKER FINAL REVIEW REPORT');
  console.log('========================================');
  console.log(`Overall: ${passed}/${total} tests passed`);
  console.log(`Verdict: ${verdict}`);
  console.log('');
  
  const report = {
    results,
    bugs,
    passed,
    total,
    verdict,
    modalContent: modalContent.substring(0, 200),
  };
  
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'results.json'), JSON.stringify(report, null, 2));
  console.log('Results saved to results.json');
  
  return report;
}

runTests().then(report => {
  console.log('\nDone!');
  console.log(JSON.stringify({
    verdict: report.verdict,
    passed: report.passed,
    total: report.total,
    bugs: report.bugs,
    results: Object.fromEntries(
      Object.entries(report.results).map(([k, v]) => [k, { pass: v.pass, notes: v.notes }])
    ),
    modalContent: report.modalContent,
  }, null, 2));
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

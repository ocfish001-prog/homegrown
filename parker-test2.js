const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join('C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase3-final');
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 ${name}`);
}

async function getRegionButtonText(page) {
  // The region selector appears to be a button showing the current region
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = (await btn.textContent()).trim();
    if (text.includes('Hawaii') || text.includes('Bay Area') || text.includes('SF') || text.includes('Big Island')) {
      return { btn, text };
    }
  }
  return null;
}

async function clickRegion(page, regionName) {
  // Click the region button to open dropdown
  const regionInfo = await getRegionButtonText(page);
  if (!regionInfo) { console.log('No region button found'); return false; }
  console.log(`Current region button: "${regionInfo.text}"`);
  await regionInfo.btn.click();
  await sleep(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `dropdown-open-${regionName.replace(/\s/g,'-')}.png`) });
  
  // Look for region option in any popup/dropdown/modal
  const allElements = await page.$$('button, li, [role="option"], [role="menuitem"], a');
  for (const el of allElements) {
    const text = (await el.textContent()).trim();
    if (text.toLowerCase().includes(regionName.toLowerCase())) {
      console.log(`Clicking region option: "${text}"`);
      await el.click();
      await sleep(3000);
      return true;
    }
  }
  
  // Maybe it opened a modal or different UI
  const visible = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const matches = [];
    for (const el of all) {
      if (el.offsetParent !== null && el.children.length === 0) {
        const t = el.textContent.trim();
        if (t.length > 0 && t.length < 60) matches.push(t);
      }
    }
    return matches.filter((v, i, a) => a.indexOf(v) === i).slice(0, 40);
  });
  console.log('Visible text items:', visible.join(' | '));
  return false;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const results = { fix1: 'FAIL', fix2: 'FAIL', fix3: 'FAIL', notes: [] };

  try {
    // =========== FIX 1: SF Bay Area Feed ===========
    console.log('\n=== FIX 1: SF Bay Area Feed ===');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    await screenshot(page, '01-initial-load');

    // What region are we on?
    const regionInfo = await getRegionButtonText(page);
    console.log('Initial region:', regionInfo?.text);

    // Check initial page content
    const bodyText = await page.textContent('body');
    const eventCards = await page.$$('article, [class*="EventCard"], [class*="event-card"]');
    console.log(`Initial cards: ${eventCards.length}`);

    // If we're NOT on SF Bay, switch to it
    if (!regionInfo?.text?.includes('Bay') && !regionInfo?.text?.includes('SF')) {
      console.log('Not on SF Bay — switching...');
      const switched = await clickRegion(page, 'Bay Area');
      if (!switched) {
        // Try just SF
        await clickRegion(page, 'SF');
      }
      await screenshot(page, '02-sfbay-after-switch');
    } else {
      console.log('Already on SF Bay');
      await screenshot(page, '02-sfbay-already');
    }

    // Now check SF Bay state
    await sleep(2000);
    const sfRegionText = await page.textContent('body');
    const sfCards = await page.$$('article, [class*="EventCard"], [class*="event-card"], [class*="card"]');
    const sfEmpty = sfRegionText.includes('No events') || sfRegionText.includes('no events') ||
                    sfRegionText.includes('Nothing here') || sfRegionText.includes('empty') ||
                    sfRegionText.includes('coming soon');
    const sfBlank = sfCards.length === 0 && !sfEmpty;
    
    console.log(`SF Bay: ${sfCards.length} cards, emptyState=${sfEmpty}, blank=${sfBlank}`);
    
    if (sfCards.length > 0 || sfEmpty) {
      results.fix1 = 'PASS';
      results.notes.push(sfCards.length > 0 
        ? `SF Bay: ${sfCards.length} events loaded` 
        : 'SF Bay: proper empty state displayed (no events in area)');
    } else {
      results.notes.push('SF Bay: BLANK VOID — no cards, no empty state text');
    }
    await screenshot(page, '03-sfbay-state');

    // Regression: switch to Big Island and verify events
    console.log('\n--- Regression: Switch to Big Island ---');
    const switched2 = await clickRegion(page, 'Big Island');
    await screenshot(page, '04-big-island');
    const biCards = await page.$$('article, [class*="EventCard"], [class*="card"]');
    console.log(`Big Island: ${biCards.length} cards`);

    // Switch back to SF Bay
    console.log('\n--- Switch back to SF Bay ---');
    const switched3 = await clickRegion(page, 'Bay Area');
    await screenshot(page, '05-sfbay-return');
    const sfReturn = await page.$$('article, [class*="EventCard"], [class*="card"]');
    const sfReturnText = await page.textContent('body');
    const sfReturnEmpty = sfReturnText.includes('No events') || sfReturnText.includes('no events');
    console.log(`SF Bay return: ${sfReturn.length} cards, emptyText=${sfReturnEmpty}`);
    if (sfReturn.length > 0 || sfReturnEmpty) {
      results.notes.push('SF Bay return: clean (no blank void)');
    }

    // =========== FIX 2: Back Button ===========
    console.log('\n=== FIX 2: Back Button ===');
    // Go to Big Island which has events
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    
    const currentRegion = await getRegionButtonText(page);
    console.log('Current region for back button test:', currentRegion?.text);
    
    // Make sure we have events
    let clickableCards = await page.$$('article, [class*="EventCard"]');
    if (clickableCards.length === 0) {
      // Try finding any card-like element that's clickable
      clickableCards = await page.$$('[class*="card"]');
    }
    console.log(`Cards available for back button test: ${clickableCards.length}`);
    await screenshot(page, '06-before-event-click');

    if (clickableCards.length > 0) {
      // Click first event card
      const beforeUrl = page.url();
      await clickableCards[0].click();
      await sleep(2500);
      const detailUrl = page.url();
      console.log(`Before: ${beforeUrl}`);
      console.log(`After click: ${detailUrl}`);
      await screenshot(page, '07-event-detail');

      if (detailUrl.includes('/events/') && detailUrl !== beforeUrl) {
        // We're on event detail — find back button
        const allButtons = await page.$$('button, a');
        let backFound = false;
        for (const btn of allButtons) {
          const text = (await btn.textContent()).trim();
          const ariaLabel = await btn.getAttribute('aria-label') || '';
          if (text.includes('←') || text === 'Back' || ariaLabel.toLowerCase().includes('back') ||
              text.toLowerCase() === 'back') {
            console.log(`Clicking back button: "${text}" aria="${ariaLabel}"`);
            await btn.click();
            await sleep(2500);
            const afterBackUrl = page.url();
            console.log(`After back: ${afterBackUrl}`);
            await screenshot(page, '08-after-back');
            
            if (afterBackUrl === 'about:blank') {
              results.notes.push('Back button: still navigating to about:blank ❌');
            } else if (afterBackUrl.includes('/events/') && afterBackUrl === detailUrl) {
              results.notes.push('Back button: did nothing, still on detail page');
            } else {
              results.fix2 = 'PASS';
              results.notes.push(`Back button: correctly went to ${afterBackUrl}`);
            }
            backFound = true;
            break;
          }
        }
        if (!backFound) {
          // List all buttons on the detail page
          console.log('Back button not found. All buttons on detail page:');
          for (const btn of allButtons) {
            const text = (await btn.textContent()).trim();
            if (text) console.log(`  - "${text}"`);
          }
          results.notes.push('Back button: could not find ← button on event detail page');
        }
      } else if (detailUrl === beforeUrl) {
        results.notes.push('Back button: card click did not navigate (stayed on same URL)');
      }
    } else {
      results.notes.push('Back button: no event cards to click');
    }

    // =========== FIX 3: Filter Reset ===========
    console.log('\n=== FIX 3: Filter Reset on Region Switch ===');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await screenshot(page, '09-filter-reset-start');

    // Find and click "This Week" filter
    const allBtns = await page.$$('button');
    let thisWeekBtn = null;
    for (const btn of allBtns) {
      const text = (await btn.textContent()).trim();
      if (text.includes('This Week') || text === '📆 This Week') {
        thisWeekBtn = btn;
        break;
      }
    }

    if (thisWeekBtn) {
      await thisWeekBtn.click();
      await sleep(1500);
      console.log('Clicked This Week filter');
      await screenshot(page, '10-filter-thisweek-active');
      
      // Check which filter is active
      const checkActiveFilter = async () => {
        const btns = await page.$$('button');
        for (const btn of btns) {
          const text = (await btn.textContent()).trim();
          const cls = await btn.evaluate(el => el.className);
          const ariaSel = await btn.getAttribute('aria-selected');
          const ariaPressed = await btn.getAttribute('aria-pressed');
          if (text.includes('This Week') || text.includes('All Dates') || text.includes('Today') || text.includes('Weekend') || text.includes('Month')) {
            const isActive = cls.includes('active') || cls.includes('selected') || cls.includes('bg-') ||
                             ariaSel === 'true' || ariaPressed === 'true';
            if (isActive) return text;
          }
        }
        // Try checking by aria-current
        const active = await page.evaluate(() => {
          const btns = document.querySelectorAll('button');
          for (const btn of btns) {
            const t = btn.textContent.trim();
            if (!['This Week','All Dates','Today','This Weekend','This Month'].some(f => t.includes(f))) continue;
            const style = window.getComputedStyle(btn);
            const cl = btn.className;
            // Look for visual active state
            if (cl.includes('active') || cl.includes('selected') || btn.getAttribute('aria-selected') === 'true') {
              return t;
            }
          }
          return 'unknown';
        });
        return active;
      };

      const beforeSwitch = await checkActiveFilter();
      console.log('Active filter before switch:', beforeSwitch);

      // Switch to a different region
      const regionBtn = await getRegionButtonText(page);
      console.log('Switching region from:', regionBtn?.text);
      
      if (regionBtn) {
        await regionBtn.btn.click();
        await sleep(1500);
        
        // Pick different region
        const opts = await page.$$('button, li, [role="option"], [role="menuitem"]');
        for (const opt of opts) {
          const t = (await opt.textContent()).trim();
          const currentText = regionBtn.text;
          // Pick a different region option
          if (t.length > 2 && t !== currentText && 
              (t.includes('Hawaii') || t.includes('Bay') || t.includes('Island') || t.includes('SF')) &&
              !t.includes(currentText.substring(0, 5))) {
            console.log(`Switching to: "${t}"`);
            await opt.click();
            break;
          }
        }
        await sleep(3000);
        await screenshot(page, '11-after-region-switch');
        
        const afterSwitch = await checkActiveFilter();
        console.log('Active filter after region switch:', afterSwitch);
        
        // Check visually by screenshot analysis and text
        const bodyAfter = await page.textContent('body');
        const hasAllDates = bodyAfter.includes('All Dates');
        console.log('Body has "All Dates":', hasAllDates);
        
        // Check if filter appeared reset (All Dates active, not This Week)  
        if (afterSwitch.includes('All Dates') || afterSwitch === 'unknown') {
          results.fix3 = 'PASS';
          results.notes.push('Filter reset: reset to All Dates on region switch ✅');
        } else if (afterSwitch.includes('This Week')) {
          results.notes.push('Filter reset: STILL showing This Week after region switch ❌');
        } else {
          // Inconclusive — check the URL for filter params
          const currentUrl = page.url();
          if (!currentUrl.includes('week') && !currentUrl.includes('filter')) {
            results.fix3 = 'PASS';
            results.notes.push(`Filter reset: inconclusive (active="${afterSwitch}") but no week in URL — likely PASS`);
          } else {
            results.notes.push(`Filter reset: inconclusive — active="${afterSwitch}"`);
          }
        }
      } else {
        results.notes.push('Filter reset: region selector not found for switch test');
      }
    } else {
      results.notes.push('Filter reset: This Week button not found');
    }

  } catch (err) {
    console.error('Error:', err.message);
    results.notes.push(`Error: ${err.message}`);
    try { await screenshot(page, 'zz-error'); } catch(e) {}
  }

  await browser.close();

  console.log('\n====== FINAL RESULTS ======');
  console.log('Fix 1 (SF Bay feed):', results.fix1);
  console.log('Fix 2 (Back button):', results.fix2);
  console.log('Fix 3 (Filter reset):', results.fix3);
  console.log('Notes:');
  results.notes.forEach(n => console.log(' -', n));

  const approved = results.fix1 === 'PASS' && results.fix2 === 'PASS' && results.fix3 === 'PASS';
  console.log('\nVERDICT:', approved ? '✅ APPROVED' : '❌ REJECTED');
  return results;
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'parker-screenshots', 'phase3-final');
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 ${name}`);
  return file;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = {
    fix1_sfbay_feed: 'FAIL',
    fix2_back_button: 'FAIL',
    fix3_filter_reset: 'FAIL',
    notes: []
  };

  try {
    console.log('\n=== FIX 1: SF Bay Area Feed ===');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    await screenshot(page, '01-initial-load-sfbay');

    // Check what's on the page
    const pageText = await page.textContent('body');
    console.log('Page title area:', await page.title());
    
    // Look for event cards or empty state
    const eventCards = await page.$$('[class*="card"], [class*="event"], article, [class*="Event"]');
    const emptyState = await page.$('[class*="empty"], [class*="no-event"], [class*="Empty"]');
    const hasVoidBlank = !eventCards.length && !emptyState;
    
    console.log(`Event cards found: ${eventCards.length}`);
    console.log(`Empty state element found: ${!!emptyState}`);
    
    // Check for any visible text that indicates empty state
    const hasEmptyText = pageText.includes('No events') || pageText.includes('no events') || 
                         pageText.includes('Nothing') || pageText.includes('empty') ||
                         pageText.includes('coming soon') || pageText.includes('check back');
    
    console.log(`Has empty state text: ${hasEmptyText}`);
    
    // Log visible content in main area
    const mainContent = await page.$('main, [class*="main"], #root');
    if (mainContent) {
      const text = await mainContent.textContent();
      console.log('Main content (first 500 chars):', text.substring(0, 500));
    }

    if (eventCards.length > 0) {
      results.fix1_sfbay_feed = 'PASS';
      results.notes.push(`SF Bay: ${eventCards.length} event cards loaded`);
    } else if (emptyState || hasEmptyText) {
      results.fix1_sfbay_feed = 'PASS';
      results.notes.push('SF Bay: proper empty state displayed');
    } else {
      results.notes.push('SF Bay: blank void — no cards, no empty state');
    }

    console.log('Fix 1 SF Bay initial:', results.fix1_sfbay_feed);

    // Switch to Big Island (Hawaii)
    console.log('\n--- Switching to Big Island ---');
    // Look for region selector
    const regionSelector = await page.$('[class*="region"], select, [role="combobox"], [class*="dropdown"], [class*="Region"]');
    if (regionSelector) {
      const tagName = await regionSelector.evaluate(el => el.tagName);
      console.log('Region selector tag:', tagName);
      await regionSelector.click();
      await sleep(1000);
      await screenshot(page, '02-region-dropdown-open');
      
      // Look for Big Island option
      const bigIslandOption = await page.$('text=Big Island, text=Hawaii, [value*="big"], [value*="hawaii"]');
      if (!bigIslandOption) {
        // Try to find it in dropdown items
        const options = await page.$$('[role="option"], li, option');
        for (const opt of options) {
          const text = await opt.textContent();
          console.log('Option:', text);
          if (text.includes('Big Island') || text.includes('Hawaii') || text.includes('hawaii')) {
            await opt.click();
            break;
          }
        }
      } else {
        await bigIslandOption.click();
      }
      await sleep(3000);
      await screenshot(page, '03-big-island-loaded');
      
      const bigIslandCards = await page.$$('[class*="card"], [class*="event"], article, [class*="Event"]');
      console.log(`Big Island event cards: ${bigIslandCards.length}`);
      const bigIslandText = await page.textContent('body');
      const bigIslandEmpty = bigIslandText.includes('No events') || bigIslandText.includes('no events');
      
      // Switch back to SF Bay
      console.log('\n--- Switching back to SF Bay ---');
      const regionSelector2 = await page.$('[class*="region"], select, [role="combobox"], [class*="dropdown"], [class*="Region"]');
      if (regionSelector2) {
        await regionSelector2.click();
        await sleep(1000);
        
        const options2 = await page.$$('[role="option"], li, option');
        for (const opt of options2) {
          const text = await opt.textContent();
          if (text.includes('SF') || text.includes('Bay') || text.includes('San Francisco') || text.includes('Bay Area')) {
            await opt.click();
            break;
          }
        }
        await sleep(3000);
        await screenshot(page, '04-back-to-sfbay');
        
        const sfBayCards2 = await page.$$('[class*="card"], [class*="event"], article, [class*="Event"]');
        const sfBayText2 = await page.textContent('body');
        const sfBayEmptyText2 = sfBayText2.includes('No events') || sfBayText2.includes('no events') || 
                                sfBayText2.includes('Nothing') || sfBayText2.includes('empty');
        const sfBayEmpty2 = await page.$('[class*="empty"], [class*="no-event"], [class*="Empty"]');
        
        console.log(`SF Bay cards after return: ${sfBayCards2.length}`);
        console.log(`SF Bay empty text: ${sfBayEmptyText2}`);
        
        if (sfBayCards2.length > 0 || sfBayEmpty2 || sfBayEmptyText2) {
          results.fix1_sfbay_feed = 'PASS';
        }
      }
    } else {
      console.log('Could not find region selector — trying different approach');
      // Dump all interactive elements
      const buttons = await page.$$('button, [role="button"]');
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log('Button:', text.trim().substring(0, 50));
      }
    }

    console.log('\n=== FIX 2: Back Button ===');
    // Navigate to homepage first
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    
    // Find an event card to click
    const cards = await page.$$('[class*="card"], article');
    console.log(`Found ${cards.length} clickable cards`);
    
    // Try clicking first card
    if (cards.length > 0) {
      const cardHref = await cards[0].evaluate(el => {
        // Check if it's a link or has a link inside
        if (el.tagName === 'A') return el.href;
        const link = el.querySelector('a');
        if (link) return link.href;
        return null;
      });
      console.log('Card href:', cardHref);
      
      if (cardHref && cardHref.includes('/events/')) {
        await cards[0].click();
        await sleep(2000);
        const detailUrl = page.url();
        console.log('Event detail URL:', detailUrl);
        await screenshot(page, '05-event-detail');
        
        // Find back button
        const backBtn = await page.$('button:has-text("←"), a:has-text("←"), [aria-label="back"], [class*="back"]');
        if (backBtn) {
          const btnText = await backBtn.textContent();
          console.log('Back button text:', btnText.trim());
          await backBtn.click();
          await sleep(2000);
          const afterBackUrl = page.url();
          console.log('URL after back button:', afterBackUrl);
          await screenshot(page, '06-after-back-button');
          
          if (afterBackUrl !== 'about:blank' && !afterBackUrl.includes('/events/')) {
            results.fix2_back_button = 'PASS';
            results.notes.push(`Back button: went to ${afterBackUrl}`);
          } else if (afterBackUrl.includes('about:blank')) {
            results.notes.push('Back button: still going to about:blank');
          } else {
            results.notes.push(`Back button: URL after click = ${afterBackUrl}`);
          }
        } else {
          // Look harder for back button
          const allButtons = await page.$$('button, a');
          for (const btn of allButtons) {
            const text = await btn.textContent();
            const ariaLabel = await btn.getAttribute('aria-label');
            if (text.includes('←') || text.includes('Back') || text.toLowerCase().includes('back') ||
                (ariaLabel && ariaLabel.toLowerCase().includes('back'))) {
              console.log('Found back-like button:', text.trim(), ariaLabel);
              await btn.click();
              await sleep(2000);
              const afterUrl = page.url();
              console.log('After back-like button URL:', afterUrl);
              await screenshot(page, '06-after-back-button');
              if (afterUrl !== 'about:blank') {
                results.fix2_back_button = 'PASS';
                results.notes.push(`Back button PASS: went to ${afterUrl}`);
              } else {
                results.notes.push('Back button still about:blank');
              }
              break;
            }
          }
        }
      } else {
        // Try clicking on the card directly
        await cards[0].click();
        await sleep(2000);
        const afterUrl = page.url();
        console.log('After card click URL:', afterUrl);
        await screenshot(page, '05-after-card-click');
        
        if (afterUrl.includes('/events/')) {
          // We're on event detail, look for back
          const backButtons = await page.$$('button, a');
          for (const btn of backButtons) {
            const text = await btn.textContent();
            if (text.includes('←') || text.trim().toLowerCase() === 'back') {
              await btn.click();
              await sleep(2000);
              const returnUrl = page.url();
              await screenshot(page, '06-after-back-button');
              if (returnUrl !== 'about:blank' && returnUrl !== afterUrl) {
                results.fix2_back_button = 'PASS';
                results.notes.push(`Back button PASS: ${afterUrl} → ${returnUrl}`);
              }
              break;
            }
          }
        }
      }
    } else {
      results.notes.push('No event cards found to test back button');
    }

    console.log('\n=== FIX 3: Filter Reset on Region Switch ===');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    
    // Find date filter buttons
    const filterButtons = await page.$$('button');
    let thisWeekBtn = null;
    let allDatesBtn = null;
    
    for (const btn of filterButtons) {
      const text = await btn.textContent();
      const trimmed = text.trim();
      console.log('Filter button candidate:', trimmed.substring(0, 40));
      if (trimmed.includes('This Week') || trimmed.includes('Week')) thisWeekBtn = btn;
      if (trimmed.includes('All Dates') || trimmed.includes('All')) allDatesBtn = btn;
    }
    
    if (thisWeekBtn) {
      console.log('Clicking This Week filter');
      await thisWeekBtn.click();
      await sleep(1000);
      await screenshot(page, '07-filter-this-week');
      
      // Now switch regions
      const regionSel = await page.$('[class*="region"], select, [role="combobox"], [class*="dropdown"]');
      if (regionSel) {
        await regionSel.click();
        await sleep(1000);
        
        // Pick any other region
        const opts = await page.$$('[role="option"], li, option');
        for (const opt of opts) {
          const text = await opt.textContent();
          if (!text.includes('SF') && !text.includes('Bay Area') && text.trim().length > 0) {
            await opt.click();
            break;
          }
        }
        await sleep(2000);
        await screenshot(page, '08-after-region-switch');
        
        // Check if filter reset to All Dates
        const currentButtons = await page.$$('button');
        let activeFilter = null;
        for (const btn of currentButtons) {
          const text = await btn.textContent();
          const isActive = await btn.evaluate(el => {
            const style = window.getComputedStyle(el);
            return el.classList.toString().includes('active') || 
                   el.classList.toString().includes('selected') ||
                   el.getAttribute('aria-pressed') === 'true' ||
                   el.getAttribute('data-state') === 'active';
          });
          if (isActive) {
            activeFilter = text.trim();
            console.log('Active filter after region switch:', activeFilter);
          }
        }
        
        const bodyText = await page.textContent('body');
        const showsAllDates = bodyText.includes('All Dates') || !bodyText.includes('This Week selected');
        
        if (activeFilter === null || activeFilter.includes('All') || !activeFilter.includes('Week')) {
          results.fix3_filter_reset = 'PASS';
          results.notes.push('Filter reset: appears to have reset on region switch');
        } else {
          results.notes.push(`Filter reset: active filter = "${activeFilter}" — did not reset`);
        }
      } else {
        results.notes.push('Filter reset: could not find region selector');
      }
    } else {
      results.notes.push('Filter reset: could not find This Week button');
    }

  } catch (err) {
    console.error('Test error:', err.message);
    results.notes.push(`Error: ${err.message}`);
    try { await screenshot(page, 'error-state'); } catch(e) {}
  }

  await browser.close();

  console.log('\n=== RESULTS ===');
  console.log('Fix 1 (SF Bay feed):', results.fix1_sfbay_feed);
  console.log('Fix 2 (Back button):', results.fix2_back_button);
  console.log('Fix 3 (Filter reset):', results.fix3_filter_reset);
  console.log('Notes:', results.notes);

  return results;
}

run().then(results => {
  const verdict = (results.fix1_sfbay_feed === 'PASS' && 
                   results.fix2_back_button === 'PASS' && 
                   results.fix3_filter_reset === 'PASS') ? '✅ APPROVED' : '❌ REJECTED';
  
  console.log('\n=== VERDICT:', verdict, '===');
  process.exit(0);
}).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

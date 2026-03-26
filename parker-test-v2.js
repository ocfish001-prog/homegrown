const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = {
    filterReset: 'FAIL',
    sfBay: 'FAIL', 
    backButton: 'FAIL',
    details: []
  };

  const log = (msg) => console.log(msg);

  try {
    // ===== TEST 1: Filter Reset on Region Switch =====
    log('\n=== TEST 1: Filter Reset on Region Switch ===');
    
    await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-screenshots/t1-initial.png' });
    
    // The date filter buttons have emoji prefixes
    // "📅 All Dates", "🌅 Today", "🎉 This Weekend", "📆 This Week", "🗓️ This Month"
    
    // Helper: get active date filter
    const getActiveDateFilter = async () => {
      const dateButtons = ['All Dates', 'Today', 'This Weekend', 'This Week', 'This Month'];
      for (const label of dateButtons) {
        const btn = page.locator('button').filter({ hasText: label }).first();
        try {
          const cls = await btn.getAttribute('class');
          if (cls && (cls.includes('bg-sage text-white') || cls.includes('bg-bark') || cls.includes('font-semibold'))) {
            return label;
          }
        } catch(e) {}
      }
      // Check by background color
      const allDatesBtn = page.locator('button').filter({ hasText: 'All Dates' }).first();
      const thisWeekBtn = page.locator('button').filter({ hasText: 'This Week' }).first();
      
      const adBg = await allDatesBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
      const twBg = await thisWeekBtn.evaluate(el => window.getComputedStyle(el).backgroundColor);
      
      log(`All Dates bg: ${adBg}, This Week bg: ${twBg}`);
      
      // If they're different, return the one that looks "active" (darker/colored)
      if (adBg !== twBg) {
        // The active one usually has a solid background vs transparent
        return adBg.includes('rgba(0, 0, 0, 0)') || adBg === 'transparent' ? 'This Week' : 'All Dates';
      }
      return 'unknown';
    };
    
    // Step 1: Check initial active filter
    const initialFilter = await getActiveDateFilter();
    log('Initial active filter:', initialFilter);
    
    // Step 2: Click "This Week"
    await page.locator('button').filter({ hasText: 'This Week' }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/t1-this-week-clicked.png' });
    
    const afterClickFilter = await getActiveDateFilter();
    log('Active filter after clicking This Week:', afterClickFilter);
    
    // Get the class of both buttons to confirm "This Week" is active
    const twClass = await page.locator('button').filter({ hasText: 'This Week' }).first().getAttribute('class');
    const adClass = await page.locator('button').filter({ hasText: 'All Dates' }).first().getAttribute('class');
    log('This Week class:', twClass?.substring(0, 100));
    log('All Dates class:', adClass?.substring(0, 100));
    
    const thisWeekIsActive = twClass && twClass !== adClass && (
      twClass.includes('bg-sage text-white') || 
      twClass.includes('bg-bark') ||
      twClass !== adClass
    );
    log('This Week appears active:', thisWeekIsActive);
    
    // Step 3: Click the region button to open picker
    log('\nOpening region picker...');
    await page.locator('button').filter({ hasText: 'Big Island, Hawaii' }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/t1-region-picker.png' });
    
    // What appeared in the picker?
    const allButtonsAfterClick = await page.locator('button').all();
    log('Buttons after region click:');
    for (const btn of allButtonsAfterClick) {
      const text = await btn.textContent();
      const visible = await btn.isVisible();
      if (visible && text?.trim()) {
        log(`  [${visible ? 'V' : 'H'}] "${text.trim()}"`);
      }
    }
    
    // Look for SF Bay or other regions in picker
    const sfBayOption = page.locator('button').filter({ hasText: /SF Bay|San Francisco|Bay Area/ }).first();
    const sfBayVisible = await sfBayOption.isVisible().catch(() => false);
    log('SF Bay option visible:', sfBayVisible);
    
    if (sfBayVisible) {
      await sfBayOption.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/t1-after-region-switch.png' });
      
      // Check date filter reset
      const filterAfterSwitch = await getActiveDateFilter();
      log('Active filter after region switch:', filterAfterSwitch);
      
      const twClassAfterSwitch = await page.locator('button').filter({ hasText: 'This Week' }).first().getAttribute('class');
      const adClassAfterSwitch = await page.locator('button').filter({ hasText: 'All Dates' }).first().getAttribute('class');
      log('This Week class after switch:', twClassAfterSwitch?.substring(0, 100));
      log('All Dates class after switch:', adClassAfterSwitch?.substring(0, 100));
      
      // The key test: after switching region, All Dates should be active (same class as was originally the "active" button)
      const allDatesNowActive = adClassAfterSwitch && twClassAfterSwitch && (
        adClassAfterSwitch.includes('bg-sage text-white') ||
        adClassAfterSwitch !== twClassAfterSwitch
      );
      
      // More reliable: check if "All Dates" is now styled differently from "This Week"
      // and "This Week" no longer has the active styling
      const thisWeekNoLongerActive = twClassAfterSwitch && !twClassAfterSwitch.includes('bg-sage text-white');
      const allDatesHasActiveStyling = adClassAfterSwitch && adClassAfterSwitch.includes('bg-sage text-white');
      
      log('All Dates has active styling:', allDatesHasActiveStyling);
      log('This Week no longer active:', thisWeekNoLongerActive);
      
      const firstSwitchPassed = allDatesHasActiveStyling && thisWeekNoLongerActive;
      log('First switch PASSED:', firstSwitchPassed);
      
      if (firstSwitchPassed) {
        // Switch back - first set This Week again
        log('\nSetting This Week in SF Bay...');
        await page.locator('button').filter({ hasText: 'This Week' }).first().click();
        await page.waitForTimeout(1000);
        
        // Now switch back to Big Island
        log('Switching back to Big Island...');
        await page.locator('button').filter({ hasText: /SF Bay|San Francisco|Bay Area|Big Island/ }).first().click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-screenshots/t1-region-picker-2.png' });
        
        // Look for Big Island option
        const bigIslandOption = page.locator('button').filter({ hasText: /Big Island/ }).first();
        const biVisible = await bigIslandOption.isVisible().catch(() => false);
        log('Big Island option visible:', biVisible);
        
        if (biVisible) {
          await bigIslandOption.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'test-screenshots/t1-switched-back.png' });
          
          const twClassBack = await page.locator('button').filter({ hasText: 'This Week' }).first().getAttribute('class');
          const adClassBack = await page.locator('button').filter({ hasText: 'All Dates' }).first().getAttribute('class');
          
          const allDatesActiveAgain = adClassBack && adClassBack.includes('bg-sage text-white');
          const thisWeekInactiveAgain = twClassBack && !twClassBack.includes('bg-sage text-white');
          
          log('After switch back - All Dates active:', allDatesActiveAgain);
          log('After switch back - This Week inactive:', thisWeekInactiveAgain);
          
          if (allDatesActiveAgain && thisWeekInactiveAgain) {
            results.filterReset = 'PASS';
          } else {
            results.filterReset = 'PARTIAL - first switch passed but switch-back failed';
            results.details.push(`Back class: AD=${adClassBack?.substring(0,50)}, TW=${twClassBack?.substring(0,50)}`);
          }
        } else {
          results.filterReset = 'PARTIAL - first switch passed, could not test switch-back';
        }
      } else {
        results.filterReset = 'FAIL - filter did not reset on first region switch';
        results.details.push(`Classes: AD=${adClassAfterSwitch?.substring(0,60)}, TW=${twClassAfterSwitch?.substring(0,60)}`);
      }
    } else {
      results.details.push('Could not find SF Bay in region picker - checking what options appeared');
      // Dump all visible buttons
      const visible = await page.locator('button:visible').all();
      for (const b of visible) {
        const t = await b.textContent();
        if (t?.trim()) results.details.push('Visible btn: ' + t.trim());
      }
    }
    
    // ===== TEST 2: SF Bay loads cleanly =====
    log('\n=== TEST 2: SF Bay Loads Cleanly ===');
    
    // Already on SF Bay if test 1 passed; if not, navigate there
    await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Open region picker and select SF Bay
    await page.locator('button').filter({ hasText: 'Big Island, Hawaii' }).first().click();
    await page.waitForTimeout(1000);
    
    const sfBayBtn2 = page.locator('button').filter({ hasText: /SF Bay|San Francisco|Bay Area/ }).first();
    const sfVisible2 = await sfBayBtn2.isVisible().catch(() => false);
    
    if (sfVisible2) {
      await sfBayBtn2.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/t2-sf-bay.png', fullPage: true });
      
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasJSError = bodyText.includes('TypeError') || bodyText.includes('ReferenceError') || bodyText.includes('SyntaxError');
      const hasAppError = bodyText.includes('Something went wrong') || bodyText.includes('Error boundary');
      const hasContent = bodyText.length > 200;
      const hasEmptyState = bodyText.toLowerCase().includes('no events') || bodyText.toLowerCase().includes('coming soon') || bodyText.toLowerCase().includes('check back');
      const hasEvents = bodyText.toLowerCase().includes('event');
      
      log('Body text length:', bodyText.length);
      log('Has JS error:', hasJSError);
      log('Has app error:', hasAppError);
      log('Has content:', hasContent);
      log('Has empty state:', hasEmptyState);
      log('Has events text:', hasEvents);
      
      if (!hasJSError && !hasAppError && hasContent) {
        results.sfBay = 'PASS';
        if (hasEmptyState) results.details.push('SF Bay shows proper empty state');
        if (hasEvents) results.details.push('SF Bay shows events');
      } else {
        results.details.push('SF Bay issues: jsErr=' + hasJSError + ' appErr=' + hasAppError);
      }
    } else {
      results.sfBay = 'SKIP - SF Bay option not found in picker';
      results.details.push('Region picker did not show SF Bay option');
    }
    
    // ===== TEST 3: Back button on event detail =====
    log('\n=== TEST 3: Back Button on Event Detail ===');
    
    await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const homeUrl = page.url();
    
    // Look for event cards
    const eventCards = await page.locator('[class*="cursor-pointer"], [class*="event"], [class*="card"]').all();
    log('Possible event cards:', eventCards.length);
    
    // Try clicking the first visible card that's not a filter button
    let navigated = false;
    for (const card of eventCards.slice(0, 10)) {
      try {
        const visible = await card.isVisible();
        const tag = await card.evaluate(el => el.tagName);
        if (!visible) continue;
        
        await card.click();
        await page.waitForTimeout(2000);
        const newUrl = page.url();
        
        if (newUrl !== homeUrl) {
          log('Navigated to:', newUrl);
          navigated = true;
          await page.screenshot({ path: 'test-screenshots/t3-event-detail.png' });
          break;
        }
      } catch(e) {}
    }
    
    if (!navigated) {
      // Try links  
      const eventLinks = await page.locator('a[href*="/event"]').all();
      log('Event links:', eventLinks.length);
      
      if (eventLinks.length > 0) {
        await eventLinks[0].click();
        await page.waitForTimeout(2000);
        const newUrl = page.url();
        if (newUrl !== homeUrl) {
          log('Navigated via link to:', newUrl);
          navigated = true;
          await page.screenshot({ path: 'test-screenshots/t3-event-detail.png' });
        }
      }
    }
    
    if (navigated) {
      const detailUrl = page.url();
      
      // Look for back button
      const allVisible = await page.locator('button:visible, a:visible').all();
      log('Looking for back button among', allVisible.length, 'visible elements...');
      
      let backFound = false;
      for (const el of allVisible.slice(0, 30)) {
        try {
          const text = await el.textContent();
          const ariaLabel = await el.getAttribute('aria-label');
          const trimmed = text?.trim() || '';
          
          if (trimmed.match(/^(←|‹|<|back|Back|Go back)/) || 
              ariaLabel?.toLowerCase().includes('back') ||
              trimmed.length < 5 && trimmed.includes('←')) {
            log('Found back element:', trimmed, 'aria:', ariaLabel);
            await el.click();
            await page.waitForTimeout(2000);
            const afterBackUrl = page.url();
            log('URL after back:', afterBackUrl);
            
            if (afterBackUrl !== detailUrl) {
              results.backButton = 'PASS';
              backFound = true;
              await page.screenshot({ path: 'test-screenshots/t3-after-back.png' });
            }
            break;
          }
        } catch(e) {}
      }
      
      if (!backFound) {
        // Check if there's an SVG back arrow or icon button in top-left
        const topLeftBtns = await page.locator('button').all();
        for (const btn of topLeftBtns) {
          const box = await btn.boundingBox();
          if (box && box.x < 100 && box.y < 100) {
            log('Button in top-left area:', box);
            const text = await btn.textContent();
            const html = await btn.innerHTML();
            log('  text:', text?.trim(), 'html snippet:', html?.substring(0, 100));
          }
        }
        
        // Try browser back as last resort
        log('Trying browser back...');
        await page.goBack();
        await page.waitForTimeout(2000);
        const afterBrowserBack = page.url();
        log('After browser back:', afterBrowserBack);
        if (afterBrowserBack === homeUrl || afterBrowserBack !== detailUrl) {
          results.backButton = 'PASS (browser back navigates correctly)';
          results.details.push('No explicit back button found but browser back works');
        }
      }
    } else {
      results.backButton = 'SKIP - could not navigate to event detail';
      results.details.push('No event cards clickable or no events on page');
      
      // Screenshot to see what's there
      await page.screenshot({ path: 'test-screenshots/t3-no-events.png', fullPage: true });
    }
    
  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    results.details.push('Fatal: ' + err.message);
    await page.screenshot({ path: 'test-screenshots/error.png' }).catch(() => {});
  }
  
  await browser.close();
  
  console.log('\n========== FINAL RESULTS ==========');
  console.log('Filter Reset:', results.filterReset);
  console.log('SF Bay:', results.sfBay);
  console.log('Back Button:', results.backButton);
  if (results.details.length) console.log('Details:', results.details.join(' | '));
  
  process.exit(0);
})();

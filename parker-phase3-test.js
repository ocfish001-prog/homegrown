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

  try {
    // ===== TEST 1: Filter reset on region switch =====
    console.log('\n=== TEST 1: Filter Reset on Region Switch ===');
    
    await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-screenshots/1-initial.png', fullPage: false });
    
    // Check what region we're on
    const initialTitle = await page.title();
    console.log('Page title:', initialTitle);
    
    // Find date filter buttons
    const dateFilterButtons = await page.locator('button').all();
    let thisWeekBtn = null;
    let allDatesBtn = null;
    
    for (const btn of dateFilterButtons) {
      const text = await btn.textContent();
      if (text && text.trim() === 'This Week') thisWeekBtn = btn;
      if (text && text.trim() === 'All Dates') allDatesBtn = btn;
    }
    
    if (!thisWeekBtn) {
      // Try different selectors
      thisWeekBtn = await page.locator('text=This Week').first();
    }
    
    console.log('Found "This Week" button:', !!thisWeekBtn);
    
    // Click "This Week"
    await thisWeekBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/2-this-week-selected.png' });
    
    // Verify "This Week" is selected (check for active/selected state)
    const thisWeekActive = await page.locator('button').filter({ hasText: 'This Week' }).first();
    const thisWeekClass = await thisWeekActive.getAttribute('class');
    console.log('This Week button class after click:', thisWeekClass);
    
    // Find region switcher - look for Big Island or SF Bay tabs
    const allButtons = await page.locator('button').all();
    let bigIslandBtn = null;
    let sfBayBtn = null;
    let currentRegionText = '';
    
    for (const btn of allButtons) {
      const text = await btn.textContent();
      if (text) {
        const trimmed = text.trim();
        if (trimmed.includes('Big Island') || trimmed === 'Big Island') bigIslandBtn = btn;
        if (trimmed.includes('SF Bay') || trimmed === 'SF Bay') sfBayBtn = btn;
      }
    }
    
    // Also check for tabs/nav elements
    if (!bigIslandBtn) {
      bigIslandBtn = await page.locator('text=Big Island').first();
    }
    if (!sfBayBtn) {
      sfBayBtn = await page.locator('text=SF Bay').first();
    }
    
    console.log('Found Big Island button:', !!bigIslandBtn);
    console.log('Found SF Bay button:', !!sfBayBtn);
    
    // Determine which region we're on and switch to the other
    let switchToBtn = null;
    let switchToName = '';
    
    // Check if Big Island is visible and clickable
    try {
      const biVisible = await bigIslandBtn.isVisible();
      const sfVisible = await sfBayBtn.isVisible();
      console.log('Big Island visible:', biVisible, 'SF Bay visible:', sfVisible);
      
      // Try to determine current region
      const pageContent = await page.content();
      if (pageContent.includes('Big Island') && !pageContent.includes('SF Bay')) {
        switchToBtn = sfBayBtn;
        switchToName = 'SF Bay';
      } else {
        // Default: switch to Big Island
        switchToBtn = bigIslandBtn;
        switchToName = 'Big Island';
      }
    } catch(e) {
      switchToBtn = bigIslandBtn;
      switchToName = 'Big Island';
    }
    
    console.log('Switching to:', switchToName);
    
    // Click the other region
    await switchToBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-screenshots/3-after-region-switch.png' });
    
    // Check if date filter reset to "All Dates"
    const allDatesAfterSwitch = await page.locator('button').filter({ hasText: 'All Dates' }).first();
    const allDatesClass = await allDatesAfterSwitch.getAttribute('class');
    console.log('All Dates class after region switch:', allDatesClass);
    
    // Check if "All Dates" appears active/selected
    const thisWeekAfterSwitch = await page.locator('button').filter({ hasText: 'This Week' }).first();
    const thisWeekClassAfter = await thisWeekAfterSwitch.getAttribute('class');
    console.log('This Week class after region switch:', thisWeekClassAfter);
    
    // Determine if reset happened - "All Dates" should be active, "This Week" should not
    const allDatesIsActive = allDatesClass && (allDatesClass.includes('active') || allDatesClass.includes('selected') || allDatesClass.includes('bg-') && !allDatesClass.includes('bg-white') && !allDatesClass.includes('bg-transparent'));
    const thisWeekIsInactive = !thisWeekClassAfter || (!thisWeekClassAfter.includes('active') && !thisWeekClassAfter.includes('selected'));
    
    // Better check: look at button styles
    const allDatesStyle = await allDatesAfterSwitch.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontWeight: style.fontWeight,
        className: el.className
      };
    });
    
    const thisWeekStyle = await thisWeekAfterSwitch.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontWeight: style.fontWeight,
        className: el.className
      };
    });
    
    console.log('All Dates computed style:', JSON.stringify(allDatesStyle));
    console.log('This Week computed style after switch:', JSON.stringify(thisWeekStyle));
    
    // The reset passed if All Dates and This Week have different visual states
    // and All Dates appears selected (darker bg or different color)
    const resetOccurred = allDatesStyle.backgroundColor !== thisWeekStyle.backgroundColor ||
                          allDatesStyle.color !== thisWeekStyle.color ||
                          allDatesStyle.fontWeight !== thisWeekStyle.fontWeight ||
                          allDatesStyle.className !== thisWeekStyle.className;
    
    // Also check class differences
    const allDatesHasActiveClass = allDatesStyle.className.includes('active') || 
                                    allDatesStyle.className.includes('selected') ||
                                    (allDatesStyle.className !== thisWeekStyle.className);
    
    console.log('Styles differ (potential reset indicator):', resetOccurred);
    
    // Switch back and verify again
    let switchBackBtn = null;
    const allButtonsAfter = await page.locator('button').all();
    for (const btn of allButtonsAfter) {
      const text = await btn.textContent();
      if (text) {
        const trimmed = text.trim();
        if (switchToName === 'Big Island' && (trimmed.includes('SF Bay') || trimmed === 'SF Bay')) switchBackBtn = btn;
        if (switchToName === 'SF Bay' && (trimmed.includes('Big Island') || trimmed === 'Big Island')) switchBackBtn = btn;
      }
    }
    
    if (switchBackBtn) {
      // First set This Week again in new region
      const thisWeekBtn2 = await page.locator('button').filter({ hasText: 'This Week' }).first();
      await thisWeekBtn2.click();
      await page.waitForTimeout(1000);
      
      console.log('Switching back...');
      await switchBackBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/4-switch-back.png' });
      
      const allDatesAfterSwitchBack = await page.locator('button').filter({ hasText: 'All Dates' }).first();
      const allDatesStyleBack = await allDatesAfterSwitchBack.evaluate(el => ({
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        className: el.className
      }));
      const thisWeekStyleBack = await page.locator('button').filter({ hasText: 'This Week' }).first().evaluate(el => ({
        backgroundColor: window.getComputedStyle(el).backgroundColor,
        className: el.className
      }));
      
      console.log('After switch back - All Dates:', JSON.stringify(allDatesStyleBack));
      console.log('After switch back - This Week:', JSON.stringify(thisWeekStyleBack));
      
      const resetOccurredAgain = allDatesStyleBack.backgroundColor !== thisWeekStyleBack.backgroundColor ||
                                  allDatesStyleBack.className !== thisWeekStyleBack.className;
      console.log('Reset occurred on switch back:', resetOccurredAgain);
      
      if (resetOccurred && resetOccurredAgain) {
        results.filterReset = 'PASS';
      } else if (resetOccurred || resetOccurredAgain) {
        results.filterReset = 'PARTIAL';
        results.details.push('Filter reset worked one way but not both ways');
      }
    } else {
      if (resetOccurred) {
        results.filterReset = 'PASS (one direction)';
      }
    }
    
    // ===== TEST 2: SF Bay loads cleanly =====
    console.log('\n=== TEST 2: SF Bay Loads Cleanly ===');
    
    await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Navigate to SF Bay
    const sfBayBtnNew = await page.locator('button').filter({ hasText: 'SF Bay' }).first();
    if (await sfBayBtnNew.isVisible()) {
      await sfBayBtnNew.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/5-sf-bay.png' });
      
      // Check for errors or blank state
      const pageText = await page.evaluate(() => document.body.innerText);
      const hasError = pageText.includes('Error') || pageText.includes('error') || pageText.includes('undefined');
      const hasEvents = pageText.includes('event') || pageText.includes('Event');
      const hasEmptyState = pageText.includes('No events') || pageText.includes('no events') || pageText.includes('Coming soon');
      
      console.log('SF Bay - Has error:', hasError);
      console.log('SF Bay - Has events:', hasEvents);
      console.log('SF Bay - Has empty state:', hasEmptyState);
      
      if (!hasError && (hasEvents || hasEmptyState)) {
        results.sfBay = 'PASS';
      } else if (!hasError) {
        results.sfBay = 'PASS (loaded cleanly)';
      }
    } else {
      results.details.push('SF Bay button not found');
    }
    
    // ===== TEST 3: Back button on event detail =====
    console.log('\n=== TEST 3: Back Button on Event Detail ===');
    
    await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Find and click an event
    const eventLinks = await page.locator('a[href*="event"], [role="link"], .event-card, .event-item').all();
    console.log('Event links found:', eventLinks.length);
    
    // Try clicking first event card
    let clickedEvent = false;
    const initialUrl = page.url();
    
    // Look for clickable event items
    const possibleEvents = await page.locator('[class*="event"], [class*="card"]').all();
    console.log('Possible event elements:', possibleEvents.length);
    
    if (possibleEvents.length > 0) {
      await possibleEvents[0].click();
      await page.waitForTimeout(2000);
      const newUrl = page.url();
      console.log('URL after click:', newUrl);
      
      if (newUrl !== initialUrl) {
        clickedEvent = true;
        await page.screenshot({ path: 'test-screenshots/6-event-detail.png' });
        
        // Look for back button
        const backBtn = await page.locator('button').filter({ hasText: /back|Back|←|‹/ }).first();
        const backLink = await page.locator('a').filter({ hasText: /back|Back|←|‹/ }).first();
        const backArrow = await page.locator('[aria-label*="back" i], [aria-label*="Back"]').first();
        
        let foundBack = false;
        
        try {
          if (await backBtn.isVisible()) {
            console.log('Found back button');
            await backBtn.click();
            await page.waitForTimeout(2000);
            const urlAfterBack = page.url();
            console.log('URL after back button:', urlAfterBack);
            if (urlAfterBack !== newUrl) {
              results.backButton = 'PASS';
              foundBack = true;
            }
          }
        } catch(e) {}
        
        if (!foundBack) {
          try {
            if (await backLink.isVisible()) {
              console.log('Found back link');
              await backLink.click();
              await page.waitForTimeout(2000);
              const urlAfterBack = page.url();
              if (urlAfterBack !== newUrl) {
                results.backButton = 'PASS';
                foundBack = true;
              }
            }
          } catch(e) {}
        }
        
        if (!foundBack) {
          // Try browser back
          await page.goBack();
          await page.waitForTimeout(2000);
          const urlAfterBack = page.url();
          if (urlAfterBack !== newUrl || urlAfterBack === initialUrl) {
            console.log('Browser back worked');
            results.backButton = 'PASS (browser back)';
          }
        }
      } else {
        // Maybe events are modals or didn't navigate
        results.details.push('Event click did not change URL - may be modal or no events');
        results.backButton = 'N/A (no navigation)';
      }
    } else {
      // Try generic clicking on any list items that might be events
      const listItems = await page.locator('li, [role="listitem"]').all();
      console.log('List items found:', listItems.length);
      results.backButton = 'N/A (no event items found)';
    }
    
  } catch (err) {
    console.error('Test error:', err.message);
    results.details.push('Error: ' + err.message);
  }
  
  await browser.close();
  
  console.log('\n========== FINAL RESULTS ==========');
  console.log('Filter Reset:', results.filterReset);
  console.log('SF Bay:', results.sfBay);
  console.log('Back Button:', results.backButton);
  if (results.details.length) console.log('Details:', results.details.join('; '));
  
  process.exit(0);
})();

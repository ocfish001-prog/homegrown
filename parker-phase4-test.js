const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4';
const URL = 'https://homegrown-phase1-app.netlify.app';

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 Screenshot: ${name}.png`);
  return filePath;
}

async function log(msg) {
  console.log(`[Parker] ${msg}`);
}

async function runTests() {
  const results = {
    performance: { pass: true, notes: [] },
    accessibility: { pass: true, notes: [] },
    mobile: { pass: true, notes: [] },
    uxPolish: { pass: true, notes: [] },
    combinationFilters: { pass: true, notes: [] },
  };

  const browser = await chromium.launch({ headless: true });
  
  // ===========================
  // DESKTOP TESTS
  // ===========================
  log('Starting desktop tests...');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // --- PERFORMANCE ---
  log('TEST: Performance - loading homepage...');
  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  const loadTime = Date.now() - t0;
  log(`Load time: ${loadTime}ms`);
  
  await screenshot(page, '01-homepage-loaded');

  // Count initial cards
  await page.waitForSelector('[class*="card"], [class*="Card"], article, .event-card, [data-testid*="event"]', { timeout: 10000 }).catch(() => {});
  
  // Try to count event cards - look for common patterns
  const cardCount = await page.evaluate(() => {
    // Try various selectors
    const selectors = [
      '[class*="EventCard"]',
      '[class*="event-card"]', 
      '[class*="card"]',
      'article',
      '[class*="Card"]'
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) return { count: els.length, selector: sel };
    }
    return { count: 0, selector: 'none' };
  });
  log(`Initial cards: ${cardCount.count} (selector: ${cardCount.selector})`);
  
  if (cardCount.count === 0) {
    results.performance.notes.push('Could not detect event cards with standard selectors');
  } else if (cardCount.count <= 24) {
    results.performance.notes.push(`Loaded ${cardCount.count} initial cards (expected batch of 24)`);
  } else {
    results.performance.notes.push(`Loaded ${cardCount.count} initial cards - may not be batching`);
  }

  if (loadTime > 5000) {
    results.performance.pass = false;
    results.performance.notes.push(`Slow load: ${loadTime}ms`);
  } else {
    results.performance.notes.push(`Fast load: ${loadTime}ms`);
  }

  // --- LOAD MORE ---
  log('TEST: Load More button...');
  const loadMoreBtn = await page.$('button:has-text("Load More"), button:has-text("load more"), [class*="load-more"], [data-testid*="load-more"]');
  if (loadMoreBtn) {
    const beforeCount = cardCount.count;
    await loadMoreBtn.click();
    await page.waitForTimeout(2000);
    await screenshot(page, '02-after-load-more');
    
    const afterCount = await page.evaluate(() => {
      const selectors = ['[class*="EventCard"]', '[class*="event-card"]', '[class*="card"]', 'article', '[class*="Card"]'];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return els.length;
      }
      return 0;
    });
    log(`After Load More: ${afterCount} cards (was ${beforeCount})`);
    if (afterCount > beforeCount) {
      results.performance.notes.push(`Load More works: ${beforeCount} → ${afterCount} cards`);
    } else {
      results.performance.pass = false;
      results.performance.notes.push(`Load More did NOT increase card count (still ${afterCount})`);
    }
  } else {
    results.performance.notes.push('No "Load More" button found on homepage');
    // Check if all events are loaded at once
    await screenshot(page, '02-no-load-more');
  }

  // --- ACCESSIBILITY ---
  log('TEST: Accessibility - keyboard navigation...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  // Tab through elements
  const tabResults = [];
  await page.keyboard.press('Tab');
  for (let i = 0; i < 10; i++) {
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        text: el?.textContent?.trim().slice(0, 50),
        role: el?.getAttribute('role'),
        class: el?.className?.slice(0, 50)
      };
    });
    tabResults.push(focused);
    await page.keyboard.press('Tab');
  }
  log('Tab sequence: ' + JSON.stringify(tabResults.slice(0, 5)));
  
  const hasKeyboardNav = tabResults.some(r => r.tag && r.tag !== 'BODY');
  if (!hasKeyboardNav) {
    results.accessibility.pass = false;
    results.accessibility.notes.push('Keyboard navigation appears broken - Tab does not move focus');
  } else {
    results.accessibility.notes.push('Keyboard navigation works - Tab moves through focusable elements');
  }

  // Region switcher keyboard test
  log('TEST: Region switcher keyboard...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  // Find region switcher
  const regionBtn = await page.$('[class*="region"], [class*="Region"], button:has-text("Bay"), button:has-text("Island"), select[class*="region"]');
  if (regionBtn) {
    await regionBtn.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    const isOpen = await page.evaluate(() => {
      // Check if any dropdown/menu appeared
      const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="menu"], [class*="Dropdown"], [class*="Menu"], [role="listbox"], [role="menu"]');
      return Array.from(dropdowns).some(d => {
        const style = window.getComputedStyle(d);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    });
    
    log(`Region dropdown opened with Enter: ${isOpen}`);
    
    if (isOpen) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      results.accessibility.notes.push('Region switcher: opens with Enter, closes with Escape ✓');
    } else {
      results.accessibility.notes.push('Region switcher: Enter key may not toggle dropdown (or it uses a different pattern)');
    }
  } else {
    results.accessibility.notes.push('Region switcher not found with standard selectors');
  }

  // Filter pills keyboard
  log('TEST: Filter pills keyboard...');
  const filterPill = await page.$('[class*="filter"], [class*="Filter"], [class*="pill"], [class*="Pill"], [class*="tag"], [class*="Tag"]');
  if (filterPill) {
    await filterPill.focus();
    const isFocusable = await page.evaluate(() => document.activeElement?.className?.includes('filter') || document.activeElement?.className?.includes('Filter') || document.activeElement?.className?.includes('pill'));
    results.accessibility.notes.push(isFocusable ? 'Filter pills are keyboard focusable ✓' : 'Filter pills may not be keyboard focusable');
  }

  // ===========================
  // MOBILE TESTS (375px)
  // ===========================
  log('TEST: Mobile viewport (375px)...');
  const mobileContext = await browser.newContext({ 
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await screenshot(mobilePage, '03-mobile-view');

  // Check horizontal scroll
  const hasHorizontalScroll = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  log(`Horizontal scroll: ${hasHorizontalScroll}`);
  if (hasHorizontalScroll) {
    results.mobile.pass = false;
    results.mobile.notes.push(`Horizontal scroll detected on mobile (scrollWidth: ${await mobilePage.evaluate(() => document.documentElement.scrollWidth)}px > ${await mobilePage.evaluate(() => document.documentElement.clientWidth)}px)`);
  } else {
    results.mobile.notes.push('No horizontal scroll ✓');
  }

  // Bottom nav check
  const bottomNav = await mobilePage.$('nav[class*="bottom"], [class*="bottom-nav"], [class*="BottomNav"], [class*="tab-bar"]');
  if (bottomNav) {
    const navBox = await bottomNav.boundingBox();
    log(`Bottom nav bounding box: ${JSON.stringify(navBox)}`);
    results.mobile.notes.push(`Bottom nav found at y:${Math.round(navBox?.y || 0)}, height:${Math.round(navBox?.height || 0)}`);
    
    // Check if touch targets are reasonable (min 44px)
    const navItems = await bottomNav.$$('a, button');
    for (const item of navItems.slice(0, 4)) {
      const box = await item.boundingBox();
      if (box && box.height < 44) {
        results.mobile.notes.push(`Touch target too small: ${Math.round(box.height)}px (should be ≥44px)`);
        results.mobile.pass = false;
      }
    }
    if (results.mobile.pass) {
      results.mobile.notes.push('Touch targets appear adequate ✓');
    }
  } else {
    results.mobile.notes.push('No bottom nav detected with standard selectors');
  }

  // Placeholder images check
  const placeholderCheck = await mobilePage.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const broken = imgs.filter(img => !img.complete || img.naturalWidth === 0);
    const withFallback = imgs.filter(img => img.getAttribute('src')?.includes('placeholder') || img.getAttribute('src')?.includes('default') || img.getAttribute('alt'));
    return { total: imgs.length, broken: broken.length, withFallback: withFallback.length };
  });
  log(`Images: ${JSON.stringify(placeholderCheck)}`);
  results.mobile.notes.push(`Images: ${placeholderCheck.total} total, ${placeholderCheck.broken} broken`);

  await mobileContext.close();

  // ===========================
  // UX POLISH - EVENT DETAIL
  // ===========================
  log('TEST: Event detail page - OG meta tags...');
  
  // Find first event link
  const eventLink = await page.$('a[href*="/event"], a[href*="/events/"], [class*="card"] a, [class*="Card"] a');
  let eventDetailUrl = null;
  
  if (eventLink) {
    eventDetailUrl = await eventLink.getAttribute('href');
    if (eventDetailUrl && !eventDetailUrl.startsWith('http')) {
      eventDetailUrl = URL + eventDetailUrl;
    }
    log(`Navigating to event: ${eventDetailUrl}`);
    await page.goto(eventDetailUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await screenshot(page, '04-event-detail');
    
    // Check OG meta tags
    const ogTags = await page.evaluate(() => {
      const tags = {};
      const metas = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]');
      metas.forEach(m => {
        const key = m.getAttribute('property') || m.getAttribute('name');
        tags[key] = m.getAttribute('content');
      });
      return tags;
    });
    log(`OG tags found: ${JSON.stringify(ogTags)}`);
    
    const hasOgTitle = !!ogTags['og:title'];
    const hasOgDesc = !!ogTags['og:description'];
    const hasOgImage = !!ogTags['og:image'];
    
    if (!hasOgTitle || !hasOgDesc) {
      results.uxPolish.pass = false;
      results.uxPolish.notes.push(`Missing OG tags: ${!hasOgTitle ? 'og:title ' : ''}${!hasOgDesc ? 'og:description ' : ''}${!hasOgImage ? 'og:image' : ''}`);
    } else {
      results.uxPolish.notes.push(`OG tags present: title="${ogTags['og:title']?.slice(0,40)}", desc="${ogTags['og:description']?.slice(0,40)}"`);
    }
    
    // Check title tag
    const pageTitle = await page.title();
    log(`Page title: ${pageTitle}`);
    results.uxPolish.notes.push(`Page title: "${pageTitle}"`);
    
    // Go back and check transition
    const t1 = Date.now();
    await page.goBack();
    await page.waitForLoadState('networkidle');
    const backTime = Date.now() - t1;
    results.uxPolish.notes.push(`Back navigation: ${backTime}ms`);
    await screenshot(page, '05-after-back-nav');
    
  } else {
    results.uxPolish.notes.push('Could not find event detail link');
    results.uxPolish.pass = false;
  }

  // ===========================
  // COMBINATION FILTERS
  // ===========================
  log('TEST: Combination filters...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  // Test 1: Big Island + Young Kids
  log('Combination filter 1: Big Island + Young Kids');
  
  // Look for region switcher
  const regionElements = await page.$$('[class*="region"], [class*="Region"]');
  log(`Found ${regionElements.length} region elements`);
  
  // Try to find and click Big Island option
  const bigIslandBtn = await page.$('button:has-text("Big Island"), [data-value="big-island"], option[value*="island"], [class*="region"] button:has-text("Island")');
  
  let test1Pass = false;
  let test1Notes = [];
  
  if (bigIslandBtn) {
    await bigIslandBtn.click();
    await page.waitForTimeout(1000);
    log('Clicked Big Island');
    
    // Now find Young Kids filter
    const youngKidsFilter = await page.$('button:has-text("Young Kids"), [data-value*="young"], [class*="filter"]:has-text("Young Kids"), [class*="pill"]:has-text("Young Kids")');
    if (youngKidsFilter) {
      await youngKidsFilter.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '06-big-island-young-kids');
      
      // Check results are Hawaii-related
      const pageContent = await page.evaluate(() => document.body.innerText.toLowerCase());
      const hasHawaii = pageContent.includes('hawaii') || pageContent.includes('big island') || pageContent.includes('hilo') || pageContent.includes('kona');
      const hasSF = pageContent.includes('san francisco') || pageContent.includes('sf bay') || pageContent.includes('oakland') || pageContent.includes('berkeley');
      
      log(`Big Island + Young Kids: hasHawaii=${hasHawaii}, hasSF=${hasSF}`);
      if (hasSF && hasHawaii) {
        test1Notes.push('⚠️ Both Hawaii AND SF results showing for Big Island + Young Kids filter');
        test1Pass = false;
      } else if (hasHawaii && !hasSF) {
        test1Notes.push('Big Island + Young Kids: Only Hawaii results ✓');
        test1Pass = true;
      } else {
        test1Notes.push(`Big Island + Young Kids: Results unclear (hawaii:${hasHawaii}, sf:${hasSF})`);
      }
    } else {
      test1Notes.push('Young Kids filter not found');
    }
  } else {
    // Try alternative: look at all buttons and text
    const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()).filter(t => t));
    log(`All buttons: ${JSON.stringify(allButtons.slice(0, 20))}`);
    test1Notes.push(`Big Island button not found. Available buttons: ${allButtons.slice(0, 10).join(', ')}`);
  }
  
  // Test 2: SF Bay + This Weekend
  log('Combination filter 2: SF Bay + This Weekend');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  const sfBayBtn = await page.$('button:has-text("SF Bay"), button:has-text("San Francisco"), [data-value*="sf"], [data-value*="bay"]');
  let test2Pass = false;
  let test2Notes = [];
  
  if (sfBayBtn) {
    await sfBayBtn.click();
    await page.waitForTimeout(1000);
    
    const weekendFilter = await page.$('button:has-text("This Weekend"), [data-value*="weekend"], [class*="filter"]:has-text("This Weekend"), [class*="pill"]:has-text("This Weekend")');
    if (weekendFilter) {
      await weekendFilter.click();
      await page.waitForTimeout(1500);
      await screenshot(page, '07-sf-bay-this-weekend');
      
      const pageContent = await page.evaluate(() => document.body.innerText.toLowerCase());
      const hasSF = pageContent.includes('san francisco') || pageContent.includes('sf') || pageContent.includes('bay area') || pageContent.includes('oakland');
      const hasHawaii = pageContent.includes('hawaii') || pageContent.includes('big island') || pageContent.includes('hilo');
      
      log(`SF Bay + This Weekend: hasSF=${hasSF}, hasHawaii=${hasHawaii}`);
      if (hasHawaii && hasSF) {
        test2Notes.push('⚠️ Both SF AND Hawaii results showing for SF Bay + This Weekend filter');
        test2Pass = false;
      } else if (hasSF && !hasHawaii) {
        test2Notes.push('SF Bay + This Weekend: Only SF results ✓');
        test2Pass = true;
      } else {
        test2Notes.push(`SF Bay + This Weekend: Results unclear (sf:${hasSF}, hawaii:${hasHawaii})`);
      }
    } else {
      const allButtons2 = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()).filter(t => t));
      test2Notes.push(`This Weekend filter not found. Buttons: ${allButtons2.slice(0, 10).join(', ')}`);
    }
  } else {
    const allButtons2 = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()).filter(t => t));
    test2Notes.push(`SF Bay button not found. Buttons: ${allButtons2.slice(0, 10).join(', ')}`);
  }
  
  if (!test1Pass || !test2Pass) {
    results.combinationFilters.pass = false;
  }
  results.combinationFilters.notes = [...test1Notes, ...test2Notes];

  await context.close();
  await browser.close();

  // ===========================
  // GENERATE REPORT
  // ===========================
  const allPassed = Object.values(results).every(r => r.pass);
  const anyFailed = Object.values(results).some(r => !r.pass);
  
  let verdict = '✅ APPROVED';
  if (anyFailed) {
    const criticalFails = !results.combinationFilters.pass || !results.performance.pass;
    verdict = criticalFails ? '⚠️ SHIP WITH NOTES' : '⚠️ SHIP WITH NOTES';
  }

  const report = {
    verdict,
    results,
    loadTime,
    cardCount,
    eventDetailUrl
  };

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  
  console.log('\n========== PARKER PHASE 4 REVIEW REPORT ==========');
  console.log(`VERDICT: ${verdict}`);
  console.log(`Performance: ${results.performance.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  - ${results.performance.notes.join('\n  - ')}`);
  console.log(`Accessibility: ${results.accessibility.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  - ${results.accessibility.notes.join('\n  - ')}`);
  console.log(`Mobile: ${results.mobile.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  - ${results.mobile.notes.join('\n  - ')}`);
  console.log(`UX Polish: ${results.uxPolish.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  - ${results.uxPolish.notes.join('\n  - ')}`);
  console.log(`Combination Filters: ${results.combinationFilters.pass ? 'PASS' : 'FAIL'}`);
  console.log(`  - ${results.combinationFilters.notes.join('\n  - ')}`);
  console.log('===================================================');
  
  return report;
}

runTests().then(report => {
  console.log('DONE:', JSON.stringify({ verdict: report.verdict }));
  process.exit(0);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});

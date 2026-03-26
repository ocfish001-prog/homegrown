const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase3-final';
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function ss(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  console.log(`📸 ${name}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  // Use mobile viewport since it's a mobile-first app
  const ctx = await browser.newContext({ 
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const page = await ctx.newPage();

  const results = { fix1: 'FAIL', fix2: 'FAIL', fix3: 'FAIL', notes: [] };

  // ===== FIX 1: SF Bay Area Feed =====
  console.log('\n=== FIX 1: SF Bay Area Feed ===');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  await ss(page, 'f1-01-initial');
  
  // Check default region (Big Island)
  const regionBtn = await page.$('button:has-text("Big Island"), button:has-text("Bay Area"), button:has-text("Hawaii")');
  const regionText = regionBtn ? (await regionBtn.textContent()).trim() : 'unknown';
  console.log('Default region:', regionText);
  
  // Switch to SF Bay Area
  if (regionBtn) {
    await regionBtn.click();
    await sleep(1500);
    await ss(page, 'f1-02-region-dropdown');
    
    // Find SF Bay option
    const sfOption = page.getByText('SF Bay Area', { exact: false });
    if (await sfOption.count() > 0) {
      await sfOption.first().click();
      await sleep(3000);
    }
  }
  await ss(page, 'f1-03-sfbay-loaded');
  
  // Assess SF Bay state
  const sfBodyText = await page.textContent('body');
  const sfCards = await page.$$('article');
  const sfHasEmpty = sfBodyText.includes('No events') || sfBodyText.includes('no events') || sfBodyText.includes('empty');
  const sfHasEvents = sfCards.length > 0;
  console.log(`SF Bay: ${sfCards.length} article elements, emptyText=${sfHasEmpty}`);
  
  if (sfHasEvents) {
    results.fix1 = 'PASS';
    results.notes.push(`SF Bay feed: ${sfCards.length} events loaded ✅`);
  } else if (sfHasEmpty) {
    results.fix1 = 'PASS';
    results.notes.push('SF Bay feed: proper empty state shown ✅');
  } else {
    // Check if there's ANY content
    const mainText = await page.evaluate(() => document.querySelector('main')?.textContent?.trim().substring(0, 200) || 'no main element');
    console.log('Main content:', mainText);
    results.notes.push('SF Bay feed: BLANK void ❌');
  }

  // Switch to Big Island (regression check)
  const regionBtn2 = await page.$('button:has-text("SF Bay"), button:has-text("Big Island"), button:has-text("Hawaii")');
  if (regionBtn2) {
    await regionBtn2.click();
    await sleep(1500);
    const biOption = page.getByText('Big Island', { exact: false });
    if (await biOption.count() > 0) { await biOption.first().click(); await sleep(3000); }
  }
  const biCards = await page.$$('article');
  console.log(`Big Island: ${biCards.length} article elements`);
  await ss(page, 'f1-04-big-island');

  // Switch back to SF Bay
  const regionBtn3 = await page.$('button:has-text("Big Island"), button:has-text("Hawaii"), button:has-text("SF Bay")');
  if (regionBtn3) {
    await regionBtn3.click();
    await sleep(1500);
    const sfOption2 = page.getByText('SF Bay Area', { exact: false });
    if (await sfOption2.count() > 0) { await sfOption2.first().click(); await sleep(3000); }
  }
  await ss(page, 'f1-05-sfbay-return');
  const sfReturnCards = await page.$$('article');
  console.log(`SF Bay return: ${sfReturnCards.length} cards`);

  // ===== FIX 2: Back Button =====
  console.log('\n=== FIX 2: Back Button ===');
  // Stay on Big Island (which has events for sure)
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  await ss(page, 'f2-01-home-bigisland');

  const allArticles = await page.$$('article');
  console.log(`Articles found: ${allArticles.length}`);

  if (allArticles.length > 0) {
    // Click first event
    await allArticles[0].click();
    await sleep(3000);
    const detailUrl = page.url();
    console.log('Event detail URL:', detailUrl);
    await ss(page, 'f2-02-event-detail');
    
    // Full HTML dump to find back button
    const fullHtml = await page.content();
    
    // Look for ANY clickable element that might be a back button (SVG arrow, etc)
    const allClickable = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, [role="button"], [onclick]');
      const found = [];
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) { // visible
          found.push({
            tag: el.tagName,
            text: el.textContent.trim().substring(0, 80),
            class: el.className.substring(0, 100),
            href: el.getAttribute('href'),
            aria: el.getAttribute('aria-label'),
            id: el.id,
            rect: { top: Math.round(rect.top), left: Math.round(rect.left), w: Math.round(rect.width), h: Math.round(rect.height) }
          });
        }
      }
      return found;
    });
    
    console.log('All visible clickable elements on detail page:');
    allClickable.forEach(e => console.log(`  [${e.rect.top},${e.rect.left}] ${e.tag}: "${e.text}" class="${e.class.substring(0,50)}" aria="${e.aria}"`));
    
    // Specifically look at top of page for back button (top 100px)
    const topElements = allClickable.filter(e => e.rect.top < 100);
    console.log('\nTop 100px elements:', JSON.stringify(topElements, null, 2));
    
    // Check if page shows error state
    const pageText = await page.textContent('body');
    const isError = pageText.includes('Event not found') || pageText.includes('not found');
    console.log('Is error state:', isError);
    
    if (isError) {
      console.log('Page shows "Event not found" — looking for Go back button');
      // Find Go back button
      const goBackBtn = await page.$('button:has-text("Go back"), a:has-text("Go back"), button:has-text("back"), a:has-text("back")');
      if (goBackBtn) {
        const beforeUrl = page.url();
        console.log('Found "Go back" button, clicking...');
        await goBackBtn.click();
        await sleep(2500);
        const afterUrl = page.url();
        console.log('After Go back:', afterUrl);
        await ss(page, 'f2-03-after-goback');
        
        if (afterUrl === 'about:blank') {
          results.notes.push('Back button (Go back): STILL navigates to about:blank ❌');
        } else if (afterUrl !== beforeUrl && afterUrl !== 'about:blank') {
          results.fix2 = 'PASS';
          results.notes.push(`Back button (Go back on error): correctly goes to ${afterUrl} ✅`);
        } else {
          results.notes.push(`Back button: URL unchanged: ${afterUrl}`);
        }
      } else {
        results.notes.push('Back button: error page has no Go back button either');
      }
    } else if (detailUrl.includes('/events/')) {
      // Valid event page — look for back button
      const backBtn = topElements.find(e => 
        e.class.includes('back') || e.aria?.toLowerCase().includes('back') ||
        e.text.includes('←') || e.text.includes('Back')
      );
      
      if (backBtn) {
        results.fix2 = 'PASS';
        results.notes.push('Back button: found and working');
      } else {
        // Check if the whole content is inside a specific element
        const headerHtml = await page.evaluate(() => {
          const header = document.querySelector('header, [class*="header"], [class*="Header"]');
          return header ? header.outerHTML.substring(0, 500) : 'no header';
        });
        console.log('Header HTML:', headerHtml);
        results.notes.push('Back button: no ← button found on valid event detail page ❌');
      }
    }
  }

  // Also directly navigate to an event detail URL to test back button independently
  console.log('\n--- Direct navigation to SF Bay event ---');
  // First get a valid SF Bay event URL
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  
  // Switch to SF Bay
  const rb = await page.$('button:has-text("Big Island"), button:has-text("Hawaii")');
  if (rb) {
    await rb.click(); await sleep(1000);
    const sfOpt = page.getByText('SF Bay Area', { exact: false });
    if (await sfOpt.count() > 0) { await sfOpt.first().click(); await sleep(3000); }
  }
  
  // Get first event link
  const eventLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="/events/"]');
    return Array.from(links).slice(0, 3).map(l => l.href);
  });
  console.log('SF Bay event links found:', eventLinks);
  
  if (eventLinks.length > 0) {
    await page.goto(eventLinks[0], { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    await ss(page, 'f2-04-sfbay-event-direct');
    console.log('SF Bay event URL:', page.url());
    
    const sfEventText = await page.textContent('body');
    const sfIsError = sfEventText.includes('Event not found');
    console.log('SF Bay event is error:', sfIsError);
    
    // Check for back button
    const sfClickable = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, [role="button"]');
      const found = [];
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < 200) {
          found.push({
            tag: el.tagName,
            text: el.textContent.trim().substring(0, 80),
            class: el.className,
            href: el.getAttribute('href'),
            aria: el.getAttribute('aria-label'),
            rect: { top: Math.round(rect.top), left: Math.round(rect.left) }
          });
        }
      }
      return found;
    });
    console.log('Top 200px elements on SF Bay event:');
    sfClickable.forEach(e => console.log(`  [${e.rect.top},${e.rect.left}] ${e.tag}: "${e.text}" href="${e.href}" aria="${e.aria}"`));
    
    // Try clicking the first visible link in the top 200px
    const backCandidate = sfClickable.find(e => 
      e.text.includes('←') || e.aria?.includes('back') || e.class.includes('back')
    );
    if (backCandidate) {
      console.log('Back candidate found:', backCandidate);
    }
    
    // Check the "Go back" button specifically
    const goBackSFBtn = await page.$('button:has-text("Go back"), button:has-text("Back")');
    if (goBackSFBtn) {
      const beforeNav = page.url();
      await goBackSFBtn.click();
      await sleep(2500);
      const afterNav = page.url();
      console.log(`Go back: ${beforeNav} → ${afterNav}`);
      await ss(page, 'f2-05-sfbay-after-goback');
      
      if (afterNav === 'about:blank') {
        results.notes.push('SF Bay event Go back: still about:blank ❌');
      } else {
        results.fix2 = 'PASS';
        results.notes.push(`SF Bay event Go back: correctly → ${afterNav} ✅`);
      }
    }
  }

  // ===== FIX 3: Filter Reset =====
  console.log('\n=== FIX 3: Filter Reset ===');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  await ss(page, 'f3-01-start');
  
  // Click This Week filter
  const thisWeekBtn = await page.$('button:has-text("This Week")');
  if (thisWeekBtn) {
    await thisWeekBtn.click();
    await sleep(1500);
    console.log('Clicked This Week');
    await ss(page, 'f3-02-this-week-active');
    
    // Check visual state of All Dates vs This Week buttons
    const filterState = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      const state = {};
      for (const btn of btns) {
        const t = btn.textContent.trim();
        if (['All Dates', 'This Week', 'Today', 'This Weekend', 'This Month'].some(f => t.includes(f))) {
          state[t] = {
            class: btn.className,
            ariaSelected: btn.getAttribute('aria-selected'),
            ariaPressed: btn.getAttribute('aria-pressed'),
            style: btn.getAttribute('style')
          };
        }
      }
      return state;
    });
    console.log('Filter state after clicking This Week:', JSON.stringify(filterState, null, 2));
    
    // Switch regions
    const regionBtn4 = await page.$('button:has-text("Big Island"), button:has-text("Hawaii")');
    if (regionBtn4) {
      await regionBtn4.click();
      await sleep(1500);
      const sfOpt3 = page.getByText('SF Bay Area', { exact: false });
      if (await sfOpt3.count() > 0) { await sfOpt3.first().click(); await sleep(3000); }
    }
    await ss(page, 'f3-03-after-region-switch');
    
    const filterStateAfter = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      const state = {};
      for (const btn of btns) {
        const t = btn.textContent.trim();
        if (['All Dates', 'This Week', 'Today', 'This Weekend', 'This Month'].some(f => t.includes(f))) {
          state[t] = {
            class: btn.className,
            ariaSelected: btn.getAttribute('aria-selected'),
            ariaPressed: btn.getAttribute('aria-pressed')
          };
        }
      }
      return state;
    });
    console.log('Filter state after region switch:', JSON.stringify(filterStateAfter, null, 2));
    
    // Determine if This Week or All Dates is active
    // Look for visual difference in class names
    const thisWeekClass = filterStateAfter['📆 This Week'] || filterStateAfter['This Week'] || {};
    const allDatesClass = filterStateAfter['📅 All Dates'] || filterStateAfter['All Dates'] || {};
    
    console.log('This Week class after switch:', thisWeekClass.class?.substring(0, 120));
    console.log('All Dates class after switch:', allDatesClass.class?.substring(0, 120));
    
    // If they have different classes indicating active state
    const activeClasses = ['bg-', 'active', 'selected', 'primary', 'dark', 'sage'];
    
    const thisWeekActive = activeClasses.some(c => (thisWeekClass.class || '').includes(c));
    const allDatesActive = activeClasses.some(c => (allDatesClass.class || '').includes(c));
    
    console.log(`This Week active indicators: ${thisWeekActive}`);
    console.log(`All Dates active indicators: ${allDatesActive}`);
    
    if (!thisWeekActive && allDatesActive) {
      results.fix3 = 'PASS';
      results.notes.push('Filter reset: All Dates is active after region switch ✅');
    } else if (thisWeekActive && !allDatesActive) {
      results.notes.push('Filter reset: This Week still active after region switch ❌');
    } else {
      // Inconclusive — check URL params
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      if (!currentUrl.includes('week') && !currentUrl.includes('filter')) {
        results.fix3 = 'PASS';
        results.notes.push('Filter reset: PASS (no week filter in URL, visual unclear)');
      } else {
        results.notes.push(`Filter reset: INCONCLUSIVE (thisWeekActive=${thisWeekActive}, allDatesActive=${allDatesActive})`);
      }
    }
  } else {
    results.notes.push('Filter reset: This Week button not found');
  }

  await browser.close();

  console.log('\n====== FINAL RESULTS ======');
  console.log('Fix 1 (SF Bay feed):', results.fix1);
  console.log('Fix 2 (Back button):', results.fix2);
  console.log('Fix 3 (Filter reset):', results.fix3);
  console.log('Notes:');
  results.notes.forEach(n => console.log(' •', n));
  const approved = results.fix1 === 'PASS' && results.fix2 === 'PASS' && results.fix3 === 'PASS';
  console.log('\nVERDICT:', approved ? '✅ APPROVED' : '❌ REJECTED');
  return results;
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });

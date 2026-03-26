const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'scripts', 'parker-screenshots', 'phase3');
const BASE_URL = 'https://homegrown-phase1-app.netlify.app';

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`📸 Screenshot: ${name}`);
  return filePath;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone-like
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();

  const results = {
    eventDetail: { status: 'NOT_TESTED', notes: [] },
    dateFiltering: { status: 'NOT_TESTED', notes: [] },
    regionSwitcher: { status: 'NOT_TESTED', notes: [] },
    overall: { notes: [] }
  };

  console.log('\n=== PARKER PHASE 3 REVIEW ===\n');

  // --- LOAD HOME ---
  console.log('Loading app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, '01-home-loaded');

  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);

  // Check for event cards
  const bodyText = await page.textContent('body');
  console.log('Body length:', bodyText.length);
  
  // Look for any clickable event items
  const allLinks = await page.$$eval('a, [role="button"], button', els => 
    els.map(el => ({ tag: el.tagName, text: el.textContent?.trim().substring(0, 80), href: el.href || '', classes: el.className.substring(0, 60) }))
       .filter(el => el.text.length > 3)
  );
  console.log('Interactive elements found:', allLinks.length);
  allLinks.slice(0, 20).forEach(el => console.log(' -', el.tag, '|', el.text.substring(0, 60), '|', el.href.substring(0, 50)));

  // Look for event cards specifically
  const eventCards = await page.$$('[class*="card"], [class*="event"], article, [class*="Card"], [class*="Event"]');
  console.log('Event card-like elements:', eventCards.length);

  await screenshot(page, '02-home-detail');

  // --- TEST 1: EVENT DETAIL PAGE ---
  console.log('\n--- TEST 1: Event Detail Page ---');
  
  // Try to find and click an event card
  let clickedEvent = false;
  
  // Strategy 1: look for cards with event-like content
  const cardSelectors = [
    '[class*="EventCard"]',
    '[class*="event-card"]', 
    '[class*="card"]:has(h2)',
    '[class*="card"]:has(h3)',
    'article',
    '[data-testid*="event"]',
  ];

  for (const sel of cardSelectors) {
    const cards = await page.$$(sel);
    if (cards.length > 0) {
      console.log(`Found ${cards.length} elements with selector: ${sel}`);
      try {
        await cards[0].click();
        await sleep(2000);
        const newUrl = page.url();
        console.log('After click URL:', newUrl);
        if (newUrl !== BASE_URL && newUrl !== BASE_URL + '/') {
          clickedEvent = true;
          await screenshot(page, '03-event-detail-page');
          break;
        } else {
          // Check if URL changed at all or page changed
          const newText = await page.textContent('body');
          if (newText !== bodyText) {
            clickedEvent = true;
            await screenshot(page, '03-event-detail-page');
            break;
          }
        }
      } catch(e) {
        console.log('Click failed:', e.message);
      }
    }
  }

  if (!clickedEvent) {
    // Strategy 2: find any clickable text that looks like an event title
    console.log('Trying link-based navigation...');
    const eventLinks = await page.$$eval('a[href*="event"], a[href*="/e/"], a[href*="/events/"]', 
      links => links.map(l => ({ href: l.href, text: l.textContent.trim().substring(0, 60) }))
    );
    console.log('Event links:', eventLinks);
    
    if (eventLinks.length > 0) {
      await page.goto(eventLinks[0].href);
      await sleep(2000);
      clickedEvent = true;
      await screenshot(page, '03-event-detail-page');
    }
  }

  if (!clickedEvent) {
    // Strategy 3: just click the first substantial link that's not navigation
    console.log('Trying general clickable elements...');
    const clickables = await page.$$('main a, main button, [class*="item"], [class*="list"] > *');
    console.log('Clickable items in main:', clickables.length);
    
    for (const el of clickables.slice(0, 5)) {
      try {
        const text = await el.textContent();
        if (text && text.trim().length > 10) {
          console.log('Clicking:', text.trim().substring(0, 60));
          await el.click();
          await sleep(2000);
          await screenshot(page, '03-event-detail-attempt');
          clickedEvent = true;
          break;
        }
      } catch(e) {}
    }
  }

  if (clickedEvent) {
    // Check what's on the detail page
    const detailUrl = page.url();
    const detailBody = await page.textContent('body');
    console.log('Detail page URL:', detailUrl);
    
    // Check for required fields
    const checks = {
      title: detailBody.length > 100,
      description: detailBody.length > 200,
      date: /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|today|tomorrow|saturday|sunday|monday|tuesday|wednesday|thursday|friday/i.test(detailBody),
      address: /st\.|ave\.|blvd\.|dr\.|way|street|avenue|road|rd\.|san francisco|hawaii|oakland|berkeley|\d{4,5}/i.test(detailBody),
      cost: /free|\$\d|cost|price|ticket|admission/i.test(detailBody),
      ageRange: /age|year|kid|child|adult|all ages|family|\d+\+/i.test(detailBody),
      organizer: /by |organizer|hosted|presented|contact/i.test(detailBody),
    };
    
    console.log('Detail page field checks:', checks);
    
    // Check for Get Directions button
    const directionsBtn = await page.$('[href*="maps"], [href*="google"], button:has-text("direction"), a:has-text("direction"), [class*="direction"]');
    const directionsText = await page.$$eval('a, button', els => 
      els.map(el => el.textContent.trim()).filter(t => /direction|map|location/i.test(t))
    );
    console.log('Directions-related buttons:', directionsText);
    
    // Check for heart/save button
    const heartBtn = await page.$('[class*="heart"], [class*="save"], [class*="favorite"], [class*="bookmark"], [aria-label*="save"], [aria-label*="heart"], [aria-label*="favorite"]');
    const heartText = await page.$$eval('button, [role="button"]', els =>
      els.map(el => ({ text: el.textContent.trim(), classes: el.className.substring(0, 80), ariaLabel: el.getAttribute('aria-label') || '' }))
         .filter(el => /save|heart|favorite|bookmark|❤|♥/i.test(el.text + el.classes + el.ariaLabel))
    );
    console.log('Heart/save buttons:', heartText);
    
    await screenshot(page, '04-event-detail-full');

    // Test heart/save toggle
    if (heartText.length > 0) {
      try {
        const btn = await page.$('[class*="heart"], [class*="save"], [class*="favorite"]');
        if (btn) {
          await btn.click();
          await sleep(500);
          await screenshot(page, '05-heart-clicked');
          
          // Reload and check persistence
          await page.reload({ waitUntil: 'networkidle' });
          await sleep(1500);
          await screenshot(page, '06-after-reload');
          console.log('Heart save test: clicked and reloaded');
        }
      } catch(e) {
        console.log('Heart click error:', e.message);
      }
    }

    // Test Get Directions
    const dirLinks = await page.$$eval('a', links => 
      links.filter(l => /maps\.google|directions|maps\.apple/i.test(l.href))
           .map(l => ({ href: l.href, text: l.textContent.trim() }))
    );
    console.log('Direction links found:', dirLinks);

    // Test back navigation
    const backBtn = await page.$('[class*="back"], [aria-label*="back"], button:has-text("back"), a:has-text("back"), svg[class*="arrow"]');
    if (backBtn) {
      await backBtn.click();
      await sleep(2000);
      await screenshot(page, '07-back-to-list');
      const backUrl = page.url();
      console.log('After back URL:', backUrl);
    } else {
      await page.goBack();
      await sleep(2000);
      await screenshot(page, '07-back-to-list-browser');
      console.log('Used browser back');
    }

    // Evaluate detail page results
    const detailPassCount = Object.values(checks).filter(Boolean).length;
    const hasMaps = dirLinks.length > 0 || directionsText.length > 0;
    const hasSave = heartText.length > 0;
    
    if (detailPassCount >= 4 && hasMaps) {
      results.eventDetail.status = 'PASS';
    } else if (detailPassCount >= 3) {
      results.eventDetail.status = 'PARTIAL';
    } else {
      results.eventDetail.status = 'FAIL';
    }
    
    results.eventDetail.notes.push(`Fields detected: ${JSON.stringify(checks)}`);
    results.eventDetail.notes.push(`Get Directions: ${hasMaps ? 'Found' : 'NOT FOUND'}`);
    results.eventDetail.notes.push(`Save/Heart button: ${hasSave ? 'Found' : 'NOT FOUND'}`);
    results.eventDetail.notes.push(`Direction links: ${JSON.stringify(dirLinks.slice(0, 2))}`);
    
  } else {
    results.eventDetail.status = 'FAIL';
    results.eventDetail.notes.push('Could not navigate to event detail page - no clickable cards found');
    console.log('⚠️ Could not click into an event detail page');
  }

  // --- TEST 2: DATE FILTERING ---
  console.log('\n--- TEST 2: Date Filtering ---');
  
  // Go back to home
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  
  const filterLabels = await page.$$eval('button, [role="tab"], [class*="filter"], [class*="chip"], [class*="pill"], [class*="tab"]', 
    els => els.map(el => ({ text: el.textContent.trim(), classes: el.className.substring(0, 80) }))
             .filter(el => el.text.length > 0 && el.text.length < 30)
  );
  console.log('Potential filter buttons:', filterLabels);
  
  const dateFilterText = filterLabels.filter(f => 
    /today|weekend|week|month|all/i.test(f.text)
  );
  console.log('Date filter buttons found:', dateFilterText);

  if (dateFilterText.length >= 2) {
    // Get initial event count/content
    const initialContent = await page.textContent('main') || await page.textContent('body');
    
    // Click "This Weekend"
    try {
      const weekendBtn = await page.$('button:has-text("Weekend"), [role="tab"]:has-text("Weekend"), [class*="filter"]:has-text("Weekend")');
      if (weekendBtn) {
        await weekendBtn.click();
        await sleep(1500);
        await screenshot(page, '08-filter-weekend');
        const weekendContent = await page.textContent('main') || await page.textContent('body');
        console.log('Weekend filter: content changed =', weekendContent !== initialContent);
        results.dateFiltering.notes.push('This Weekend filter: clicked');
      }
    } catch(e) {
      console.log('Weekend filter error:', e.message);
    }

    // Click "Today"
    try {
      const todayBtn = await page.$('button:has-text("Today"), [role="tab"]:has-text("Today")');
      if (todayBtn) {
        await todayBtn.click();
        await sleep(1500);
        await screenshot(page, '09-filter-today');
        console.log('Today filter: clicked');
        results.dateFiltering.notes.push('Today filter: clicked');
      }
    } catch(e) {
      console.log('Today filter error:', e.message);
    }

    // Click "All" / "All Dates"
    try {
      const allBtn = await page.$('button:has-text("All"), [role="tab"]:has-text("All")');
      if (allBtn) {
        await allBtn.click();
        await sleep(1500);
        await screenshot(page, '10-filter-all');
        const allContent = await page.textContent('main') || await page.textContent('body');
        const contentRestored = allContent === initialContent || allContent.length >= initialContent.length * 0.8;
        console.log('All filter: content restored =', contentRestored);
        results.dateFiltering.notes.push(`All filter: content restored = ${contentRestored}`);
      }
    } catch(e) {
      console.log('All filter error:', e.message);
    }

    results.dateFiltering.status = 'PASS';
  } else {
    results.dateFiltering.status = 'FAIL';
    results.dateFiltering.notes.push('Date filter buttons not found. Found: ' + JSON.stringify(filterLabels.slice(0, 10)));
    console.log('⚠️ Date filter buttons not found');
  }

  // --- TEST 3: REGION SWITCHER ---
  console.log('\n--- TEST 3: Region Switcher ---');
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  
  // Look for region switcher
  const regionElements = await page.$$eval('select, [class*="region"], [class*="location"], [class*="area"], button, [role="combobox"]',
    els => els.map(el => ({ tag: el.tagName, text: el.textContent.trim().substring(0, 60), classes: el.className.substring(0, 80), value: el.value || '' }))
             .filter(el => el.text.length > 0)
  );
  
  const regionFiltered = regionElements.filter(el => 
    /sf|bay|island|hawaii|region|area|location|honolulu|oakland|san francisco/i.test(el.text + el.classes)
  );
  console.log('Region elements:', regionFiltered);
  
  const initialRegionContent = await page.textContent('body');
  
  // Try select dropdown first
  const regionSelect = await page.$('select[class*="region"], select[name*="region"], select[id*="region"]');
  if (regionSelect) {
    try {
      await regionSelect.selectOption({ label: /big island/i });
      await sleep(2000);
      await screenshot(page, '11-region-big-island');
      const islandContent = await page.textContent('body');
      const changed = islandContent !== initialRegionContent;
      console.log('Region changed to Big Island:', changed);
      
      await regionSelect.selectOption({ label: /sf|bay/i });
      await sleep(2000);
      await screenshot(page, '12-region-sf-bay');
      results.regionSwitcher.status = 'PASS';
      results.regionSwitcher.notes.push('Select dropdown region switcher worked');
    } catch(e) {
      console.log('Region select error:', e.message);
    }
  } else {
    // Try button-based switcher
    const regionBtns = await page.$$eval('button, [role="tab"], [role="option"]', 
      els => els.map(el => ({ text: el.textContent.trim(), classes: el.className.substring(0, 60) }))
               .filter(el => /sf|bay|island|hawaii|big island/i.test(el.text))
    );
    console.log('Region buttons:', regionBtns);
    
    if (regionBtns.length > 0) {
      try {
        // Find Big Island button
        const bigIslandBtn = await page.$('button:has-text("Big Island"), [role="tab"]:has-text("Big Island"), button:has-text("Hawaii")');
        if (bigIslandBtn) {
          await bigIslandBtn.click();
          await sleep(2000);
          await screenshot(page, '11-region-big-island');
          const islandContent = await page.textContent('body');
          const changed = islandContent !== initialRegionContent;
          console.log('Switched to Big Island, content changed:', changed);
          results.regionSwitcher.notes.push(`Big Island switch: content changed = ${changed}`);
          
          // Switch back to SF Bay
          const sfBtn = await page.$('button:has-text("SF Bay"), button:has-text("San Francisco"), [role="tab"]:has-text("SF")');
          if (sfBtn) {
            await sfBtn.click();
            await sleep(2000);
            await screenshot(page, '12-region-sf-bay');
            results.regionSwitcher.status = 'PASS';
            results.regionSwitcher.notes.push('SF Bay switch back: worked');
          } else {
            results.regionSwitcher.status = 'PARTIAL';
            results.regionSwitcher.notes.push('Big Island found but could not switch back to SF Bay');
          }
        } else {
          results.regionSwitcher.status = 'FAIL';
          results.regionSwitcher.notes.push('Big Island button not found. Found: ' + JSON.stringify(regionBtns));
        }
      } catch(e) {
        results.regionSwitcher.status = 'FAIL';
        results.regionSwitcher.notes.push('Region switch error: ' + e.message);
      }
    } else {
      // Check if there's a dropdown/select we might have missed
      const allSelects = await page.$$eval('select', els => els.map(el => ({ name: el.name, id: el.id, options: Array.from(el.options).map(o => o.text) })));
      console.log('All selects:', JSON.stringify(allSelects));
      
      results.regionSwitcher.status = 'FAIL';
      results.regionSwitcher.notes.push('No region switcher found. All selects: ' + JSON.stringify(allSelects));
    }
  }

  // --- OVERALL FEEL ---
  console.log('\n--- OVERALL FEEL ---');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, '13-final-overall');

  // Check for placeholder text
  const bodyFull = await page.textContent('body');
  const placeholders = ['lorem ipsum', 'placeholder', 'TODO', 'coming soon', 'under construction', 'example.com'].filter(p => 
    bodyFull.toLowerCase().includes(p.toLowerCase())
  );
  console.log('Placeholder text found:', placeholders);
  
  // Check for broken images
  const brokenImages = await page.$$eval('img', imgs => 
    imgs.filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => ({ src: img.src, alt: img.alt }))
  );
  console.log('Broken images:', brokenImages.length, brokenImages);
  
  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1000);
  console.log('Console errors:', errors);

  results.overall.notes.push(`Placeholder text: ${placeholders.length === 0 ? 'None found ✅' : placeholders.join(', ')}`);
  results.overall.notes.push(`Broken images: ${brokenImages.length === 0 ? 'None ✅' : brokenImages.length + ' broken'}`);
  results.overall.notes.push(`Page content length: ${bodyFull.length} chars`);

  await browser.close();

  // --- GENERATE REPORT ---
  console.log('\n\n=== FINAL REPORT ===');
  console.log(JSON.stringify(results, null, 2));
  
  return results;
}

run().then(results => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

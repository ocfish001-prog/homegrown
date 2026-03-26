/**
 * Parker Combination Filter Test
 * Tests: age range + region, category + region, date + region combinations
 * Specifically targets the cross-contamination bug that was just fixed.
 */
const { chromium } = require('playwright');

const URL = 'https://homegrown-phase1-app.netlify.app';

function isBigIslandEvent(title, venue) {
  const combined = (title + ' ' + (venue || '')).toLowerCase();
  // Hawaii keywords
  const hawaiiKeywords = ['hawaii', 'kona', 'hilo', 'waimea', 'kohala', 'kailua', 'big island', 'mauna', 'volcano', 'waikoloa', 'kamuela', 'pahoa', 'keaau', 'holualoa'];
  // Bay Area keywords that should NOT appear
  const bayAreaKeywords = ['san francisco', 'sf ', 'oakland', 'berkeley', 'san jose', 'marin', 'palo alto', 'library', 'bay area', 'peninsula', 'east bay', 'south bay', 'richmond', 'fremont', 'hayward'];
  
  const hasBayArea = bayAreaKeywords.some(k => combined.includes(k));
  const hasHawaii = hawaiiKeywords.some(k => combined.includes(k));
  
  return { hasBayArea, hasHawaii, combined };
}

function isSFBayEvent(title, venue) {
  const combined = (title + ' ' + (venue || '')).toLowerCase();
  const bayAreaKeywords = ['san francisco', ' sf', 'oakland', 'berkeley', 'san jose', 'marin', 'palo alto', 'library', 'bay area', 'peninsula', 'east bay', 'south bay'];
  const hawaiiKeywords = ['hawaii', 'kona', 'hilo', 'waimea', 'big island', 'mauna', 'volcano', 'waikoloa', 'kailua'];
  
  const hasHawaii = hawaiiKeywords.some(k => combined.includes(k));
  const hasBayArea = bayAreaKeywords.some(k => combined.includes(k));
  
  return { hasHawaii, hasBayArea, combined };
}

async function getVisibleEvents(page) {
  await page.waitForTimeout(1500);
  
  // Try to get event cards with title + venue
  const events = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="event"], article, [data-testid*="event"]'));
    return cards.map(card => {
      const title = card.querySelector('h2, h3, h4, [class*="title"]')?.textContent?.trim() || '';
      const venue = card.querySelector('[class*="venue"], [class*="location"], [class*="place"]')?.textContent?.trim() || '';
      const text = card.textContent?.trim().slice(0, 200) || '';
      return { title, venue, text };
    }).filter(e => e.title || e.text);
  });
  
  // Also get all text on the page for cross-contamination check
  const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  
  return { events, pageText };
}

async function switchRegion(page, regionName) {
  // Try region tabs/buttons
  const regionButtons = await page.locator('button, [role="tab"]').all();
  for (const btn of regionButtons) {
    const text = await btn.textContent().catch(() => '');
    if (text && text.trim().toLowerCase().includes(regionName.toLowerCase())) {
      await btn.click();
      await page.waitForTimeout(2000);
      console.log(`  ✓ Switched to: ${regionName}`);
      return true;
    }
  }
  
  // Try select dropdown
  try {
    const select = await page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ label: regionName });
      await page.waitForTimeout(2000);
      console.log(`  ✓ Switched to: ${regionName} via select`);
      return true;
    }
  } catch(e) {}
  
  // Try links
  const links = await page.locator('a').all();
  for (const link of links) {
    const text = await link.textContent().catch(() => '');
    if (text && text.trim().toLowerCase().includes(regionName.toLowerCase())) {
      await link.click();
      await page.waitForTimeout(2000);
      console.log(`  ✓ Switched to: ${regionName} via link`);
      return true;
    }
  }
  
  console.log(`  ✗ Could not find region: ${regionName}`);
  return false;
}

async function applyFilter(page, filterText) {
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    if (text && text.trim().toLowerCase().includes(filterText.toLowerCase())) {
      await btn.click();
      await page.waitForTimeout(1500);
      console.log(`  ✓ Applied filter: ${filterText}`);
      return true;
    }
  }
  
  // Try select options
  const selects = await page.locator('select').all();
  for (const sel of selects) {
    const options = await sel.locator('option').all();
    for (const opt of options) {
      const text = await opt.textContent().catch(() => '');
      if (text && text.toLowerCase().includes(filterText.toLowerCase())) {
        await sel.selectOption({ label: text.trim() });
        await page.waitForTimeout(1500);
        console.log(`  ✓ Applied filter via select: ${filterText}`);
        return true;
      }
    }
  }
  
  console.log(`  ✗ Could not find filter: ${filterText}`);
  return false;
}

async function getCurrentRegionIndicator(page) {
  // Check page content for region indicators
  const text = await page.evaluate(() => {
    const heading = document.querySelector('h1, h2')?.textContent || '';
    const regionEl = document.querySelector('[class*="region"], [class*="location-header"]')?.textContent || '';
    return { heading, regionEl, title: document.title };
  });
  return text;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  const results = {
    test1_bigisland_young_kids: { status: 'FAIL', events: [], contamination: [] },
    test1_bigisland_older_kids: { status: 'FAIL', events: [], contamination: [] },
    test1_bigisland_family: { status: 'FAIL', events: [], contamination: [] },
    test2_sf_young_kids: { status: 'FAIL', events: [], contamination: [] },
    test3_category_region: { status: 'FAIL', events: [], contamination: [] },
    test4_date_region: { status: 'FAIL', events: [], contamination: [] },
  };

  try {
    console.log('Loading app...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const initialIndicator = await getCurrentRegionIndicator(page);
    console.log('Initial state:', JSON.stringify(initialIndicator));
    
    await page.screenshot({ path: 'test-screenshots/combo-0-initial.png' });
    
    // ==========================================
    // TEST 1: Age filter on Big Island
    // ==========================================
    console.log('\n========== TEST 1: Age Filters on Big Island ==========');
    
    const switched1 = await switchRegion(page, 'Big Island');
    await page.screenshot({ path: 'test-screenshots/combo-1-big-island.png' });
    
    // 1a: Young Kids
    console.log('\n--- 1a: Young Kids (0-7) ---');
    const appliedYoungKids = await applyFilter(page, 'Young Kids');
    await page.screenshot({ path: 'test-screenshots/combo-1a-youngkids.png' });
    
    const { events: youngKidsEvents, pageText: ykPageText } = await getVisibleEvents(page);
    console.log(`Events found: ${youngKidsEvents.length}`);
    
    // Check for SF/Bay Area contamination
    const sfContamination_yk = [];
    const sfKeywords = ['san francisco', 'sf library', 'sf public', 'oakland', 'berkeley', 'bay area', 'san jose', 'marin'];
    
    for (const kw of sfKeywords) {
      if (ykPageText.includes(kw)) {
        sfContamination_yk.push(kw);
      }
    }
    
    youngKidsEvents.forEach(e => {
      const check = isBigIslandEvent(e.title, e.venue);
      if (check.hasBayArea) {
        sfContamination_yk.push(`Event: "${e.title}" / "${e.venue}"`);
      }
    });
    
    console.log('Young Kids events sample:', youngKidsEvents.slice(0, 3).map(e => e.title || e.text.slice(0, 60)));
    console.log('SF contamination:', sfContamination_yk.length > 0 ? sfContamination_yk : 'NONE ✓');
    
    results.test1_bigisland_young_kids = {
      status: sfContamination_yk.length === 0 ? 'PASS' : 'FAIL',
      events: youngKidsEvents.slice(0, 5).map(e => e.title || e.text.slice(0, 60)),
      contamination: sfContamination_yk
    };
    
    // 1b: Older Kids
    console.log('\n--- 1b: Older Kids (8-14) ---');
    // Reset and re-apply
    await switchRegion(page, 'Big Island');
    const appliedOlderKids = await applyFilter(page, 'Older Kids');
    await page.screenshot({ path: 'test-screenshots/combo-1b-olderkids.png' });
    
    const { events: olderKidsEvents, pageText: okPageText } = await getVisibleEvents(page);
    console.log(`Events found: ${olderKidsEvents.length}`);
    
    const sfContamination_ok = [];
    for (const kw of sfKeywords) {
      if (okPageText.includes(kw)) {
        sfContamination_ok.push(kw);
      }
    }
    olderKidsEvents.forEach(e => {
      const check = isBigIslandEvent(e.title, e.venue);
      if (check.hasBayArea) sfContamination_ok.push(`Event: "${e.title}"`);
    });
    
    console.log('Older Kids events sample:', olderKidsEvents.slice(0, 3).map(e => e.title || e.text.slice(0, 60)));
    console.log('SF contamination:', sfContamination_ok.length > 0 ? sfContamination_ok : 'NONE ✓');
    
    results.test1_bigisland_older_kids = {
      status: sfContamination_ok.length === 0 ? 'PASS' : 'FAIL',
      events: olderKidsEvents.slice(0, 5).map(e => e.title || e.text.slice(0, 60)),
      contamination: sfContamination_ok
    };
    
    // 1c: Family
    console.log('\n--- 1c: Family ---');
    await switchRegion(page, 'Big Island');
    const appliedFamily = await applyFilter(page, 'Family');
    await page.screenshot({ path: 'test-screenshots/combo-1c-family.png' });
    
    const { events: familyEvents, pageText: famPageText } = await getVisibleEvents(page);
    console.log(`Events found: ${familyEvents.length}`);
    
    const sfContamination_fam = [];
    for (const kw of sfKeywords) {
      if (famPageText.includes(kw)) {
        sfContamination_fam.push(kw);
      }
    }
    familyEvents.forEach(e => {
      const check = isBigIslandEvent(e.title, e.venue);
      if (check.hasBayArea) sfContamination_fam.push(`Event: "${e.title}"`);
    });
    
    console.log('Family events sample:', familyEvents.slice(0, 3).map(e => e.title || e.text.slice(0, 60)));
    console.log('SF contamination:', sfContamination_fam.length > 0 ? sfContamination_fam : 'NONE ✓');
    
    results.test1_bigisland_family = {
      status: sfContamination_fam.length === 0 ? 'PASS' : 'FAIL',
      events: familyEvents.slice(0, 5).map(e => e.title || e.text.slice(0, 60)),
      contamination: sfContamination_fam
    };
    
    // ==========================================
    // TEST 2: Age filter on SF Bay Area
    // ==========================================
    console.log('\n========== TEST 2: Age Filters on SF Bay Area ==========');
    
    const switched2 = await switchRegion(page, 'SF Bay');
    await page.screenshot({ path: 'test-screenshots/combo-2-sf-bay.png' });
    
    const appliedYoungKidsSF = await applyFilter(page, 'Young Kids');
    await page.screenshot({ path: 'test-screenshots/combo-2a-sf-youngkids.png' });
    
    const { events: sfYoungEvents, pageText: sfYkPageText } = await getVisibleEvents(page);
    console.log(`SF Young Kids events found: ${sfYoungEvents.length}`);
    
    const hawaiiContamination_sf = [];
    const hawaiiKeywords = ['hawaii', 'kona', 'hilo', 'big island', 'waimea', 'kohala', 'mauna', 'volcano', 'waikoloa', 'kailua-kona'];
    
    for (const kw of hawaiiKeywords) {
      if (sfYkPageText.includes(kw)) {
        hawaiiContamination_sf.push(kw);
      }
    }
    sfYoungEvents.forEach(e => {
      const check = isSFBayEvent(e.title, e.venue);
      if (check.hasHawaii) hawaiiContamination_sf.push(`Event: "${e.title}"`);
    });
    
    console.log('SF Young Kids events sample:', sfYoungEvents.slice(0, 3).map(e => e.title || e.text.slice(0, 60)));
    console.log('Hawaii contamination:', hawaiiContamination_sf.length > 0 ? hawaiiContamination_sf : 'NONE ✓');
    
    results.test2_sf_young_kids = {
      status: hawaiiContamination_sf.length === 0 ? 'PASS' : 'FAIL',
      events: sfYoungEvents.slice(0, 5).map(e => e.title || e.text.slice(0, 60)),
      contamination: hawaiiContamination_sf
    };
    
    // ==========================================
    // TEST 3: Category filter + Big Island region
    // ==========================================
    console.log('\n========== TEST 3: Category + Big Island ==========');
    
    await switchRegion(page, 'Big Island');
    
    // Try common category filters
    let cat3Applied = false;
    for (const cat of ['Music', 'Arts', 'Sports', 'Education', 'Outdoors', 'STEM']) {
      cat3Applied = await applyFilter(page, cat);
      if (cat3Applied) {
        console.log(`  Applied category: ${cat}`);
        break;
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/combo-3-category-region.png' });
    
    const { events: catEvents, pageText: catPageText } = await getVisibleEvents(page);
    console.log(`Category+Region events found: ${catEvents.length}`);
    
    const sfContamination_cat = [];
    for (const kw of sfKeywords) {
      if (catPageText.includes(kw)) {
        sfContamination_cat.push(kw);
      }
    }
    catEvents.forEach(e => {
      const check = isBigIslandEvent(e.title, e.venue);
      if (check.hasBayArea) sfContamination_cat.push(`Event: "${e.title}"`);
    });
    
    console.log('Category events sample:', catEvents.slice(0, 3).map(e => e.title || e.text.slice(0, 60)));
    console.log('SF contamination:', sfContamination_cat.length > 0 ? sfContamination_cat : 'NONE ✓');
    
    results.test3_category_region = {
      status: sfContamination_cat.length === 0 ? 'PASS' : 'FAIL',
      events: catEvents.slice(0, 5).map(e => e.title || e.text.slice(0, 60)),
      contamination: sfContamination_cat,
      note: cat3Applied ? 'Category filter applied' : 'No category filter found'
    };
    
    // ==========================================
    // TEST 4: Date filter + Big Island region
    // ==========================================
    console.log('\n========== TEST 4: Date Filter + Big Island ==========');
    
    await switchRegion(page, 'Big Island');
    
    let date4Applied = false;
    for (const dateFilter of ['This Month', 'This Week', 'Weekend']) {
      date4Applied = await applyFilter(page, dateFilter);
      if (date4Applied) {
        console.log(`  Applied date filter: ${dateFilter}`);
        break;
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/combo-4-date-region.png' });
    
    const { events: dateEvents, pageText: datePageText } = await getVisibleEvents(page);
    console.log(`Date+Region events found: ${dateEvents.length}`);
    
    const sfContamination_date = [];
    for (const kw of sfKeywords) {
      if (datePageText.includes(kw)) {
        sfContamination_date.push(kw);
      }
    }
    dateEvents.forEach(e => {
      const check = isBigIslandEvent(e.title, e.venue);
      if (check.hasBayArea) sfContamination_date.push(`Event: "${e.title}"`);
    });
    
    console.log('Date events sample:', dateEvents.slice(0, 3).map(e => e.title || e.text.slice(0, 60)));
    console.log('SF contamination:', sfContamination_date.length > 0 ? sfContamination_date : 'NONE ✓');
    
    results.test4_date_region = {
      status: sfContamination_date.length === 0 ? 'PASS' : 'FAIL',
      events: dateEvents.slice(0, 5).map(e => e.title || e.text.slice(0, 60)),
      contamination: sfContamination_date,
      note: date4Applied ? 'Date filter applied' : 'No date filter found'
    };
    
  } catch(err) {
    console.error('Test error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
  
  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n\n========================================');
  console.log('PARKER COMBINATION FILTER TEST — SUMMARY');
  console.log('========================================');
  
  const t1a = results.test1_bigisland_young_kids.status;
  const t1b = results.test1_bigisland_older_kids.status;
  const t1c = results.test1_bigisland_family.status;
  const t2 = results.test2_sf_young_kids.status;
  const t3 = results.test3_category_region.status;
  const t4 = results.test4_date_region.status;
  
  const test1Overall = (t1a === 'PASS' && t1b === 'PASS' && t1c === 'PASS') ? 'PASS' : 'FAIL';
  const allPassed = test1Overall === 'PASS' && t2 === 'PASS' && t3 === 'PASS' && t4 === 'PASS';
  
  console.log(`Test 1 (Age filter on Big Island): ${test1Overall}`);
  console.log(`  - Young Kids: ${t1a} | Events: ${results.test1_bigisland_young_kids.events.join(', ').slice(0, 100)}`);
  console.log(`  - Older Kids: ${t1b} | Events: ${results.test1_bigisland_older_kids.events.join(', ').slice(0, 100)}`);
  console.log(`  - Family: ${t1c} | Events: ${results.test1_bigisland_family.events.join(', ').slice(0, 100)}`);
  console.log(`Test 2 (Age filter on SF Bay): ${t2} | Events: ${results.test2_sf_young_kids.events.join(', ').slice(0, 100)}`);
  console.log(`Test 3 (Category + region): ${t3} | ${results.test3_category_region.note || ''}`);
  console.log(`Test 4 (Date + region): ${t4} | ${results.test4_date_region.note || ''}`);
  console.log(`\nOverall Verdict: ${allPassed ? '✅ APPROVED' : '❌ REJECTED'}`);
  
  if (!allPassed) {
    console.log('\nContamination details:');
    if (results.test1_bigisland_young_kids.contamination.length > 0)
      console.log('  T1a contamination:', results.test1_bigisland_young_kids.contamination);
    if (results.test1_bigisland_older_kids.contamination.length > 0)
      console.log('  T1b contamination:', results.test1_bigisland_older_kids.contamination);
    if (results.test1_bigisland_family.contamination.length > 0)
      console.log('  T1c contamination:', results.test1_bigisland_family.contamination);
    if (results.test2_sf_young_kids.contamination.length > 0)
      console.log('  T2 contamination:', results.test2_sf_young_kids.contamination);
    if (results.test3_category_region.contamination.length > 0)
      console.log('  T3 contamination:', results.test3_category_region.contamination);
    if (results.test4_date_region.contamination.length > 0)
      console.log('  T4 contamination:', results.test4_date_region.contamination);
  }
  
  // Output JSON for parsing
  console.log('\n--- JSON RESULTS ---');
  console.log(JSON.stringify({
    verdict: allPassed ? 'APPROVED' : 'REJECTED',
    test1_overall: test1Overall,
    test1a_young_kids_bigisland: t1a,
    test1b_older_kids_bigisland: t1b,
    test1c_family_bigisland: t1c,
    test2_youngkids_sfbay: t2,
    test3_category_region: t3,
    test4_date_region: t4,
    details: results
  }, null, 2));
  
})();

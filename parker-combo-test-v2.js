/**
 * Parker Combination Filter Test v2
 * Tests age/category/date filters in combination with regions
 * Correctly handles two-step region switcher (click header → click region option)
 */
const { chromium } = require('playwright');

const URL = 'https://homegrown-phase1-app.netlify.app';

async function switchToRegion(page, regionName) {
  // Step 1: Click the current region button to open picker
  const regionBtns = await page.locator('button').filter({ hasText: /Big Island|SF Bay/ }).all();
  if (regionBtns.length === 0) {
    console.log('  ✗ No region button found');
    return false;
  }
  
  // Click the first visible region button (the header one)
  for (const btn of regionBtns) {
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      await btn.click();
      await page.waitForTimeout(1000);
      break;
    }
  }
  
  // Step 2: Select target region from picker
  const allBtns = await page.locator('button').all();
  for (const btn of allBtns) {
    const text = await btn.textContent().catch(() => '');
    const trimmed = text.trim();
    if (trimmed.toLowerCase().includes(regionName.toLowerCase())) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        await page.waitForTimeout(2000);
        console.log(`  ✓ Switched to: ${regionName}`);
        return true;
      }
    }
  }
  
  console.log(`  ✗ Could not find region option: ${regionName}`);
  return false;
}

async function applyFilter(page, filterText) {
  const buttons = await page.locator('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    if (text && text.trim().toLowerCase().includes(filterText.toLowerCase())) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        await page.waitForTimeout(1500);
        console.log(`  ✓ Applied filter: ${text.trim()}`);
        return true;
      }
    }
  }
  console.log(`  ✗ Could not find filter: ${filterText}`);
  return false;
}

async function resetFilters(page) {
  // Click "All Ages" and "All Dates" and "All" category to reset
  for (const filter of ['All Ages', '📅 All Dates', 'All']) {
    const btn = page.locator('button').filter({ hasText: filter }).first();
    try {
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch(e) {}
  }
  await page.waitForTimeout(500);
}

async function getPageSnapshot(page) {
  await page.waitForTimeout(1000);
  const snapshot = await page.evaluate(() => {
    return document.body.innerText;
  });
  return snapshot;
}

async function getCurrentRegion(page) {
  const snapshot = await page.evaluate(() => document.body.innerText.slice(0, 500));
  if (snapshot.includes('SF Bay')) return 'SF Bay Area';
  if (snapshot.includes('Big Island')) return 'Big Island, Hawaii';
  return 'Unknown';
}

function checkForSFContamination(text) {
  const sfKeywords = ['san francisco', 'sf library', 'sf public library', 'oakland', 'berkeley', 
                      'san jose', 'marin', 'bay area', 'palo alto', 'richmond district',
                      'sunset district', 'mission district', 'soma', 'tenderloin', 'hayes valley',
                      'civic center', 'castro', 'noe valley', 'potrero', 'dogpatch',
                      'alameda', 'emeryville', 'el cerrito', 'albany ca'];
  const lower = text.toLowerCase();
  return sfKeywords.filter(kw => lower.includes(kw));
}

function checkForHawaiiContamination(text) {
  // When we're on SF Bay, Hawaii events should NOT appear
  const hawaiiKeywords = ['kona', 'hilo, hi', 'waimea, hi', 'kohala', 'mauna kea', 'mauna loa',
                          'volcano, hi', 'waikoloa', 'kamuela', 'pahoa', 'keaau', 
                          'hawaii island', 'big island, hi', 'puna, hi', 'kau, hi'];
  const lower = text.toLowerCase();
  return hawaiiKeywords.filter(kw => lower.includes(kw));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  
  const testResults = {
    test1a: { name: 'Young Kids on Big Island', status: 'FAIL', events: '', contamination: [], eventCount: 0 },
    test1b: { name: 'Older Kids on Big Island', status: 'FAIL', events: '', contamination: [], eventCount: 0 },
    test1c: { name: 'Family on Big Island', status: 'FAIL', events: '', contamination: [], eventCount: 0 },
    test2:  { name: 'Young Kids on SF Bay', status: 'FAIL', events: '', contamination: [], eventCount: 0 },
    test3:  { name: 'Category filter on Big Island', status: 'FAIL', events: '', contamination: [], eventCount: 0 },
    test4:  { name: 'Date filter on Big Island', status: 'FAIL', events: '', contamination: [], eventCount: 0 },
  };
  
  try {
    console.log('Loading app...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-screenshots/v2-0-initial.png' });
    
    // ==========================================
    // TEST 1a: Young Kids on Big Island
    // ==========================================
    console.log('\n=== TEST 1a: Young Kids + Big Island ===');
    await switchToRegion(page, 'Big Island');
    await resetFilters(page);
    
    const currentRegion1a = await getCurrentRegion(page);
    console.log('  Current region:', currentRegion1a);
    
    await applyFilter(page, 'Young Kids');
    await page.screenshot({ path: 'test-screenshots/v2-1a-youngkids-bigisland.png' });
    
    const snapshot1a = await getPageSnapshot(page);
    const sfContam1a = checkForSFContamination(snapshot1a);
    
    // Count events
    const count1a = (snapshot1a.match(/\d+ mi away|\d+ miles away|mi away/g) || []).length;
    // Get event titles from snapshot
    const lines1a = snapshot1a.split('\n').filter(l => l.trim().length > 5).slice(0, 50);
    const eventSample1a = lines1a.filter(l => !l.match(/^(All|Events|Classes|Music|Arts|Sports|Community|Young|Older|Family|Today|Weekend|Week|Month|Dates|Home|Discover|Calendar|Saved|Skip|Homegrown|Enrichment|Big Island|SF Bay|Free|Events Near)/)).slice(0, 5).join(' | ');
    
    console.log('  SF contamination found:', sfContam1a.length > 0 ? sfContam1a : 'NONE ✓');
    console.log('  Event sample:', eventSample1a.slice(0, 200));
    console.log('  Region still:', currentRegion1a.includes('Big Island') ? 'Big Island ✓' : 'WRONG REGION ✗');
    
    // Check region didn't change
    const regionAfter1a = await getCurrentRegion(page);
    const regionOk1a = regionAfter1a.includes('Big Island');
    
    testResults.test1a = {
      name: 'Young Kids on Big Island',
      status: sfContam1a.length === 0 && regionOk1a ? 'PASS' : 'FAIL',
      events: eventSample1a.slice(0, 150),
      contamination: sfContam1a,
      eventCount: count1a,
      region: regionAfter1a
    };
    
    // ==========================================
    // TEST 1b: Older Kids on Big Island
    // ==========================================
    console.log('\n=== TEST 1b: Older Kids + Big Island ===');
    await resetFilters(page);
    
    // Make sure we're on Big Island (shouldn't have changed)
    const regionCheck1b = await getCurrentRegion(page);
    if (!regionCheck1b.includes('Big Island')) {
      await switchToRegion(page, 'Big Island');
    }
    
    await applyFilter(page, 'Older Kids');
    await page.screenshot({ path: 'test-screenshots/v2-1b-olderkids-bigisland.png' });
    
    const snapshot1b = await getPageSnapshot(page);
    const sfContam1b = checkForSFContamination(snapshot1b);
    const regionAfter1b = await getCurrentRegion(page);
    const regionOk1b = regionAfter1b.includes('Big Island');
    const lines1b = snapshot1b.split('\n').filter(l => l.trim().length > 5).slice(0, 50);
    const eventSample1b = lines1b.filter(l => !l.match(/^(All|Events|Classes|Music|Arts|Sports|Community|Young|Older|Family|Today|Weekend|Week|Month|Dates|Home|Discover|Calendar|Saved|Skip|Homegrown|Enrichment|Big Island|SF Bay|Free|Events Near)/)).slice(0, 5).join(' | ');
    
    console.log('  SF contamination:', sfContam1b.length > 0 ? sfContam1b : 'NONE ✓');
    console.log('  Event sample:', eventSample1b.slice(0, 200));
    
    testResults.test1b = {
      name: 'Older Kids on Big Island',
      status: sfContam1b.length === 0 && regionOk1b ? 'PASS' : 'FAIL',
      events: eventSample1b.slice(0, 150),
      contamination: sfContam1b,
      region: regionAfter1b
    };
    
    // ==========================================
    // TEST 1c: Family on Big Island
    // ==========================================
    console.log('\n=== TEST 1c: Family + Big Island ===');
    await resetFilters(page);
    
    const regionCheck1c = await getCurrentRegion(page);
    if (!regionCheck1c.includes('Big Island')) {
      await switchToRegion(page, 'Big Island');
    }
    
    await applyFilter(page, 'Family');
    await page.screenshot({ path: 'test-screenshots/v2-1c-family-bigisland.png' });
    
    const snapshot1c = await getPageSnapshot(page);
    const sfContam1c = checkForSFContamination(snapshot1c);
    const regionAfter1c = await getCurrentRegion(page);
    const regionOk1c = regionAfter1c.includes('Big Island');
    const lines1c = snapshot1c.split('\n').filter(l => l.trim().length > 5).slice(0, 50);
    const eventSample1c = lines1c.filter(l => !l.match(/^(All|Events|Classes|Music|Arts|Sports|Community|Young|Older|Family|Today|Weekend|Week|Month|Dates|Home|Discover|Calendar|Saved|Skip|Homegrown|Enrichment|Big Island|SF Bay|Free|Events Near)/)).slice(0, 5).join(' | ');
    
    console.log('  SF contamination:', sfContam1c.length > 0 ? sfContam1c : 'NONE ✓');
    console.log('  Event sample:', eventSample1c.slice(0, 200));
    
    testResults.test1c = {
      name: 'Family on Big Island',
      status: sfContam1c.length === 0 && regionOk1c ? 'PASS' : 'FAIL',
      events: eventSample1c.slice(0, 150),
      contamination: sfContam1c,
      region: regionAfter1c
    };
    
    // ==========================================
    // TEST 2: Young Kids on SF Bay Area
    // ==========================================
    console.log('\n=== TEST 2: Young Kids + SF Bay Area ===');
    
    // Switch to SF Bay
    await resetFilters(page);
    const switched2 = await switchToRegion(page, 'SF Bay');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/v2-2-sf-switched.png' });
    
    const regionCheck2 = await getCurrentRegion(page);
    console.log('  After switch, region is:', regionCheck2);
    
    await applyFilter(page, 'Young Kids');
    await page.screenshot({ path: 'test-screenshots/v2-2a-youngkids-sfbay.png' });
    
    const snapshot2 = await getPageSnapshot(page);
    const hawaiiContam2 = checkForHawaiiContamination(snapshot2);
    const regionAfter2 = await getCurrentRegion(page);
    const regionOk2 = regionAfter2.includes('SF Bay');
    const lines2 = snapshot2.split('\n').filter(l => l.trim().length > 5).slice(0, 60);
    const eventSample2 = lines2.filter(l => !l.match(/^(All|Events|Classes|Music|Arts|Sports|Community|Young|Older|Family|Today|Weekend|Week|Month|Dates|Home|Discover|Calendar|Saved|Skip|Homegrown|Enrichment|Big Island|SF Bay|Free|Events Near)/)).slice(0, 5).join(' | ');
    
    // Also check if Hawaii appears anywhere notable in page content
    const lowerSnap2 = snapshot2.toLowerCase();
    const hawaiiKeywordsGeneral = ['hawaii', 'big island', 'waimea', 'waikoloa', 'kailua-kona', 'hilo'];
    const hawaiiMentions2 = hawaiiKeywordsGeneral.filter(k => lowerSnap2.includes(k));
    
    console.log('  Current region:', regionAfter2);
    console.log('  Hawaii contamination (specific venues):', hawaiiContam2.length > 0 ? hawaiiContam2 : 'NONE ✓');
    console.log('  Hawaii words anywhere on page:', hawaiiMentions2.length > 0 ? hawaiiMentions2 : 'NONE ✓');
    console.log('  Event sample:', eventSample2.slice(0, 200));
    
    // For SF Bay, fail if Hawaii-specific venue keywords appear in events
    testResults.test2 = {
      name: 'Young Kids on SF Bay',
      status: hawaiiContam2.length === 0 && regionOk2 ? 'PASS' : 'FAIL',
      events: eventSample2.slice(0, 150),
      contamination: hawaiiContam2,
      region: regionAfter2,
      note: hawaiiMentions2.length > 0 ? `Hawaii words on page: ${hawaiiMentions2.join(', ')}` : ''
    };
    
    // ==========================================
    // TEST 3: Category + Big Island
    // ==========================================
    console.log('\n=== TEST 3: Category Filter + Big Island ===');
    
    await switchToRegion(page, 'Big Island');
    await resetFilters(page);
    
    const regionCheck3 = await getCurrentRegion(page);
    console.log('  Region:', regionCheck3);
    
    let cat3Applied = false;
    let cat3Name = '';
    for (const cat of ['Music', 'Arts', 'Sports', 'Community', 'Classes', 'Camps']) {
      cat3Applied = await applyFilter(page, cat);
      if (cat3Applied) {
        cat3Name = cat;
        break;
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/v2-3-category-bigisland.png' });
    
    const snapshot3 = await getPageSnapshot(page);
    const sfContam3 = checkForSFContamination(snapshot3);
    const regionAfter3 = await getCurrentRegion(page);
    const regionOk3 = regionAfter3.includes('Big Island');
    const lines3 = snapshot3.split('\n').filter(l => l.trim().length > 5).slice(0, 60);
    const eventSample3 = lines3.filter(l => !l.match(/^(All|Events|Classes|Music|Arts|Sports|Community|Young|Older|Family|Today|Weekend|Week|Month|Dates|Home|Discover|Calendar|Saved|Skip|Homegrown|Enrichment|Big Island|SF Bay|Free|Events Near)/)).slice(0, 5).join(' | ');
    
    console.log('  Category applied:', cat3Name);
    console.log('  SF contamination:', sfContam3.length > 0 ? sfContam3 : 'NONE ✓');
    console.log('  Event sample:', eventSample3.slice(0, 200));
    
    testResults.test3 = {
      name: `Category (${cat3Name}) on Big Island`,
      status: sfContam3.length === 0 && regionOk3 ? 'PASS' : 'FAIL',
      events: eventSample3.slice(0, 150),
      contamination: sfContam3,
      region: regionAfter3,
      note: cat3Applied ? `Applied: ${cat3Name}` : 'No category filter found'
    };
    
    // ==========================================
    // TEST 4: Date + Big Island
    // ==========================================
    console.log('\n=== TEST 4: Date Filter + Big Island ===');
    
    await resetFilters(page);
    
    const regionCheck4 = await getCurrentRegion(page);
    if (!regionCheck4.includes('Big Island')) {
      await switchToRegion(page, 'Big Island');
    }
    
    let date4Applied = false;
    let date4Name = '';
    for (const df of ['This Month', 'This Week', 'This Weekend', 'Today']) {
      date4Applied = await applyFilter(page, df);
      if (date4Applied) {
        date4Name = df;
        break;
      }
    }
    
    await page.screenshot({ path: 'test-screenshots/v2-4-date-bigisland.png' });
    
    const snapshot4 = await getPageSnapshot(page);
    const sfContam4 = checkForSFContamination(snapshot4);
    const regionAfter4 = await getCurrentRegion(page);
    const regionOk4 = regionAfter4.includes('Big Island');
    const lines4 = snapshot4.split('\n').filter(l => l.trim().length > 5).slice(0, 60);
    const eventSample4 = lines4.filter(l => !l.match(/^(All|Events|Classes|Music|Arts|Sports|Community|Young|Older|Family|Today|Weekend|Week|Month|Dates|Home|Discover|Calendar|Saved|Skip|Homegrown|Enrichment|Big Island|SF Bay|Free|Events Near)/)).slice(0, 5).join(' | ');
    
    console.log('  Date filter applied:', date4Name);
    console.log('  SF contamination:', sfContam4.length > 0 ? sfContam4 : 'NONE ✓');
    console.log('  Event sample:', eventSample4.slice(0, 200));
    
    testResults.test4 = {
      name: `Date (${date4Name}) on Big Island`,
      status: sfContam4.length === 0 && regionOk4 ? 'PASS' : 'FAIL',
      events: eventSample4.slice(0, 150),
      contamination: sfContam4,
      region: regionAfter4,
      note: date4Applied ? `Applied: ${date4Name}` : 'No date filter found'
    };
    
  } catch(err) {
    console.error('Test error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
  
  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n\n=====================================');
  console.log('PARKER COMBINATION FILTER TEST v2');
  console.log('=====================================\n');
  
  const t1_bigisland = (testResults.test1a.status === 'PASS' && testResults.test1b.status === 'PASS' && testResults.test1c.status === 'PASS') ? 'PASS' : 'FAIL';
  const t2 = testResults.test2.status;
  const t3 = testResults.test3.status;
  const t4 = testResults.test4.status;
  
  const allPassed = t1_bigisland === 'PASS' && t2 === 'PASS' && t3 === 'PASS' && t4 === 'PASS';
  
  console.log(`Test 1 (Age filter on Big Island): ${t1_bigisland}`);
  console.log(`  1a Young Kids: ${testResults.test1a.status} — ${testResults.test1a.events || 'no events shown'}`);
  console.log(`  1b Older Kids: ${testResults.test1b.status} — ${testResults.test1b.events || 'no events shown'}`);
  console.log(`  1c Family:     ${testResults.test1c.status} — ${testResults.test1c.events || 'no events shown'}`);
  console.log(`Test 2 (Age filter SF Bay): ${t2} — ${testResults.test2.events || 'no events shown'}`);
  if (testResults.test2.note) console.log(`  Note: ${testResults.test2.note}`);
  console.log(`Test 3 (Category + region): ${t3} — ${testResults.test3.note || ''}`);
  console.log(`Test 4 (Date + region): ${t4} — ${testResults.test4.note || ''}`);
  
  console.log(`\nVerdict: ${allPassed ? '✅ APPROVED' : '❌ REJECTED'}`);
  
  if (!allPassed) {
    console.log('\nContamination details:');
    Object.entries(testResults).forEach(([key, r]) => {
      if (r.contamination && r.contamination.length > 0) {
        console.log(`  ${key} (${r.name}): ${r.contamination.join(', ')}`);
      }
    });
  }
  
  console.log('\n--- JSON ---');
  console.log(JSON.stringify({
    verdict: allPassed ? 'APPROVED' : 'REJECTED',
    test1_bigisland_age_filters: t1_bigisland,
    test2_sf_bay_youngkids: t2,
    test3_category_region: t3,
    test4_date_region: t4,
    details: testResults
  }, null, 2));
  
})();

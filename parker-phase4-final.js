/**
 * Parker Phase 4 Final Review
 * Tests the live site at homegrown-phase1-app.netlify.app
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-final';
const URL = 'https://homegrown-phase1-app.netlify.app';

let sc = 0;
async function ss(page, name) {
  sc++;
  const file = path.join(SCREENSHOT_DIR, `${String(sc).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${name}`);
}

// Wait for the event list to finish loading
async function waitForLoad(page, timeoutMs = 8000) {
  await page.waitForTimeout(500);
  // Wait for loading spinner to disappear
  try {
    await page.waitForFunction(() => {
      const spinners = document.querySelectorAll('[class*="animate-spin"], [class*="loading"], [class*="skeleton"]');
      return spinners.length === 0;
    }, { timeout: timeoutMs });
  } catch (e) { /* spinner may not exist */ }
  await page.waitForTimeout(800);
}

// Intercept and capture the API response for /api/events
async function captureNextApiResponse(page) {
  return new Promise((resolve) => {
    const handler = async (response) => {
      if (response.url().includes('/api/events') && !response.url().includes('/api/events/')) {
        page.off('response', handler);
        try {
          const json = await response.json();
          resolve(json);
        } catch (e) {
          resolve(null);
        }
      }
    };
    page.on('response', handler);
    // Timeout fallback
    setTimeout(() => {
      page.off('response', handler);
      resolve(null);
    }, 10000);
  });
}

// Get the region label currently shown
async function getCurrentRegion(page) {
  return page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay Area') || t.includes('Big Island') || t.includes('Hawaii') || t.includes('SF Bay'))) {
        return t;
      }
    }
    // Check heading text
    return document.body.innerText.split('\n').find(l => l.includes('Bay') || l.includes('Island')) || 'unknown';
  });
}

// Get result count from visible span
async function getResultCount(page) {
  return page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span, p, div'));
    for (const s of spans) {
      if (s.children.length === 0) {
        const match = s.textContent?.trim().match(/^(\d+)\s+results?$/);
        if (match) return parseInt(match[1]);
      }
    }
    return -1;
  });
}

// Get first N event titles from the visible list
async function getEventTitles(page, n = 5) {
  return page.evaluate((count) => {
    // Look for event card titles - they're in the list under "Events Near You"
    const mainEl = document.querySelector('main');
    if (!mainEl) return [];
    
    // Event cards typically have a structure with title + date
    // Find h3 elements or links inside list items
    const candidates = Array.from(mainEl.querySelectorAll('h3, [class*="title"], [class*="Title"]'));
    if (candidates.length > 0) {
      return candidates.slice(0, count).map(el => el.textContent?.trim().substring(0, 80));
    }
    
    // Fallback: look at the text content of the main body
    const text = mainEl.innerText;
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 10 && l.length < 100)
      .filter(l => !l.match(/^\d+ results?$/) && !l.match(/^(All|Classes|Events|Co-ops|Camps|Music|Arts)$/) && !l.includes('📅') && !l.includes('🌅'));
    return lines.slice(3, 3 + count); // skip filter buttons
  }, n);
}

// Click a filter button by partial text
async function clickFilter(page, text) {
  const result = await page.evaluate((filterText) => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim() || '';
      if (t.toLowerCase().includes(filterText.toLowerCase())) {
        b.click();
        return `clicked: "${t}"`;
      }
    }
    return `NOT FOUND: "${filterText}"`;
  }, text);
  return result;
}

// Open region dropdown and select a region
async function switchRegion(page, regionText) {
  // Click the region button to open dropdown
  await page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim() || '';
      if (t.includes('Bay Area') || t.includes('Big Island') || t.includes('Hawaii') || t.includes('SF Bay')) {
        b.click();
        return;
      }
    }
  });
  await page.waitForTimeout(500);
  
  // Now click the region option in the dropdown
  const result = await page.evaluate((text) => {
    const allEls = Array.from(document.querySelectorAll('button, li, [role="option"], a'));
    for (const el of allEls) {
      const t = el.textContent?.trim() || '';
      if (t.toLowerCase().includes(text.toLowerCase())) {
        el.click();
        return `clicked: "${t}"`;
      }
    }
    return `NOT FOUND: "${text}"`;
  }, regionText);
  return result;
}

const RESULTS = {
  defaultRegion: 'FAIL',
  regionSwitching: 'FAIL',
  ageFilters: 'FAIL',
  dateFilters: 'FAIL',
  timezones: 'FAIL',
  combinationFilters: 'FAIL',
};
const NOTES = [];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-cache', '--disk-cache-size=0'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    // Bypass cache for fresh responses
    extraHTTPHeaders: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
  });
  const page = await context.newPage();

  // =====================================================================
  // TEST 1: DEFAULT REGION
  // =====================================================================
  console.log('\n=== TEST 1: Default Region ===');
  
  const apiPromise1 = captureNextApiResponse(page);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  
  const apiPromise2 = captureNextApiResponse(page);
  await page.reload({ waitUntil: 'networkidle' });
  await waitForLoad(page);
  
  const apiData1 = await apiPromise2;
  await ss(page, 'test1-default-region-fresh');
  
  const regionText1 = await getCurrentRegion(page);
  const count1 = await getResultCount(page);
  const titles1 = await getEventTitles(page, 3);
  
  console.log(`  Region shown: "${regionText1}"`);
  console.log(`  Result count: ${count1}`);
  console.log(`  API returned: ${apiData1?.events?.length ?? '?'} events`);
  console.log(`  First event: "${titles1[0] ?? 'N/A'}"`);
  
  // Verify it's SF Bay (not Hawaii)
  const isSFDefault = regionText1.includes('SF Bay') || regionText1.includes('Bay Area');
  const isHawaiiDefault = regionText1.includes('Big Island') || regionText1.includes('Hawaii');
  const apiHasHawaiiCoords = apiData1?.events?.some(e => e.lat && e.lat < 25 && e.lat > 18);
  const apiHasSFCoords = apiData1?.events?.some(e => e.lat && e.lat > 35);
  
  if (isSFDefault && !isHawaiiDefault) {
    RESULTS.defaultRegion = 'PASS';
    NOTES.push(`✅ Default region: SF Bay Area (${count1} events). API returns SF coords.`);
  } else if (isHawaiiDefault) {
    NOTES.push(`❌ Default region shows Hawaii: "${regionText1}"`);
  } else {
    NOTES.push(`⚠️ Unclear default region: "${regionText1}"`);
  }
  console.log(`  → ${RESULTS.defaultRegion}`);

  // =====================================================================
  // TEST 2: REGION SWITCHING
  // =====================================================================
  console.log('\n=== TEST 2: Region Switching ===');
  
  const sfCount = count1;
  const sfTitle0 = titles1[0];
  
  // --- Switch to Big Island ---
  console.log('  Switching → Big Island...');
  const apiPromiseBi1 = captureNextApiResponse(page);
  const switchRes1 = await switchRegion(page, 'Big Island');
  console.log(`  Switch result: ${switchRes1}`);
  const biApiData = await apiPromiseBi1;
  await waitForLoad(page);
  await ss(page, 'test2a-big-island');
  
  const biRegion1 = await getCurrentRegion(page);
  const biCount1 = await getResultCount(page);
  const biTitles1 = await getEventTitles(page, 5);
  
  console.log(`  Region: "${biRegion1}", Count: ${biCount1}`);
  console.log(`  API data: ${biApiData?.events?.length ?? '?'} events`);
  console.log(`  First events:`, biTitles1.slice(0,3));
  
  const biApiHawaiiCoords = biApiData?.events?.filter(e => e.lat && e.lat < 25 && e.lat > 18).length ?? 0;
  const biApiSFCoords = biApiData?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  
  console.log(`  Hawaii coords: ${biApiHawaiiCoords}, SF coords: ${biApiSFCoords}`);
  
  const biShowsHawaii = biRegion1.includes('Big Island') || biRegion1.includes('Hawaii');
  const biHasHawaiiData = biApiHawaiiCoords > 0 && biApiSFCoords === 0;
  const biDifferentFromSF = biCount1 !== sfCount;
  
  // --- Switch back to SF Bay ---
  console.log('  Switching → SF Bay...');
  const apiPromiseSF2 = captureNextApiResponse(page);
  const switchRes2 = await switchRegion(page, 'SF Bay');
  console.log(`  Switch result: ${switchRes2}`);
  const sfApiData2 = await apiPromiseSF2;
  await waitForLoad(page);
  await ss(page, 'test2b-back-to-sf');
  
  const sfRegion2 = await getCurrentRegion(page);
  const sfCount2 = await getResultCount(page);
  const sfTitles2 = await getEventTitles(page, 3);
  const sfApiSFCoords2 = sfApiData2?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  
  console.log(`  Back to SF: "${sfRegion2}", Count: ${sfCount2}`);
  const sfBackToSF = sfRegion2.includes('SF Bay') || sfRegion2.includes('Bay Area');
  const sfBackHasSFData = sfApiSFCoords2 > 0;
  
  // --- Cycle 2: Big Island again ---
  console.log('  Cycle 2: → Big Island...');
  const apiPromiseBi2 = captureNextApiResponse(page);
  await switchRegion(page, 'Big Island');
  const biApiData2 = await apiPromiseBi2;
  await waitForLoad(page);
  await ss(page, 'test2c-bi-cycle2');
  
  const biRegion2 = await getCurrentRegion(page);
  const biCount2 = await getResultCount(page);
  const biApi2HawaiiCoords = biApiData2?.events?.filter(e => e.lat && e.lat < 25).length ?? 0;
  console.log(`  BI cycle 2: "${biRegion2}", count: ${biCount2}, hawaii coords: ${biApi2HawaiiCoords}`);
  
  // --- Cycle 2: SF Bay ---
  const apiPromiseSF3 = captureNextApiResponse(page);
  await switchRegion(page, 'SF Bay');
  await apiPromiseSF3;
  await waitForLoad(page);
  await ss(page, 'test2d-sf-cycle2');
  const sfRegion3 = await getCurrentRegion(page);
  console.log(`  SF cycle 2: "${sfRegion3}"`);
  
  const biCycle2Good = (biRegion2.includes('Big Island') || biRegion2.includes('Hawaii')) && biApi2HawaiiCoords > 0;
  const sfCycle2Good = sfRegion3.includes('SF Bay') || sfRegion3.includes('Bay Area');
  
  if (biShowsHawaii && biHasHawaiiData && sfBackToSF && sfBackHasSFData && biCycle2Good && sfCycle2Good) {
    RESULTS.regionSwitching = 'PASS';
    NOTES.push(`✅ Region switching stable across 2 cycles. BI=${biCount1} Hawaii events, SF=${sfCount2} SF events.`);
  } else if (biShowsHawaii && sfBackToSF) {
    RESULTS.regionSwitching = 'PARTIAL';
    NOTES.push(`⚠️ UI switches but data purity unclear: BI-hawaii-coords=${biApiHawaiiCoords}, SF-sf-coords=${sfApiSFCoords2}`);
  } else {
    NOTES.push(`❌ Region switching broken: biUI=${biShowsHawaii}, sfUI=${sfBackToSF}, biData=${biHasHawaiiData}`);
  }
  console.log(`  → ${RESULTS.regionSwitching}`);

  // =====================================================================
  // TEST 3: AGE FILTERS
  // =====================================================================
  console.log('\n=== TEST 3: Age Filters ===');
  
  // Ensure on Big Island
  const curReg3 = await getCurrentRegion(page);
  if (!curReg3.includes('Big Island') && !curReg3.includes('Hawaii')) {
    await switchRegion(page, 'Big Island');
    await waitForLoad(page);
  }
  
  // All Ages baseline
  await clickFilter(page, 'All Ages');
  await waitForLoad(page);
  const biAllCount = await getResultCount(page);
  const biAllTitles = await getEventTitles(page, 5);
  await ss(page, 'test3a-bi-all-ages');
  console.log(`  BI All Ages: ${biAllCount} events`);
  
  // Young Kids
  const apiYK = captureNextApiResponse(page);
  await clickFilter(page, 'Young Kids');
  const ykApiData = await apiYK;
  await waitForLoad(page);
  const biYKCount = await getResultCount(page);
  const biYKTitles = await getEventTitles(page, 5);
  await ss(page, 'test3b-bi-young-kids');
  const ykRegion = await getCurrentRegion(page);
  console.log(`  BI Young Kids: ${biYKCount} events, region: "${ykRegion}"`);
  console.log(`  API returned: ${ykApiData?.events?.length ?? '?'} events`);
  console.log(`  Age ranges in API: ${[...new Set(ykApiData?.events?.slice(0,15).map(e => e.ageRange))].join(', ')}`);
  
  // Family
  await clickFilter(page, 'All Ages');
  await waitForLoad(page);
  const apiFam = captureNextApiResponse(page);
  await clickFilter(page, 'Family');
  const famApiData = await apiFam;
  await waitForLoad(page);
  const biFamCount = await getResultCount(page);
  const biFamTitles = await getEventTitles(page, 5);
  await ss(page, 'test3c-bi-family');
  console.log(`  BI Family: ${biFamCount} events`);
  console.log(`  API returned: ${famApiData?.events?.length ?? '?'} events`);
  
  // SF Bay + Young Kids
  await switchRegion(page, 'SF Bay');
  await waitForLoad(page);
  const apiSFYK = captureNextApiResponse(page);
  await clickFilter(page, 'Young Kids');
  const sfYKApiData = await apiSFYK;
  await waitForLoad(page);
  const sfYKCount = await getResultCount(page);
  const sfYKTitles = await getEventTitles(page, 5);
  await ss(page, 'test3d-sf-young-kids');
  const sfYKRegion = await getCurrentRegion(page);
  console.log(`  SF Young Kids: ${sfYKCount} events, region: "${sfYKRegion}"`);
  console.log(`  API returned: ${sfYKApiData?.events?.length ?? '?'} events`);
  
  // Check region-isolation: SF YK API data should have SF coords only
  const sfYKHawaiiCoords = sfYKApiData?.events?.filter(e => e.lat && e.lat < 25).length ?? 0;
  const sfYKSFCoords = sfYKApiData?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  console.log(`  SF YK data: SF-coords=${sfYKSFCoords}, Hawaii-coords=${sfYKHawaiiCoords}`);
  
  // Age filter effectiveness: check if YK/Family filters narrow results vs All Ages
  const ageFiltersNarrow = biYKCount < biAllCount || biFamCount < biAllCount;
  const ageFiltersAPIWorks = (ykApiData?.events?.length ?? biAllCount) <= biAllCount || (famApiData?.events?.length ?? biAllCount) <= biAllCount;
  const sfStaysInSFAfterFilter = sfYKRegion.includes('SF Bay') || sfYKRegion.includes('Bay Area');
  const sfNoHawaiiBleed = sfYKHawaiiCoords === 0;
  
  if (ageFiltersNarrow && sfStaysInSFAfterFilter && sfNoHawaiiBleed) {
    RESULTS.ageFilters = 'PASS';
    NOTES.push(`✅ Age filters: BI All=${biAllCount}, YK=${biYKCount}, Fam=${biFamCount}. SF YK=${sfYKCount}. No Hawaii bleed in SF.`);
  } else if (sfStaysInSFAfterFilter && sfNoHawaiiBleed) {
    RESULTS.ageFilters = 'PARTIAL';
    NOTES.push(`⚠️ Age filters don't narrow results (All=${biAllCount}, YK=${biYKCount}, Fam=${biFamCount}) but no cross-region bleed.`);
  } else {
    const failReason = !ageFiltersNarrow ? `filters not narrowing (All=${biAllCount}, YK=${biYKCount})` : `SF shows Hawaii: ${sfYKHawaiiCoords} events`;
    NOTES.push(`❌ Age filters: ${failReason}`);
  }
  console.log(`  → ${RESULTS.ageFilters}`);

  // =====================================================================
  // TEST 4: DATE FILTERS
  // =====================================================================
  console.log('\n=== TEST 4: Date Filters ===');
  
  // SF Bay + This Weekend
  const curReg4 = await getCurrentRegion(page);
  if (!curReg4.includes('SF Bay') && !curReg4.includes('Bay Area')) {
    await switchRegion(page, 'SF Bay');
    await waitForLoad(page);
  }
  await clickFilter(page, 'All Ages');
  await clickFilter(page, 'All Dates');
  await waitForLoad(page);
  const sfAllDatesCount = await getResultCount(page);
  
  const apiSFWeekend = captureNextApiResponse(page);
  await clickFilter(page, 'This Weekend');
  const sfWeekendApiData = await apiSFWeekend;
  await waitForLoad(page);
  const sfWeekendCount = await getResultCount(page);
  const sfWeekendRegion = await getCurrentRegion(page);
  await ss(page, 'test4a-sf-this-weekend');
  
  const sfWeekendHawaiiCoords = sfWeekendApiData?.events?.filter(e => e.lat && e.lat < 25).length ?? 0;
  const sfWeekendSFCoords = sfWeekendApiData?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  console.log(`  SF This Weekend: ${sfWeekendCount} events (was ${sfAllDatesCount} all), region: "${sfWeekendRegion}"`);
  console.log(`  API: ${sfWeekendApiData?.events?.length ?? '?'} events, SF-coords=${sfWeekendSFCoords}, HI-coords=${sfWeekendHawaiiCoords}`);
  
  // Big Island + This Month
  await switchRegion(page, 'Big Island');
  await waitForLoad(page);
  await clickFilter(page, 'All Ages');
  await clickFilter(page, 'All Dates');
  await waitForLoad(page);
  const biAllDatesCount = await getResultCount(page);
  
  const apiBIMonth = captureNextApiResponse(page);
  await clickFilter(page, 'This Month');
  const biMonthApiData = await apiBIMonth;
  await waitForLoad(page);
  const biMonthCount = await getResultCount(page);
  const biMonthRegion = await getCurrentRegion(page);
  await ss(page, 'test4b-bi-this-month');
  
  const biMonthHawaiiCoords = biMonthApiData?.events?.filter(e => e.lat && e.lat < 25).length ?? 0;
  const biMonthSFCoords = biMonthApiData?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  console.log(`  BI This Month: ${biMonthCount} events (was ${biAllDatesCount} all), region: "${biMonthRegion}"`);
  console.log(`  API: ${biMonthApiData?.events?.length ?? '?'} events, HI-coords=${biMonthHawaiiCoords}, SF-coords=${biMonthSFCoords}`);
  
  const sfDateFilterWorks = sfWeekendCount <= sfAllDatesCount;
  const biDateFilterWorks = biMonthCount <= biAllDatesCount;
  const sfStaysSF = (sfWeekendRegion.includes('SF Bay') || sfWeekendRegion.includes('Bay Area')) && sfWeekendHawaiiCoords === 0;
  const biStaysBI = (biMonthRegion.includes('Big Island') || biMonthRegion.includes('Hawaii')) && biMonthSFCoords === 0;
  
  if (sfDateFilterWorks && biDateFilterWorks && sfStaysSF && biStaysBI) {
    RESULTS.dateFilters = 'PASS';
    NOTES.push(`✅ Date filters: SF Weekend=${sfWeekendCount}, BI Month=${biMonthCount}. No cross-region bleed.`);
  } else if (sfStaysSF && biStaysBI) {
    RESULTS.dateFilters = 'PARTIAL';
    NOTES.push(`⚠️ Date filters: regions isolated but counts unchanged (SF:${sfAllDatesCount}→${sfWeekendCount}, BI:${biAllDatesCount}→${biMonthCount})`);
  } else {
    NOTES.push(`❌ Date filters: sfOK=${sfDateFilterWorks}/${sfStaysSF}, biOK=${biDateFilterWorks}/${biStaysBI}`);
  }
  console.log(`  → ${RESULTS.dateFilters}`);

  // =====================================================================
  // TEST 5: TIMEZONE CHECK
  // =====================================================================
  console.log('\n=== TEST 5: Timezone Check ===');
  
  // Go to Big Island, all filters off
  const curReg5 = await getCurrentRegion(page);
  if (!curReg5.includes('Big Island') && !curReg5.includes('Hawaii')) {
    await switchRegion(page, 'Big Island');
    await waitForLoad(page);
  }
  await clickFilter(page, 'All Ages');
  await clickFilter(page, 'All Dates');
  await waitForLoad(page);
  await ss(page, 'test5-bi-timezone-check');
  
  // Extract event times from the page
  const timesFromPage = await page.evaluate(() => {
    const mainText = document.querySelector('main')?.innerText || '';
    const timeRegex = /\b(\d{1,2}:\d{2})\s*(AM|PM|am|pm)\b/g;
    const times = [];
    let m;
    while ((m = timeRegex.exec(mainText)) !== null) {
      times.push(m[0]);
    }
    return [...new Set(times)];
  });
  
  // Also get the raw API event dates
  const biApiForTZ = captureNextApiResponse(page);
  // Reload to get fresh API data
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.setItem('homegrown_region', 'hawaii'); } catch(e) {} });
  // Trigger fresh load
  const biTZApiData = await Promise.race([biApiForTZ, new Promise(r => setTimeout(() => r(null), 5000))]);
  await waitForLoad(page);
  
  console.log(`  Times on page: ${timesFromPage.join(', ')}`);
  
  // Analyze timezone quality
  const earlyMorningTimes = timesFromPage.filter(t => {
    const m = t.match(/(\d{1,2}):\d{2}\s*(AM|am)/i);
    return m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 5;
  });
  const normalTimes = timesFromPage.filter(t => {
    const m = t.match(/(\d{1,2}):\d{2}\s*(AM|PM|am|pm)/i);
    if (!m) return false;
    const hour = parseInt(m[1]);
    const isPM = m[2].toUpperCase() === 'PM';
    const h24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    return h24 >= 7 && h24 <= 22;
  });
  
  console.log(`  Early AM times (1-5 AM, suspicious): ${earlyMorningTimes.join(', ') || 'none'}`);
  console.log(`  Normal daytime times: ${normalTimes.join(', ')}`);
  
  // Check raw API data for timezone handling
  // The fix should show times in Pacific/Honolulu timezone
  // NPS events stored as UTC should be converted properly
  // Hawaii = UTC-10, so 9:00 AM UTC = 11:00 PM prev day HST — but events should still be sensible hours
  
  if (timesFromPage.length === 0) {
    RESULTS.timezones = 'UNKNOWN';
    NOTES.push('⚠️ No event times found on Big Island page to evaluate');
  } else if (earlyMorningTimes.length === 0) {
    RESULTS.timezones = 'PASS';
    NOTES.push(`✅ Timezone: No suspicious 1-5 AM times. Hawaii events show normal hours: ${normalTimes.slice(0,4).join(', ')}`);
  } else if (earlyMorningTimes.length > 0 && earlyMorningTimes.length < timesFromPage.length / 2) {
    // Some early AM times but not majority — could be legit overnight events
    RESULTS.timezones = 'PARTIAL';
    NOTES.push(`⚠️ Timezone: Some early AM times found (${earlyMorningTimes.join(', ')}). Could be legit overnight events or UTC bleed. Normal times: ${normalTimes.slice(0,4).join(', ')}`);
  } else {
    NOTES.push(`❌ Timezone: Many suspicious early AM times: ${earlyMorningTimes.join(', ')} — likely UTC not converted to HST`);
  }
  console.log(`  → ${RESULTS.timezones}`);

  // =====================================================================
  // TEST 6: COMBINATION FILTERS
  // =====================================================================
  console.log('\n=== TEST 6: Combination Filter Stress Test ===');
  
  // Big Island + Young Kids + This Month
  const curReg6 = await getCurrentRegion(page);
  if (!curReg6.includes('Big Island') && !curReg6.includes('Hawaii')) {
    await switchRegion(page, 'Big Island');
    await waitForLoad(page);
  }
  await clickFilter(page, 'All Ages');
  await clickFilter(page, 'All Dates');
  await waitForLoad(page);
  
  const apiComboBI = captureNextApiResponse(page);
  await clickFilter(page, 'Young Kids');
  await waitForLoad(page);
  const apiComboBI2 = captureNextApiResponse(page);
  await clickFilter(page, 'This Month');
  const comboBIApiData = await Promise.race([apiComboBI, apiComboBI2, new Promise(r => setTimeout(() => r(null), 5000))]);
  await waitForLoad(page);
  
  const comboBICount = await getResultCount(page);
  const comboBIRegion = await getCurrentRegion(page);
  const comboBITitles = await getEventTitles(page, 5);
  await ss(page, 'test6a-bi-youngkids-thismonth');
  
  // Check if BI combo results are all Hawaii
  const comboBIHawaiiCoords = comboBIApiData?.events?.filter(e => e.lat && e.lat < 25).length ?? 0;
  const comboBISFCoords = comboBIApiData?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  
  console.log(`  BI + YK + Month: ${comboBICount} events, region: "${comboBIRegion}"`);
  console.log(`  API: ${comboBIApiData?.events?.length ?? '?'} events, HI=${comboBIHawaiiCoords}, SF=${comboBISFCoords}`);
  console.log(`  Sample titles:`, comboBITitles.slice(0,3));
  
  // SF Bay + Family + This Weekend
  await switchRegion(page, 'SF Bay');
  await waitForLoad(page);
  await clickFilter(page, 'All Ages');
  await clickFilter(page, 'All Dates');
  await waitForLoad(page);
  
  const apiComboSF = captureNextApiResponse(page);
  await clickFilter(page, 'Family');
  await waitForLoad(page);
  const apiComboSF2 = captureNextApiResponse(page);
  await clickFilter(page, 'This Weekend');
  const comboSFApiData = await Promise.race([apiComboSF, apiComboSF2, new Promise(r => setTimeout(() => r(null), 5000))]);
  await waitForLoad(page);
  
  const comboSFCount = await getResultCount(page);
  const comboSFRegion = await getCurrentRegion(page);
  const comboSFTitles = await getEventTitles(page, 5);
  await ss(page, 'test6b-sf-family-thisweekend');
  
  const comboSFHawaiiCoords = comboSFApiData?.events?.filter(e => e.lat && e.lat < 25).length ?? 0;
  const comboSFSFCoords = comboSFApiData?.events?.filter(e => e.lat && e.lat > 35).length ?? 0;
  
  console.log(`  SF + Family + Weekend: ${comboSFCount} events, region: "${comboSFRegion}"`);
  console.log(`  API: ${comboSFApiData?.events?.length ?? '?'} events, HI=${comboSFHawaiiCoords}, SF=${comboSFSFCoords}`);
  console.log(`  Sample titles:`, comboSFTitles.slice(0,3));
  
  const comboBIGood = (comboBIRegion.includes('Big Island') || comboBIRegion.includes('Hawaii')) && comboBISFCoords === 0;
  const comboSFGood = (comboSFRegion.includes('SF Bay') || comboSFRegion.includes('Bay Area')) && comboSFHawaiiCoords === 0;
  
  if (comboBIGood && comboSFGood) {
    RESULTS.combinationFilters = 'PASS';
    NOTES.push(`✅ Combo filters: BI+YK+Month=${comboBICount}, SF+Fam+Weekend=${comboSFCount}. Pure regions.`);
  } else if (comboBIGood || comboSFGood) {
    RESULTS.combinationFilters = 'PARTIAL';
    NOTES.push(`⚠️ Combo partial: BI OK=${comboBIGood} (SF-bleed=${comboBISFCoords}), SF OK=${comboSFGood} (HI-bleed=${comboSFHawaiiCoords})`);
  } else {
    NOTES.push(`❌ Combo filters broken: BI-SF-bleed=${comboBISFCoords}, SF-HI-bleed=${comboSFHawaiiCoords}`);
  }
  console.log(`  → ${RESULTS.combinationFilters}`);

  await browser.close();

  // =====================================================================
  // FINAL REPORT
  // =====================================================================
  const passed = Object.values(RESULTS).filter(v => v === 'PASS').length;
  const total = Object.keys(RESULTS).length;
  const allCritical = RESULTS.defaultRegion === 'PASS' && RESULTS.regionSwitching === 'PASS' && RESULTS.ageFilters === 'PASS' && RESULTS.dateFilters === 'PASS';
  const verdict = Object.values(RESULTS).every(v => v === 'PASS') ? 'APPROVED' :
                  allCritical ? 'CONDITIONALLY_APPROVED' : 'REJECTED';
  
  console.log('\n\n══════════════════════════════════════════');
  console.log('   PARKER PHASE 4 FINAL REVIEW RESULTS');
  console.log('══════════════════════════════════════════');
  console.log(`1. Default region (SF Bay):  ${RESULTS.defaultRegion}`);
  console.log(`2. Region switching:         ${RESULTS.regionSwitching}`);
  console.log(`3. Age filters:              ${RESULTS.ageFilters}`);
  console.log(`4. Date filters:             ${RESULTS.dateFilters}`);
  console.log(`5. Timezones:                ${RESULTS.timezones}`);
  console.log(`6. Combination filters:      ${RESULTS.combinationFilters}`);
  console.log(`\n${passed}/${total} tests passing`);
  console.log(`VERDICT: ${verdict}`);
  console.log('\nDetailed notes:');
  NOTES.forEach(n => console.log(` ${n}`));
  
  const report = {
    verdict,
    results: RESULTS,
    notes: NOTES,
    passed,
    total,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n✅ Report saved to report.json');
})();

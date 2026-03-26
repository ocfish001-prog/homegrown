const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-final';
const URL = 'https://homegrown-phase1-app.netlify.app';

let screenshotCount = 0;
async function screenshot(page, name) {
  screenshotCount++;
  const filename = path.join(SCREENSHOT_DIR, `${String(screenshotCount).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`📸 ${filename}`);
}

async function waitAndScreenshot(page, name, ms = 1500) {
  await page.waitForTimeout(ms);
  await screenshot(page, name);
}

async function getVisibleEventTitles(page) {
  return await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="event-card"], .event-card, article, [class*="EventCard"], [class*="event-card"]');
    if (cards.length > 0) {
      return Array.from(cards).slice(0, 10).map(c => c.textContent?.trim().substring(0, 80));
    }
    // Fallback: look for h2/h3 elements that might be event titles
    const headings = document.querySelectorAll('h2, h3');
    return Array.from(headings).slice(0, 10).map(h => h.textContent?.trim().substring(0, 80));
  });
}

async function getPageText(page) {
  return await page.evaluate(() => document.body.innerText.substring(0, 3000));
}

async function getRegionButtonText(page) {
  return await page.evaluate(() => {
    // Look for region selector button
    const btns = Array.from(document.querySelectorAll('button, [role="button"], select'));
    for (const btn of btns) {
      const text = btn.textContent?.trim();
      if (text && (text.includes('Bay') || text.includes('Hawaii') || text.includes('Big Island') || text.includes('Region') || text.includes('SF'))) {
        return text;
      }
    }
    // Check select elements
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      const opt = sel.options[sel.selectedIndex];
      if (opt) return `SELECT: ${opt.text}`;
    }
    return 'NOT FOUND';
  });
}

async function getEventCount(page) {
  return await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="event-card"], .event-card, article');
    if (cards.length > 0) return cards.length;
    // Try other common patterns
    const items = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="event"], [class*="Event"]');
    return items.length;
  });
}

async function getEventTimeSamples(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    // Find time patterns like "10:00 AM", "2:30 PM", "1:00 AM"
    const timePattern = /\d{1,2}:\d{2}\s*(AM|PM|am|pm)/g;
    const matches = text.match(timePattern) || [];
    return [...new Set(matches)].slice(0, 15);
  });
}

async function clickRegion(page, regionText) {
  // Try to find and click a region selector
  const clicked = await page.evaluate((text) => {
    // Try buttons
    const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
    for (const btn of btns) {
      if (btn.textContent?.includes(text) || btn.getAttribute('aria-label')?.includes(text)) {
        btn.click();
        return `clicked button: ${btn.textContent?.trim().substring(0, 50)}`;
      }
    }
    // Try select
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.includes(text) || opt.value.includes(text)) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return `selected: ${opt.text}`;
        }
      }
    }
    // Try links
    const links = Array.from(document.querySelectorAll('a, [role="tab"], [role="menuitem"]'));
    for (const link of links) {
      if (link.textContent?.includes(text)) {
        link.click();
        return `clicked link: ${link.textContent?.trim().substring(0, 50)}`;
      }
    }
    return 'NOT FOUND';
  }, regionText);
  return clicked;
}

async function clickFilter(page, filterText) {
  const clicked = await page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], label, input[type="radio"], input[type="checkbox"]'));
    for (const btn of btns) {
      const btnText = btn.textContent?.trim() || btn.getAttribute('aria-label') || '';
      if (btnText.toLowerCase().includes(text.toLowerCase())) {
        btn.click();
        return `clicked: ${btnText.substring(0, 50)}`;
      }
    }
    // Try select options
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      for (const opt of sel.options) {
        if (opt.text.toLowerCase().includes(text.toLowerCase())) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return `selected option: ${opt.text}`;
        }
      }
    }
    return 'NOT FOUND';
  }, filterText);
  return clicked;
}

const results = {
  defaultRegion: 'FAIL',
  regionSwitching: 'FAIL',
  ageFilters: 'FAIL',
  dateFilters: 'FAIL',
  timezones: 'FAIL',
  combinationFilters: 'FAIL',
  notes: []
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('\n🧪 === PARKER PHASE 4 FINAL REVIEW ===\n');

  // ============================================================
  // TEST 1: DEFAULT REGION
  // ============================================================
  console.log('--- TEST 1: Default Region ---');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await screenshot(page, 'test1-default-region-fresh');

  const pageTextAfterClear = await getPageText(page);
  const regionBtn = await getRegionButtonText(page);
  console.log('Region button text:', regionBtn);
  console.log('Page excerpt:', pageTextAfterClear.substring(0, 500));

  const defaultIsSF = pageTextAfterClear.toLowerCase().includes('sf bay') || 
                       pageTextAfterClear.toLowerCase().includes('san francisco') ||
                       pageTextAfterClear.toLowerCase().includes('bay area') ||
                       regionBtn.toLowerCase().includes('sf') ||
                       regionBtn.toLowerCase().includes('bay');
  const defaultIsBigIsland = pageTextAfterClear.toLowerCase().includes('big island') ||
                              pageTextAfterClear.toLowerCase().includes('hawaii') ||
                              regionBtn.toLowerCase().includes('big island') ||
                              regionBtn.toLowerCase().includes('hawaii');

  if (defaultIsSF && !defaultIsBigIsland) {
    results.defaultRegion = 'PASS';
    results.notes.push('✅ Default region is SF Bay Area');
  } else if (defaultIsBigIsland) {
    results.notes.push('❌ Default region is Big Island (should be SF Bay)');
  } else {
    results.notes.push(`⚠️ Could not determine default region. Region btn: "${regionBtn}"`);
  }
  console.log('Default region result:', results.defaultRegion);

  // ============================================================
  // TEST 2: REGION SWITCHING
  // ============================================================
  console.log('\n--- TEST 2: Region Switching ---');
  
  let sfEventSample1 = await getPageText(page);
  
  // Switch to Big Island
  console.log('Switching to Big Island...');
  let switchResult = await clickRegion(page, 'Big Island');
  console.log('Switch result:', switchResult);
  if (switchResult === 'NOT FOUND') {
    switchResult = await clickRegion(page, 'Hawaii');
    console.log('Hawaii switch result:', switchResult);
  }
  await page.waitForTimeout(2000);
  await screenshot(page, 'test2-switched-to-big-island');
  
  const biText1 = await getPageText(page);
  const biLoaded = biText1.toLowerCase().includes('hawaii') || biText1.toLowerCase().includes('big island') || biText1.toLowerCase().includes('kona') || biText1.toLowerCase().includes('hilo');
  console.log('Big Island loaded:', biLoaded, '| Text sample:', biText1.substring(0, 200));

  // Switch back to SF Bay
  console.log('Switching back to SF Bay...');
  let sfSwitch1 = await clickRegion(page, 'SF Bay');
  console.log('SF switch result:', sfSwitch1);
  if (sfSwitch1 === 'NOT FOUND') {
    sfSwitch1 = await clickRegion(page, 'Bay Area');
    console.log('Bay Area switch result:', sfSwitch1);
  }
  await page.waitForTimeout(2000);
  await screenshot(page, 'test2-switched-back-to-sf');
  
  const sfText2 = await getPageText(page);
  const sfReloaded = sfText2.toLowerCase().includes('sf bay') || sfText2.toLowerCase().includes('san francisco') || sfText2.toLowerCase().includes('bay area') || sfText2.toLowerCase().includes('oakland') || sfText2.toLowerCase().includes('berkeley');
  console.log('SF reloaded:', sfReloaded, '| Text sample:', sfText2.substring(0, 200));

  // Switch to Big Island again
  console.log('Switching to Big Island (2nd time)...');
  await clickRegion(page, 'Big Island');
  await page.waitForTimeout(2000);
  await screenshot(page, 'test2-big-island-again');
  const biText2 = await getPageText(page);
  const biLoaded2 = biText2.toLowerCase().includes('hawaii') || biText2.toLowerCase().includes('big island');

  // Switch back to SF
  console.log('Switching back to SF (2nd time)...');
  await clickRegion(page, 'SF Bay');
  await page.waitForTimeout(2000);
  await screenshot(page, 'test2-sf-final');
  const sfText3 = await getPageText(page);
  const sfReloaded2 = sfText3.toLowerCase().includes('sf bay') || sfText3.toLowerCase().includes('san francisco') || sfText3.toLowerCase().includes('bay area');

  if (biLoaded && sfReloaded && biLoaded2 && sfReloaded2) {
    results.regionSwitching = 'PASS';
    results.notes.push('✅ Region switching stable across 2-3 cycles');
  } else if (biLoaded || sfReloaded) {
    results.regionSwitching = 'PARTIAL';
    results.notes.push(`⚠️ Region switching partially working: BI1=${biLoaded}, SF1=${sfReloaded}, BI2=${biLoaded2}, SF2=${sfReloaded2}`);
  } else {
    results.notes.push(`❌ Region switching not working: BI1=${biLoaded}, SF1=${sfReloaded}`);
  }
  console.log('Region switching result:', results.regionSwitching);

  // ============================================================
  // TEST 3: AGE FILTERS
  // ============================================================
  console.log('\n--- TEST 3: Age Filters ---');
  
  // Go to Big Island
  await clickRegion(page, 'Big Island');
  await page.waitForTimeout(1500);
  const biAllText = await getPageText(page);
  await screenshot(page, 'test3-bi-all-events');
  console.log('Big Island all events sample:', biAllText.substring(0, 300));

  // Select Young Kids
  console.log('Selecting Young Kids filter...');
  let ykResult = await clickFilter(page, 'Young Kids');
  console.log('Young Kids click result:', ykResult);
  if (ykResult === 'NOT FOUND') {
    ykResult = await clickFilter(page, '0-7');
    console.log('0-7 click result:', ykResult);
  }
  await page.waitForTimeout(1500);
  await screenshot(page, 'test3-bi-young-kids');
  const biYKText = await getPageText(page);
  console.log('BI Young Kids text sample:', biYKText.substring(0, 300));

  // Select Family
  console.log('Selecting Family filter...');
  const famResult = await clickFilter(page, 'Family');
  console.log('Family click result:', famResult);
  await page.waitForTimeout(1500);
  await screenshot(page, 'test3-bi-family');
  const biFamText = await getPageText(page);
  console.log('BI Family text sample:', biFamText.substring(0, 300));

  // Go to SF Bay, Young Kids
  await clickRegion(page, 'SF Bay');
  await page.waitForTimeout(1500);
  
  // Reset age filter first
  const allAgesResult = await clickFilter(page, 'All Ages');
  console.log('All Ages result:', allAgesResult);
  await page.waitForTimeout(1000);
  
  const sfYKResult = await clickFilter(page, 'Young Kids');
  console.log('SF Young Kids result:', sfYKResult);
  await page.waitForTimeout(1500);
  await screenshot(page, 'test3-sf-young-kids');
  const sfYKText = await getPageText(page);
  console.log('SF Young Kids text sample:', sfYKText.substring(0, 300));

  // Check if filters changed results (different text content between states)
  const ageFiltersWorking = biAllText !== biYKText || biYKText !== biFamText;
  const sfYKHasSF = sfYKText.toLowerCase().includes('sf bay') || sfYKText.toLowerCase().includes('san francisco') || sfYKText.toLowerCase().includes('bay area') || sfYKText.toLowerCase().includes('oakland');
  const sfYKHasHawaii = sfYKText.toLowerCase().includes('hawaii') || sfYKText.toLowerCase().includes('big island') || sfYKText.toLowerCase().includes('kona');

  if (ageFiltersWorking && sfYKHasSF && !sfYKHasHawaii) {
    results.ageFilters = 'PASS';
    results.notes.push('✅ Age filters work and stay within region');
  } else if (ageFiltersWorking) {
    results.ageFilters = 'PARTIAL';
    results.notes.push(`⚠️ Age filters change results but cross-region check unclear. SF has SF: ${sfYKHasSF}, SF has Hawaii: ${sfYKHasHawaii}`);
  } else {
    results.notes.push(`❌ Age filters not changing results or region bleeding. FiltersWork: ${ageFiltersWorking}`);
  }
  console.log('Age filters result:', results.ageFilters);

  // ============================================================
  // TEST 4: DATE FILTERS
  // ============================================================
  console.log('\n--- TEST 4: Date Filters ---');

  // SF Bay + This Weekend
  await clickRegion(page, 'SF Bay');
  await page.waitForTimeout(1200);
  await clickFilter(page, 'All Ages');
  await page.waitForTimeout(800);

  console.log('Selecting This Weekend...');
  const weekendResult = await clickFilter(page, 'This Weekend');
  console.log('This Weekend result:', weekendResult);
  await page.waitForTimeout(1500);
  await screenshot(page, 'test4-sf-this-weekend');
  const sfWeekendText = await getPageText(page);
  console.log('SF Weekend text sample:', sfWeekendText.substring(0, 300));

  const sfWeekendHasSF = sfWeekendText.toLowerCase().includes('sf bay') || sfWeekendText.toLowerCase().includes('san francisco') || sfWeekendText.toLowerCase().includes('bay area');
  const sfWeekendHasHawaii = sfWeekendText.toLowerCase().includes('hawaii') || sfWeekendText.toLowerCase().includes('big island');

  // Big Island + This Month
  await clickRegion(page, 'Big Island');
  await page.waitForTimeout(1200);
  
  // Reset date filter
  const allTimeResult = await clickFilter(page, 'All Time');
  console.log('All Time result:', allTimeResult);
  if (allTimeResult === 'NOT FOUND') {
    await clickFilter(page, 'Any Time');
    await clickFilter(page, 'All Dates');
  }
  await page.waitForTimeout(800);

  console.log('Selecting This Month...');
  const monthResult = await clickFilter(page, 'This Month');
  console.log('This Month result:', monthResult);
  await page.waitForTimeout(1500);
  await screenshot(page, 'test4-bi-this-month');
  const biMonthText = await getPageText(page);
  console.log('BI Month text sample:', biMonthText.substring(0, 300));

  const biMonthHasHawaii = biMonthText.toLowerCase().includes('hawaii') || biMonthText.toLowerCase().includes('big island') || biMonthText.toLowerCase().includes('kona') || biMonthText.toLowerCase().includes('hilo');
  const biMonthHasSF = biMonthText.toLowerCase().includes('sf bay') || biMonthText.toLowerCase().includes('san francisco');

  if (sfWeekendHasSF && !sfWeekendHasHawaii && biMonthHasHawaii && !biMonthHasSF) {
    results.dateFilters = 'PASS';
    results.notes.push('✅ Date filters work and events stay within their region');
  } else if (sfWeekendResult !== 'NOT FOUND' || monthResult !== 'NOT FOUND') {
    results.dateFilters = 'PARTIAL';
    results.notes.push(`⚠️ Date filters found but region purity unclear. SF-weekend hasSF:${sfWeekendHasSF}, hasHawaii:${sfWeekendHasHawaii}. BI-month hasHawaii:${biMonthHasHawaii}, hasSF:${biMonthHasSF}`);
  } else {
    results.notes.push(`❌ Date filters not found or not working`);
  }
  console.log('Date filters result:', results.dateFilters);

  // ============================================================
  // TEST 5: TIMEZONE CHECK
  // ============================================================
  console.log('\n--- TEST 5: Timezone Check ---');

  await clickRegion(page, 'Big Island');
  await page.waitForTimeout(1500);
  
  // Reset all filters
  await clickFilter(page, 'All Ages');
  await page.waitForTimeout(500);
  await clickFilter(page, 'All Time');
  await page.waitForTimeout(500);
  await clickFilter(page, 'Any Time');
  await page.waitForTimeout(500);
  await clickFilter(page, 'All Dates');
  await page.waitForTimeout(1000);
  
  await screenshot(page, 'test5-bi-timezone-check');
  
  const timeSamples = await getEventTimeSamples(page);
  console.log('Time samples found:', timeSamples);

  // Check for suspicious overnight times (1 AM - 5 AM)
  const suspiciousTimes = timeSamples.filter(t => {
    const match = t.match(/(\d{1,2}):\d{2}\s*(AM|am)/);
    if (match) {
      const hour = parseInt(match[1]);
      return hour >= 1 && hour <= 5; // 1 AM - 5 AM = suspicious
    }
    return false;
  });

  const normalTimes = timeSamples.filter(t => {
    const match = t.match(/(\d{1,2}):\d{2}\s*(AM|am|PM|pm)/i);
    if (match) {
      const hour = parseInt(match[1]);
      const isPM = match[2].toUpperCase() === 'PM';
      const hour24 = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
      return hour24 >= 6 && hour24 <= 22; // 6 AM - 10 PM = normal
    }
    return false;
  });

  console.log('Suspicious times (1-5 AM):', suspiciousTimes);
  console.log('Normal times (6 AM - 10 PM):', normalTimes);

  if (timeSamples.length === 0) {
    results.notes.push('⚠️ No event times found to check timezone');
    results.timezones = 'UNKNOWN';
  } else if (suspiciousTimes.length === 0 && normalTimes.length > 0) {
    results.timezones = 'PASS';
    results.notes.push(`✅ Event times look like real Hawaii times: ${normalTimes.slice(0,5).join(', ')}`);
  } else if (suspiciousTimes.length > 0) {
    results.notes.push(`❌ Suspicious overnight times found: ${suspiciousTimes.join(', ')} — may indicate timezone bug`);
  } else {
    results.notes.push(`⚠️ Timezone unclear. Samples: ${timeSamples.join(', ')}`);
  }
  console.log('Timezone result:', results.timezones);

  // ============================================================
  // TEST 6: COMBINATION FILTERS
  // ============================================================
  console.log('\n--- TEST 6: Combination Filters ---');

  // Big Island + Young Kids + This Month
  await clickRegion(page, 'Big Island');
  await page.waitForTimeout(1200);
  await clickFilter(page, 'All Ages');
  await page.waitForTimeout(500);
  await clickFilter(page, 'All Time');
  await page.waitForTimeout(300);
  await clickFilter(page, 'Any Time');
  await page.waitForTimeout(300);
  await clickFilter(page, 'All Dates');
  await page.waitForTimeout(500);
  
  await clickFilter(page, 'Young Kids');
  await page.waitForTimeout(800);
  await clickFilter(page, 'This Month');
  await page.waitForTimeout(1500);
  await screenshot(page, 'test6-bi-youngkids-thismonth');
  const comboBI = await getPageText(page);
  console.log('BI+YoungKids+ThisMonth sample:', comboBI.substring(0, 400));

  const comboBIHasHawaii = comboBI.toLowerCase().includes('hawaii') || comboBI.toLowerCase().includes('big island') || comboBI.toLowerCase().includes('kona');
  const comboBIHasSF = comboBI.toLowerCase().includes('san francisco') || comboBI.toLowerCase().includes('sf bay');
  const comboBIEmpty = comboBI.toLowerCase().includes('no event') || comboBI.toLowerCase().includes('no result') || comboBI.toLowerCase().includes('nothing found');

  // SF Bay + Family + This Weekend
  await clickRegion(page, 'SF Bay');
  await page.waitForTimeout(1200);
  await clickFilter(page, 'All Ages');
  await page.waitForTimeout(500);
  await clickFilter(page, 'All Time');
  await page.waitForTimeout(300);
  await clickFilter(page, 'Any Time');
  await page.waitForTimeout(300);
  await clickFilter(page, 'All Dates');
  await page.waitForTimeout(500);

  await clickFilter(page, 'Family');
  await page.waitForTimeout(800);
  await clickFilter(page, 'This Weekend');
  await page.waitForTimeout(1500);
  await screenshot(page, 'test6-sf-family-thisweekend');
  const comboSF = await getPageText(page);
  console.log('SF+Family+ThisWeekend sample:', comboSF.substring(0, 400));

  const comboSFHasSF = comboSF.toLowerCase().includes('sf bay') || comboSF.toLowerCase().includes('san francisco') || comboSF.toLowerCase().includes('bay area');
  const comboSFHasHawaii = comboSF.toLowerCase().includes('hawaii') || comboSF.toLowerCase().includes('big island');
  const comboSFEmpty = comboSF.toLowerCase().includes('no event') || comboSF.toLowerCase().includes('no result') || comboSF.toLowerCase().includes('nothing found');

  console.log('BI combo: hasHawaii=', comboBIHasHawaii, 'hasSF=', comboBIHasSF, 'empty=', comboBIEmpty);
  console.log('SF combo: hasSF=', comboSFHasSF, 'hasHawaii=', comboSFHasHawaii, 'empty=', comboSFEmpty);

  const comboBIGood = (comboBIHasHawaii && !comboBIHasSF) || comboBIEmpty;
  const comboSFGood = (comboSFHasSF && !comboSFHasHawaii) || comboSFEmpty;

  if (comboBIGood && comboSFGood) {
    results.combinationFilters = 'PASS';
    results.notes.push('✅ Combination filters work correctly, events stay in their region');
  } else {
    results.notes.push(`⚠️ Combination filter issues: BI-combo OK=${comboBIGood}, SF-combo OK=${comboSFGood}`);
    if (comboBIHasSF) results.notes.push('❌ BI combo showing SF events!');
    if (comboSFHasHawaii) results.notes.push('❌ SF combo showing Hawaii events!');
  }
  console.log('Combination filters result:', results.combinationFilters);

  await browser.close();

  // ============================================================
  // FINAL REPORT
  // ============================================================
  console.log('\n\n========================================');
  console.log('PARKER PHASE 4 FINAL REVIEW RESULTS');
  console.log('========================================');
  console.log('1. Default region (SF Bay):', results.defaultRegion);
  console.log('2. Region switching:', results.regionSwitching);
  console.log('3. Age filters:', results.ageFilters);
  console.log('4. Date filters:', results.dateFilters);
  console.log('5. Timezones:', results.timezones);
  console.log('6. Combination filters:', results.combinationFilters);
  console.log('\nNotes:');
  results.notes.forEach(n => console.log(' ', n));

  const allPass = Object.values(results).filter(v => typeof v === 'string').every(v => v === 'PASS' || v === 'UNKNOWN');
  const verdict = allPass ? 'APPROVED' : 'REJECTED';
  console.log('\nVERDICT:', verdict);

  // Write results to file for easy retrieval
  const report = {
    verdict,
    results,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync('C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-final\\report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to phase4-final/report.json');
})();

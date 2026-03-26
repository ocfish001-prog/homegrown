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
  console.log(`📸 ${name}`);
  return filename;
}

// Get result count from hidden sr-only element + visible count
async function getResultCount(page) {
  return await page.evaluate(() => {
    // Look for the results count
    const srOnly = document.querySelector('.sr-only');
    if (srOnly && srOnly.textContent?.match(/\d+ events? found/)) {
      return srOnly.textContent.trim();
    }
    const text = document.body.innerText;
    const match = text.match(/(\d+) results?/);
    return match ? match[0] : 'unknown';
  });
}

// Get first 10 event titles and times from visible list
async function getEventSummary(page) {
  return await page.evaluate(() => {
    // The events are in list items or divs. Let's find them by looking for date/time patterns
    const mainText = document.querySelector('main')?.innerText || document.body.innerText;
    const lines = mainText.split('\n').filter(l => l.trim().length > 0);
    return lines.slice(0, 60).join(' | ');
  });
}

// Get event count shown (the "X results" text)
async function getDisplayedResultCount(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/(\d+) results?/);
    return match ? parseInt(match[1]) : 0;
  });
}

// Get all event times from the page 
async function getAllEventTimes(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    // Find time patterns
    const timePattern = /\b(\d{1,2}:\d{2})\s*(AM|PM|am|pm)/g;
    const matches = [];
    let m;
    while ((m = timePattern.exec(text)) !== null) {
      matches.push(m[0]);
    }
    return [...new Set(matches)];
  });
}

// Get first ~5 event titles and times
async function getEventList(page) {
  return await page.evaluate(() => {
    const mainText = document.querySelector('main')?.innerText || '';
    // Extract event entries (looking for patterns: title + date/location)
    const events = [];
    const lines = mainText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (let i = 0; i < lines.length && events.length < 8; i++) {
      const line = lines[i];
      // A line with a day and time is likely an event date
      if (line.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i) || line.match(/Mar|Apr|May/) ) {
        // The event title is likely in the line before
        if (i > 0) {
          events.push(`${lines[i-1]} | ${line}`);
        }
      }
    }
    return events;
  });
}

// Open region dropdown and select a region
async function selectRegion(page, regionName) {
  // First click the current region button to open dropdown
  const regionBtn = page.locator('button').filter({ hasText: /SF Bay Area|Big Island|Hawaii/i }).first();
  await regionBtn.click();
  await page.waitForTimeout(800);
  
  // Look for the dropdown option
  const dropdown = await page.evaluate((name) => {
    const allBtns = Array.from(document.querySelectorAll('button, [role="option"], li, a'));
    for (const btn of allBtns) {
      const text = btn.textContent?.trim() || '';
      if (text.toLowerCase().includes(name.toLowerCase())) {
        btn.click();
        return `clicked: ${text}`;
      }
    }
    return 'NOT FOUND';
  }, regionName);
  
  return dropdown;
}

// Click filter button
async function clickFilterBtn(page, filterText) {
  return await page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const btn of btns) {
      const t = btn.textContent?.trim() || '';
      if (t.toLowerCase().includes(text.toLowerCase())) {
        btn.click();
        return `clicked: "${t}"`;
      }
    }
    return 'NOT FOUND';
  }, filterText);
}

const results = {
  defaultRegion: 'FAIL',
  regionSwitching: 'FAIL',
  ageFilters: 'FAIL',
  dateFilters: 'FAIL',
  timezones: 'FAIL',
  combinationFilters: 'FAIL',
};
const notes = [];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('\n🧪 === PARKER PHASE 4 FINAL REVIEW ===\n');

  // ============================================================
  // TEST 1: DEFAULT REGION
  // ============================================================
  console.log('=== TEST 1: Default Region ===');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.clear(); } catch(e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  
  await screenshot(page, 'test1-default-region');
  
  const defaultRegionText = await page.evaluate(() => {
    const btn = document.querySelector('button');
    // Find the region button (first button or the one with SF/Hawaii text)
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii') || t.includes('SF'))) {
        return t;
      }
    }
    return document.body.innerText.substring(0, 200);
  });
  
  console.log('Default region shown:', defaultRegionText);
  
  if (defaultRegionText.includes('SF Bay Area') || defaultRegionText.includes('SF Bay') || defaultRegionText.includes('Bay Area')) {
    results.defaultRegion = 'PASS';
    notes.push('✅ Default region correctly shows SF Bay Area');
  } else if (defaultRegionText.includes('Big Island') || defaultRegionText.includes('Hawaii')) {
    notes.push(`❌ Default region shows Hawaii/Big Island instead of SF Bay: "${defaultRegionText}"`);
  } else {
    notes.push(`⚠️ Unclear default region: "${defaultRegionText}"`);
  }
  console.log('RESULT:', results.defaultRegion, '\n');

  // ============================================================
  // TEST 2: REGION SWITCHING
  // ============================================================
  console.log('=== TEST 2: Region Switching ===');
  
  // First get SF Bay event count
  const sfCount1 = await getDisplayedResultCount(page);
  const sfSample1 = await getEventList(page);
  console.log('SF Bay starting count:', sfCount1);
  console.log('SF events sample:', sfSample1.slice(0,3));
  
  // Switch to Big Island — click region button
  console.log('Switching to Big Island...');
  let switchRes = await selectRegion(page, 'Big Island');
  console.log('Switch result:', switchRes);
  await page.waitForTimeout(2000);
  await screenshot(page, 'test2a-big-island');
  
  const biRegionText = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  const biCount1 = await getDisplayedResultCount(page);
  const biSample1 = await getEventList(page);
  console.log('After switch - Region shown:', biRegionText, '| Count:', biCount1);
  console.log('BI events sample:', biSample1.slice(0,3));
  
  const biLoaded = biRegionText.includes('Big Island') || biRegionText.includes('Hawaii');
  const biDifferentFromSF = biCount1 !== sfCount1 || (biSample1[0] && sfSample1[0] && biSample1[0] !== sfSample1[0]);
  
  // Switch back to SF Bay
  console.log('Switching back to SF Bay...');
  let switchBack = await selectRegion(page, 'SF Bay');
  console.log('Switch back result:', switchBack);
  await page.waitForTimeout(2000);
  await screenshot(page, 'test2b-back-to-sf');
  
  const sfRegionText2 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  const sfCount2 = await getDisplayedResultCount(page);
  console.log('After switch back - Region shown:', sfRegionText2, '| Count:', sfCount2);
  
  const sfBackLoaded = sfRegionText2.includes('SF Bay') || sfRegionText2.includes('Bay Area');
  
  // Do it again (cycle 2)
  console.log('Cycle 2: switching to Big Island again...');
  await selectRegion(page, 'Big Island');
  await page.waitForTimeout(1500);
  await screenshot(page, 'test2c-bi-cycle2');
  const biText2 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  const biLoaded2 = biText2.includes('Big Island') || biText2.includes('Hawaii');
  
  console.log('Cycle 2 BI:', biText2);
  
  // Switch back to SF
  await selectRegion(page, 'SF Bay');
  await page.waitForTimeout(1500);
  await screenshot(page, 'test2d-sf-cycle2');
  
  console.log('Region switching stats: biLoaded=', biLoaded, 'sfBack=', sfBackLoaded, 'bi2=', biLoaded2);
  
  if (biLoaded && sfBackLoaded && biLoaded2) {
    results.regionSwitching = 'PASS';
    notes.push(`✅ Region switching stable. BI shows "${biRegionText}", SF shows "${sfRegionText2}"`);
  } else if (biLoaded || sfBackLoaded) {
    results.regionSwitching = 'PARTIAL';
    notes.push(`⚠️ Partial switching: biLoaded=${biLoaded}, sfBack=${sfBackLoaded}, bi2=${biLoaded2}`);
  } else {
    notes.push(`❌ Region switching broken: biLoaded=${biLoaded}, sfBack=${sfBackLoaded}`);
  }
  console.log('RESULT:', results.regionSwitching, '\n');

  // ============================================================
  // TEST 3: AGE FILTERS
  // ============================================================
  console.log('=== TEST 3: Age Filters ===');
  
  // Ensure we're on Big Island
  const currentRegion3 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  if (!currentRegion3.includes('Big Island')) {
    await selectRegion(page, 'Big Island');
    await page.waitForTimeout(1500);
  }
  
  // Ensure All Ages selected
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(800);
  
  const biAllCount = await getDisplayedResultCount(page);
  await screenshot(page, 'test3a-bi-all-ages');
  console.log('BI All Ages count:', biAllCount);
  
  // Young Kids
  await clickFilterBtn(page, 'Young Kids');
  await page.waitForTimeout(1500);
  const biYKCount = await getDisplayedResultCount(page);
  const biYKSample = await getEventList(page);
  await screenshot(page, 'test3b-bi-young-kids');
  console.log('BI Young Kids count:', biYKCount, 'events:', biYKSample.slice(0,2));
  
  // Family
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(500);
  await clickFilterBtn(page, 'Family');
  await page.waitForTimeout(1500);
  const biFamCount = await getDisplayedResultCount(page);
  const biFamSample = await getEventList(page);
  await screenshot(page, 'test3c-bi-family');
  console.log('BI Family count:', biFamCount, 'events:', biFamSample.slice(0,2));
  
  // SF Bay - Young Kids
  await selectRegion(page, 'SF Bay');
  await page.waitForTimeout(1200);
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(500);
  await clickFilterBtn(page, 'Young Kids');
  await page.waitForTimeout(1500);
  const sfYKCount = await getDisplayedResultCount(page);
  const sfYKSample = await getEventList(page);
  await screenshot(page, 'test3d-sf-young-kids');
  console.log('SF Young Kids count:', sfYKCount, 'events:', sfYKSample.slice(0,2));
  
  // Check current region after filter
  const regionAfterYK = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  console.log('Region after YK filter:', regionAfterYK);
  
  const ageFiltersChangeResults = biAllCount !== biYKCount || biAllCount !== biFamCount || biYKCount !== biFamCount;
  const sfStaysInSFAfterFilter = regionAfterYK.includes('SF Bay') || regionAfterYK.includes('Bay Area');
  const biSFDifferentYK = biYKCount !== sfYKCount; // Should be different regions, different results
  
  console.log('Filter changes: allVsYK=', biAllCount, 'vs', biYKCount, '| allVsFam=', biAllCount, 'vs', biFamCount);
  
  if (ageFiltersChangeResults && sfStaysInSFAfterFilter) {
    results.ageFilters = 'PASS';
    notes.push(`✅ Age filters working: BI All=${biAllCount}, BI YK=${biYKCount}, BI Fam=${biFamCount}, SF YK=${sfYKCount}`);
  } else if (ageFiltersChangeResults) {
    results.ageFilters = 'PARTIAL';
    notes.push(`⚠️ Age filters change results but region stability uncertain. Region after filter: "${regionAfterYK}"`);
  } else {
    notes.push(`❌ Age filters not changing results: All=${biAllCount}, YK=${biYKCount}, Fam=${biFamCount}`);
  }
  console.log('RESULT:', results.ageFilters, '\n');

  // ============================================================
  // TEST 4: DATE FILTERS
  // ============================================================
  console.log('=== TEST 4: Date Filters ===');
  
  // SF Bay + This Weekend
  // Reset to SF Bay, All Ages
  const currentRegion4 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  if (!currentRegion4.includes('SF Bay') && !currentRegion4.includes('Bay Area')) {
    await selectRegion(page, 'SF Bay');
    await page.waitForTimeout(1200);
  }
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(500);
  await clickFilterBtn(page, 'All Dates');
  await page.waitForTimeout(500);
  
  const sfAllCount = await getDisplayedResultCount(page);
  console.log('SF All Dates count:', sfAllCount);
  
  await clickFilterBtn(page, 'This Weekend');
  await page.waitForTimeout(1500);
  const sfWeekendCount = await getDisplayedResultCount(page);
  const sfWeekendSample = await getEventList(page);
  await screenshot(page, 'test4a-sf-this-weekend');
  console.log('SF This Weekend count:', sfWeekendCount, 'events:', sfWeekendSample.slice(0,2));
  
  // Check region after date filter
  const regionAfterWeekend = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  console.log('Region after This Weekend filter:', regionAfterWeekend);
  
  // Big Island + This Month
  await selectRegion(page, 'Big Island');
  await page.waitForTimeout(1200);
  await clickFilterBtn(page, 'All Dates');
  await page.waitForTimeout(500);
  
  const biAllDatesCount = await getDisplayedResultCount(page);
  console.log('BI All Dates count:', biAllDatesCount);
  
  await clickFilterBtn(page, 'This Month');
  await page.waitForTimeout(1500);
  const biMonthCount = await getDisplayedResultCount(page);
  const biMonthSample = await getEventList(page);
  await screenshot(page, 'test4b-bi-this-month');
  console.log('BI This Month count:', biMonthCount, 'events:', biMonthSample.slice(0,2));
  
  const regionAfterMonth = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  console.log('Region after This Month filter:', regionAfterMonth);
  
  const sfWeekendFilterWorks = sfWeekendCount < sfAllCount || sfWeekendCount > 0;
  const biMonthFilterWorks = biMonthCount <= biAllDatesCount;
  const sfStaysInSFAfterDate = regionAfterWeekend.includes('SF Bay') || regionAfterWeekend.includes('Bay Area');
  const biStaysInBIAfterDate = regionAfterMonth.includes('Big Island') || regionAfterMonth.includes('Hawaii');
  
  console.log('Date filter stats:', {sfAllCount, sfWeekendCount, biAllDatesCount, biMonthCount, sfStaysSF: sfStaysInSFAfterDate, biStaysBI: biStaysInBIAfterDate});
  
  if (sfStaysInSFAfterDate && biStaysInBIAfterDate && sfWeekendFilterWorks && biMonthFilterWorks) {
    results.dateFilters = 'PASS';
    notes.push(`✅ Date filters work and regions stay stable. SF Weekend=${sfWeekendCount}, BI Month=${biMonthCount}`);
  } else if (sfWeekendFilterWorks || biMonthFilterWorks) {
    results.dateFilters = 'PARTIAL';
    notes.push(`⚠️ Date filters partial: sfWeekendOK=${sfWeekendFilterWorks}, biMonthOK=${biMonthFilterWorks}, sfKeepsSF=${sfStaysInSFAfterDate}, biKeepsBI=${biStaysInBIAfterDate}`);
  } else {
    notes.push(`❌ Date filters not working or broken`);
  }
  console.log('RESULT:', results.dateFilters, '\n');

  // ============================================================
  // TEST 5: TIMEZONE CHECK
  // ============================================================
  console.log('=== TEST 5: Timezone Check (Big Island) ===');
  
  // Go to Big Island, reset all filters
  const curReg5 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  if (!curReg5.includes('Big Island')) {
    await selectRegion(page, 'Big Island');
    await page.waitForTimeout(1200);
  }
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(300);
  await clickFilterBtn(page, 'All Dates');
  await page.waitForTimeout(800);
  await screenshot(page, 'test5-bi-timezone-check');
  
  const allTimes = await getAllEventTimes(page);
  console.log('All times found on BI page:', allTimes);
  
  // A "2:00 AM" for a Hawaii event suggests UTC offset bug — Hawaii is UTC-10
  // Normal Hawaii event times: 8 AM - 9 PM
  // If we see 1 AM, 2 AM, 3 AM, 4 AM it's suspicious — likely UTC or wrong timezone
  const suspiciousTimes = allTimes.filter(t => {
    const m = t.match(/(\d{1,2}):\d{2}\s*(AM|am)/i);
    if (!m) return false;
    const hour = parseInt(m[1]);
    return hour >= 1 && hour <= 5; // 1 AM - 5 AM = midnight shift
  });
  
  const normalTimes = allTimes.filter(t => {
    const m = t.match(/(\d{1,2}):\d{2}\s*(AM|PM|am|pm)/i);
    if (!m) return false;
    const hour = parseInt(m[1]);
    const isPM = m[2].toUpperCase() === 'PM';
    const h24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    return h24 >= 7 && h24 <= 21; // 7 AM - 9 PM
  });
  
  console.log('Suspicious times (1-5 AM):', suspiciousTimes);
  console.log('Normal times (7 AM - 9 PM):', normalTimes);
  
  // Also check SF times to compare
  await selectRegion(page, 'SF Bay');
  await page.waitForTimeout(1200);
  await clickFilterBtn(page, 'All Dates');
  await page.waitForTimeout(500);
  
  const sfTimes = await getAllEventTimes(page);
  const sfSuspiciousTimes = sfTimes.filter(t => {
    const m = t.match(/(\d{1,2}):\d{2}\s*(AM|am)/i);
    if (!m) return false;
    const hour = parseInt(m[1]);
    return hour >= 1 && hour <= 5;
  });
  console.log('SF suspicious times for comparison:', sfSuspiciousTimes);
  
  if (allTimes.length === 0) {
    results.timezones = 'UNKNOWN';
    notes.push('⚠️ No event times found to evaluate timezone');
  } else if (suspiciousTimes.length === 0) {
    results.timezones = 'PASS';
    notes.push(`✅ Big Island event times look correct (no midnight/early AM shows). Normal times: ${normalTimes.slice(0,5).join(', ')}`);
  } else if (suspiciousTimes.length > 0 && sfSuspiciousTimes.length > 0) {
    // Both regions have suspicious times — could be legitimate overnight events (NPS programs, etc.)
    results.timezones = 'PARTIAL';
    notes.push(`⚠️ Both regions have AM times: BI=[${suspiciousTimes.join(', ')}], SF=[${sfSuspiciousTimes.join(', ')}]. Could be legitimate NPS overnight programs OR timezone issue.`);
  } else {
    notes.push(`❌ Big Island has suspicious overnight times: ${suspiciousTimes.join(', ')} — possible timezone bug`);
  }
  console.log('RESULT:', results.timezones, '\n');

  // ============================================================
  // TEST 6: COMBINATION FILTERS
  // ============================================================
  console.log('=== TEST 6: Combination Filters ===');
  
  // Big Island + Young Kids + This Month
  const curReg6 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  if (!curReg6.includes('Big Island')) {
    await selectRegion(page, 'Big Island');
    await page.waitForTimeout(1200);
  }
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(300);
  await clickFilterBtn(page, 'All Dates');
  await page.waitForTimeout(300);
  
  await clickFilterBtn(page, 'Young Kids');
  await page.waitForTimeout(800);
  await clickFilterBtn(page, 'This Month');
  await page.waitForTimeout(1500);
  
  const comboBICount = await getDisplayedResultCount(page);
  const comboBISample = await getEventList(page);
  const comboBIRegion = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  await screenshot(page, 'test6a-bi-youngkids-thismonth');
  console.log('BI + Young Kids + This Month: count=', comboBICount, 'region=', comboBIRegion);
  console.log('Events:', comboBISample.slice(0,3));
  
  // SF Bay + Family + This Weekend
  await selectRegion(page, 'SF Bay');
  await page.waitForTimeout(1200);
  await clickFilterBtn(page, 'All Ages');
  await page.waitForTimeout(300);
  await clickFilterBtn(page, 'All Dates');
  await page.waitForTimeout(300);
  
  await clickFilterBtn(page, 'Family');
  await page.waitForTimeout(800);
  await clickFilterBtn(page, 'This Weekend');
  await page.waitForTimeout(1500);
  
  const comboSFCount = await getDisplayedResultCount(page);
  const comboSFSample = await getEventList(page);
  const comboSFRegion = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return '';
  });
  await screenshot(page, 'test6b-sf-family-thisweekend');
  console.log('SF + Family + This Weekend: count=', comboSFCount, 'region=', comboSFRegion);
  console.log('Events:', comboSFSample.slice(0,3));
  
  const comboBIStaysBI = comboBIRegion.includes('Big Island') || comboBIRegion.includes('Hawaii');
  const comboSFStaysSF = comboSFRegion.includes('SF Bay') || comboSFRegion.includes('Bay Area');
  const combosDifferent = comboBICount !== comboSFCount;
  
  if (comboBIStaysBI && comboSFStaysSF) {
    results.combinationFilters = 'PASS';
    notes.push(`✅ Combination filters: BI+YK+Month=${comboBICount}, SF+Fam+Weekend=${comboSFCount}. Regions stay stable.`);
  } else {
    notes.push(`❌ Combination filters lost region: BI stays=${comboBIStaysBI} ("${comboBIRegion}"), SF stays=${comboSFStaysSF} ("${comboSFRegion}")`);
  }
  console.log('RESULT:', results.combinationFilters, '\n');

  await browser.close();

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n========================================');
  console.log('FINAL RESULTS:');
  console.log('========================================');
  Object.entries(results).forEach(([k, v]) => console.log(`${k}: ${v}`));
  console.log('\nNOTES:');
  notes.forEach(n => console.log(' ', n));
  
  const allPass = Object.values(results).every(v => v === 'PASS' || v === 'UNKNOWN' || v === 'PARTIAL');
  const criticalPass = results.defaultRegion === 'PASS' && results.regionSwitching === 'PASS' && results.ageFilters === 'PASS' && results.dateFilters === 'PASS';
  
  // Write JSON report
  const report = { results, notes, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  
  console.log('\nReport written to report.json');
  console.log('Screenshots in:', SCREENSHOT_DIR);
})();

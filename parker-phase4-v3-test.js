const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join('C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-v3');
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  const p = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`[screenshot] ${name}.png`);
}

async function getEventTitles(page) {
  await sleep(2000);
  const titles = await page.$$eval('[class*="card"], [class*="event"], article, [class*="Event"]', els => 
    els.map(el => el.innerText.substring(0, 200)).filter(t => t.trim().length > 10)
  );
  return titles;
}

async function getPageText(page) {
  await sleep(2000);
  return await page.evaluate(() => document.body.innerText);
}

(async () => {
  console.log('=== Parker Phase 4 v3 — Region Isolation Test ===');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // ===== TEST 1: Load page, check default, switch to Big Island =====
  console.log('\n[Test 1] Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  
  const pageText1 = await getPageText(page);
  console.log('Default region text snippet:', pageText1.substring(0, 300));
  await screenshot(page, '01-default-load');

  // Check if SF Bay Area is the default
  const isSFBayDefault = pageText1.toLowerCase().includes('sf bay') || 
                          pageText1.toLowerCase().includes('san francisco') ||
                          pageText1.toLowerCase().includes('bay area');
  console.log('Is SF Bay default?', isSFBayDefault);

  // Look for region selector
  const regionSelectors = await page.$$('select, [role="combobox"], [class*="region"], [class*="Region"], button');
  console.log(`Found ${regionSelectors.length} potential interactive elements`);
  
  // Try to find and click region selector
  let regionSwitched = false;
  
  // Try select elements first
  const selects = await page.$$('select');
  console.log(`Found ${selects.length} select elements`);
  
  for (const sel of selects) {
    const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log('Select options:', JSON.stringify(options));
    
    const hawaiiOption = options.find(o => o.text.toLowerCase().includes('hawaii') || 
                                           o.text.toLowerCase().includes('big island') ||
                                           o.text.toLowerCase().includes('hilo') ||
                                           o.text.toLowerCase().includes('kona'));
    if (hawaiiOption) {
      await sel.selectOption(hawaiiOption.value);
      console.log('Switched to Hawaii via select:', hawaiiOption.text);
      regionSwitched = true;
      break;
    }
  }

  // If no select worked, try buttons/links
  if (!regionSwitched) {
    const allButtons = await page.$$eval('button, a, [role="tab"], [role="button"]', els => 
      els.map(el => ({ text: el.textContent?.trim(), tag: el.tagName })).filter(e => e.text)
    );
    console.log('All clickable elements:', JSON.stringify(allButtons.slice(0, 30)));
    
    // Look for Hawaii/Big Island buttons
    const hawaiiBtn = await page.$('button:has-text("Hawaii"), button:has-text("Big Island"), a:has-text("Big Island"), [role="tab"]:has-text("Big Island"), [role="tab"]:has-text("Hawaii")');
    if (hawaiiBtn) {
      await hawaiiBtn.click();
      console.log('Clicked Hawaii button');
      regionSwitched = true;
    }
  }

  await sleep(3000);
  const pageText2 = await getPageText(page);
  await screenshot(page, '02-after-region-switch-attempt');
  console.log('After region switch, text snippet:', pageText2.substring(0, 500));

  const hasHawaiiEvents = pageText2.toLowerCase().includes('merrie monarch') || 
                           pageText2.toLowerCase().includes('palace theater') ||
                           pageText2.toLowerCase().includes('waikoloa') ||
                           pageText2.toLowerCase().includes('hilo') ||
                           pageText2.toLowerCase().includes('kona') ||
                           pageText2.toLowerCase().includes('hawaii') ||
                           pageText2.toLowerCase().includes('farm tour') ||
                           pageText2.toLowerCase().includes('big island');
  
  console.log('Has Hawaii events?', hasHawaiiEvents);

  // ===== TEST 2: Switch back to SF Bay =====
  console.log('\n[Test 2] Switching to SF Bay Area...');
  
  let sfSwitched = false;
  const selectsAgain = await page.$$('select');
  for (const sel of selectsAgain) {
    const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    const sfOption = options.find(o => o.text.toLowerCase().includes('sf') || 
                                        o.text.toLowerCase().includes('san francisco') ||
                                        o.text.toLowerCase().includes('bay area'));
    if (sfOption) {
      await sel.selectOption(sfOption.value);
      console.log('Switched to SF Bay via select:', sfOption.text);
      sfSwitched = true;
      break;
    }
  }

  if (!sfSwitched) {
    const sfBtn = await page.$('button:has-text("SF Bay"), button:has-text("San Francisco"), button:has-text("Bay Area"), [role="tab"]:has-text("SF Bay"), [role="tab"]:has-text("Bay Area")');
    if (sfBtn) {
      await sfBtn.click();
      console.log('Clicked SF Bay button');
      sfSwitched = true;
    }
  }

  await sleep(3000);
  const pageText3 = await getPageText(page);
  await screenshot(page, '03-sf-bay-view');
  console.log('SF Bay view text snippet:', pageText3.substring(0, 800));

  const sfHasHawaiiBleed = pageText3.toLowerCase().includes('merrie monarch') ||
                             pageText3.toLowerCase().includes('waikoloa') ||
                             (pageText3.toLowerCase().includes('hilo') && !pageText3.toLowerCase().includes('san francisco')) ||
                             pageText3.toLowerCase().includes('palace theater') && pageText3.toLowerCase().includes('hilo');
  
  const sfHasSFEvents = pageText3.toLowerCase().includes('san francisco') ||
                         pageText3.toLowerCase().includes('oakland') ||
                         pageText3.toLowerCase().includes('berkeley') ||
                         pageText3.toLowerCase().includes('sf bay') ||
                         pageText3.toLowerCase().includes('silicon valley');
  
  const sfIsEmpty = pageText3.toLowerCase().includes('no events') ||
                    pageText3.toLowerCase().includes('nothing') ||
                    pageText3.toLowerCase().includes('empty') ||
                    pageText3.toLowerCase().includes('check back') ||
                    pageText3.toLowerCase().includes('coming soon') ||
                    pageText3.toLowerCase().includes('0 events');

  console.log('SF Bay has Hawaii bleed?', sfHasHawaiiBleed);
  console.log('SF Bay has SF events?', sfHasSFEvents);
  console.log('SF Bay appears empty?', sfIsEmpty);

  // ===== TEST 3: Age filter on Big Island =====
  console.log('\n[Test 3] Switching back to Big Island for age filter test...');
  
  // Switch back to Hawaii
  const selectsFor3 = await page.$$('select');
  for (const sel of selectsFor3) {
    const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    const hawaiiOption = options.find(o => o.text.toLowerCase().includes('hawaii') || 
                                           o.text.toLowerCase().includes('big island'));
    if (hawaiiOption) {
      await sel.selectOption(hawaiiOption.value);
      console.log('Switched back to Hawaii for Test 3');
      break;
    }
  }

  if (!regionSwitched) {
    const hawaiiBtn2 = await page.$('button:has-text("Hawaii"), button:has-text("Big Island"), [role="tab"]:has-text("Big Island"), [role="tab"]:has-text("Hawaii")');
    if (hawaiiBtn2) { await hawaiiBtn2.click(); }
  }

  await sleep(3000);
  const pageText3b = await getPageText(page);
  await screenshot(page, '04-big-island-before-age-filter');
  
  // Count events before filter
  const eventCountBefore = (pageText3b.match(/hawaii|hilo|kona|waikoloa|kailua|kohala/gi) || []).length;
  console.log('Hawaii mentions before age filter:', eventCountBefore);

  // Try to apply Family/age filter
  let ageFilterApplied = false;
  const ageSelects = await page.$$('select');
  for (const sel of ageSelects) {
    const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log('Age select options:', JSON.stringify(options));
    const familyOption = options.find(o => o.text.toLowerCase().includes('family') || 
                                           o.text.toLowerCase().includes('kid') ||
                                           o.text.toLowerCase().includes('child'));
    if (familyOption) {
      await sel.selectOption(familyOption.value);
      console.log('Applied Family filter');
      ageFilterApplied = true;
      break;
    }
  }

  if (!ageFilterApplied) {
    const familyBtn = await page.$('button:has-text("Family"), [role="tab"]:has-text("Family"), [class*="filter"]:has-text("Family")');
    if (familyBtn) {
      await familyBtn.click();
      console.log('Clicked Family filter button');
      ageFilterApplied = true;
    }
  }

  await sleep(3000);
  const pageText3c = await getPageText(page);
  await screenshot(page, '05-big-island-family-filter');
  
  const afterFamilyHasSFEvents = pageText3c.toLowerCase().includes('san jose') ||
                                   pageText3c.toLowerCase().includes('oakland') ||
                                   pageText3c.toLowerCase().includes('fremont') ||
                                   pageText3c.toLowerCase().includes('sunnyvale');
  console.log('After Family filter, has SF events?', afterFamilyHasSFEvents);

  // ===== TEST 4: Date filter on Big Island =====
  console.log('\n[Test 4] Applying "This Month" date filter on Big Island...');
  
  let dateFilterApplied = false;
  const dateSelects = await page.$$('select');
  for (const sel of dateSelects) {
    const options = await sel.$$eval('option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
    console.log('Date select options:', JSON.stringify(options));
    const monthOption = options.find(o => o.text.toLowerCase().includes('this month') ||
                                          o.text.toLowerCase().includes('month'));
    if (monthOption) {
      await sel.selectOption(monthOption.value);
      console.log('Applied This Month filter');
      dateFilterApplied = true;
      break;
    }
  }

  if (!dateFilterApplied) {
    const monthBtn = await page.$('button:has-text("This Month"), [role="tab"]:has-text("This Month"), button:has-text("Month")');
    if (monthBtn) {
      await monthBtn.click();
      console.log('Clicked This Month button');
      dateFilterApplied = true;
    }
  }

  await sleep(3000);
  const pageText4 = await getPageText(page);
  await screenshot(page, '06-big-island-this-month-filter');

  const afterDateHasSFEvents = pageText4.toLowerCase().includes('san jose') ||
                                 pageText4.toLowerCase().includes('oakland') ||
                                 pageText4.toLowerCase().includes('fremont') ||
                                 pageText4.toLowerCase().includes('sunnyvale');
  console.log('After date filter, has SF events?', afterDateHasSFEvents);

  // ===== FINAL SCREENSHOT =====
  await screenshot(page, '07-final-state');

  await browser.close();

  // ===== SUMMARY =====
  console.log('\n========== RESULTS SUMMARY ==========');
  console.log('Test 1 - Hawaii loads Hawaii events:', hasHawaiiEvents ? 'PASS' : 'FAIL');
  console.log('Test 2 - SF Bay does NOT show Hawaii events:', sfHasHawaiiBleed ? 'FAIL ❌ HAWAII BLEED DETECTED' : 'PASS ✅');
  console.log('  SF Bay state:', sfHasHawaiiBleed ? 'Hawaii events bleeding in' : (sfHasSFEvents ? 'SF events present' : 'Empty/no events (acceptable)'));
  console.log('Test 3 - Age filter Hawaii only:', afterFamilyHasSFEvents ? 'FAIL' : 'PASS');
  console.log('Test 4 - Date filter Hawaii only:', afterDateHasSFEvents ? 'FAIL' : 'PASS');
  
  const verdict = sfHasHawaiiBleed ? 'REJECTED' : 'APPROVED';
  console.log('\nVERDICT:', verdict);
  console.log('SF Bay showing Hawaii events?', sfHasHawaiiBleed ? 'YES' : 'NO');

  // Write results to file
  const results = {
    test1: hasHawaiiEvents,
    test2_hawaiiBleed: sfHasHawaiiBleed,
    test2_sfEvents: sfHasSFEvents,
    test2_empty: sfIsEmpty,
    test3_noSFBleed: !afterFamilyHasSFEvents,
    test4_noSFBleed: !afterDateHasSFEvents,
    verdict,
    sfBayState: sfHasHawaiiBleed ? 'Hawaii bleed' : (sfHasSFEvents ? 'SF events' : 'Empty/clean'),
    pageText3_snippet: pageText3.substring(0, 2000)
  };
  
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  console.log('Results saved to results.json');
})();

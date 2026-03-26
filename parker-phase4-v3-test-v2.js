const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-v3';
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  const p = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`[screenshot] ${name}.png`);
}

async function getPageText(page) {
  await sleep(2000);
  return await page.evaluate(() => document.body.innerText);
}

async function switchRegion(page, regionName) {
  console.log(`  Attempting to switch to: ${regionName}`);
  
  // Click the region button to open the selector
  const regionBtn = await page.$('button:has-text("SF Bay Area"), button:has-text("Big Island"), button:has-text("Hawaii")');
  if (regionBtn) {
    await regionBtn.click();
    console.log('  Clicked region button, waiting for modal/dropdown...');
    await sleep(2000);
    await screenshot(page, `region-modal-${regionName.replace(/\s+/g, '-').toLowerCase()}`);
    
    // Look for the target region in the modal
    const allButtons = await page.$$eval('button, a, li, [role="option"], [role="listitem"]', els => 
      els.map(el => ({ text: el.textContent?.trim(), visible: !el.hidden })).filter(e => e.text && e.text.length > 0)
    );
    console.log('  Available options after click:', JSON.stringify(allButtons.filter(b => b.text.length < 50).slice(0, 40)));
    
    // Try to click the target region
    const targetBtn = await page.$(`button:has-text("${regionName}"), li:has-text("${regionName}"), a:has-text("${regionName}"), [role="option"]:has-text("${regionName}")`);
    if (targetBtn) {
      await targetBtn.click();
      console.log(`  Clicked ${regionName} option`);
      await sleep(3000);
      return true;
    }
    
    // Try partial text matching
    const partialMatches = allButtons.filter(b => b.text.toLowerCase().includes(regionName.toLowerCase()));
    console.log('  Partial matches:', partialMatches);
    
    // Press Escape to close if nothing found
    await page.keyboard.press('Escape');
  }
  return false;
}

(async () => {
  console.log('=== Parker Phase 4 v3 — Region Isolation Test (v2) ===');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Load page
  console.log('\n[Test 1] Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  
  const pageText1 = await getPageText(page);
  console.log('Default state:', pageText1.substring(0, 400));
  await screenshot(page, '01-default-load');

  const isSFBayDefault = pageText1.toLowerCase().includes('sf bay') || 
                          pageText1.toLowerCase().includes('san francisco') ||
                          pageText1.toLowerCase().includes('bay area');
  console.log('Is SF Bay default?', isSFBayDefault);
  console.log('Event count mention:', pageText1.match(/\d+ events? found/i)?.[0]);

  // Try to switch to Big Island
  const switched = await switchRegion(page, 'Big Island');
  
  if (!switched) {
    // Try alternate names
    console.log('  Trying alternate: Hawaii Island');
    const switched2 = await switchRegion(page, 'Hawaii');
    console.log('  Tried Hawaii:', switched2);
  }

  const pageText2 = await getPageText(page);
  await screenshot(page, '02-after-big-island-switch');
  console.log('After switch attempt:', pageText2.substring(0, 800));
  console.log('Event count:', pageText2.match(/\d+ (events? found|results)/i)?.[0]);

  const hasHawaiiEvents = pageText2.toLowerCase().includes('merrie monarch') || 
                           pageText2.toLowerCase().includes('palace theater') ||
                           pageText2.toLowerCase().includes('waikoloa') ||
                           pageText2.toLowerCase().includes('hilo') ||
                           pageText2.toLowerCase().includes('kona') ||
                           pageText2.toLowerCase().includes('hawaii') ||
                           pageText2.toLowerCase().includes('farm tour') ||
                           pageText2.toLowerCase().includes('big island') ||
                           pageText2.toLowerCase().includes('hawaiian');
  
  const hasBayAreaEvents = pageText2.toLowerCase().includes('san francisco') ||
                            pageText2.toLowerCase().includes('presidio') ||
                            pageText2.toLowerCase().includes('muir woods') ||
                            pageText2.toLowerCase().includes('sf bay') ||
                            pageText2.toLowerCase().includes('oakland');
  
  console.log('Hawaii events present after switch?', hasHawaiiEvents);
  console.log('Bay Area events still present?', hasBayAreaEvents);

  // ===== TEST 2: Switch to SF Bay =====
  console.log('\n[Test 2] Switching to SF Bay Area...');
  
  // First check current state of region button text
  const currentRegionBtn = await page.$eval('button[class*="region"], header button, nav button', el => el.textContent).catch(() => 'unknown');
  console.log('Current region button text:', currentRegionBtn);

  // Click SF Bay Area button in header  
  const sfBayBtn = await page.$('button:has-text("SF Bay Area")');
  if (sfBayBtn) {
    await sfBayBtn.click();
    console.log('Clicked SF Bay button in header');
    await sleep(2000);
    
    // Look for SF Bay option in the modal
    const sfOption = await page.$('button:has-text("SF Bay"), li:has-text("SF Bay"), a:has-text("SF Bay")');
    if (sfOption) {
      await sfOption.click();
      console.log('Selected SF Bay option');
      await sleep(3000);
    }
  }

  const pageText3 = await getPageText(page);
  await screenshot(page, '03-sf-bay-view');
  console.log('SF Bay view:', pageText3.substring(0, 1000));
  console.log('Event count:', pageText3.match(/\d+ (events? found|results)/i)?.[0]);

  const sfHasHawaiiBleed = pageText3.toLowerCase().includes('merrie monarch') ||
                             pageText3.toLowerCase().includes('waikoloa') ||
                             pageText3.toLowerCase().includes('palace theater, hilo') ||
                             (pageText3.toLowerCase().includes('hilo') && pageText3.toLowerCase().includes('big island'));
  
  const sfHasSFEvents = pageText3.toLowerCase().includes('san francisco') ||
                         pageText3.toLowerCase().includes('presidio') ||
                         pageText3.toLowerCase().includes('oakland') ||
                         pageText3.toLowerCase().includes('berkeley') ||
                         pageText3.toLowerCase().includes('muir woods');
  
  console.log('SF Bay has Hawaii bleed?', sfHasHawaiiBleed);
  console.log('SF Bay has SF events?', sfHasSFEvents);

  // ===== TEST 3: Family filter on Big Island =====
  console.log('\n[Test 3] Switching to Big Island for Family filter test...');
  
  // Try the region button again - look for "Big Island" button specifically
  const bigIslandBtn = await page.$('button:has-text("Big Island")');
  if (bigIslandBtn) {
    await bigIslandBtn.click();
    await sleep(3000);
  } else {
    // Open region modal and click Big Island
    const regionHeaderBtn = await page.$('button:has-text("SF Bay Area"), button:has-text("Big Island"), button[aria-haspopup]');
    if (regionHeaderBtn) {
      await regionHeaderBtn.click();
      await sleep(2000);
      await screenshot(page, '03b-region-modal-open');
      
      // Look at all elements in modal
      const modalText = await getPageText(page);
      console.log('Modal text:', modalText.substring(0, 500));
      
      const bigIslandOption = await page.$('button:has-text("Big Island"), li:has-text("Big Island"), [role="option"]:has-text("Big Island")');
      if (bigIslandOption) {
        await bigIslandOption.click();
        await sleep(3000);
      }
    }
  }

  const pageText3b = await getPageText(page);
  await screenshot(page, '04-big-island-for-filters');
  console.log('Big Island state for filters:', pageText3b.substring(0, 400));
  
  // Apply Family filter
  const familyBtn = await page.$('button:has-text("Family")');
  if (familyBtn) {
    await familyBtn.click();
    console.log('Clicked Family filter');
    await sleep(3000);
  }

  const pageText3c = await getPageText(page);
  await screenshot(page, '05-family-filter-applied');
  console.log('After Family filter:', pageText3c.substring(0, 600));
  console.log('Event count after Family filter:', pageText3c.match(/\d+ results/i)?.[0]);

  const test3HasSFEvents = pageText3c.toLowerCase().includes('san francisco') ||
                            pageText3c.toLowerCase().includes('presidio') ||
                            pageText3c.toLowerCase().includes('sunnyvale') ||
                            pageText3c.toLowerCase().includes('oakland');
  console.log('After Family filter, SF events?', test3HasSFEvents);

  // ===== TEST 4: This Month filter =====
  console.log('\n[Test 4] Applying This Month date filter...');
  
  const thisMonthBtn = await page.$('button:has-text("This Month")');
  if (thisMonthBtn) {
    await thisMonthBtn.click();
    console.log('Clicked This Month');
    await sleep(3000);
  }

  const pageText4 = await getPageText(page);
  await screenshot(page, '06-this-month-filter');
  console.log('After This Month filter:', pageText4.substring(0, 600));
  console.log('Event count after date filter:', pageText4.match(/\d+ results/i)?.[0]);

  const test4HasSFEvents = pageText4.toLowerCase().includes('san francisco') ||
                            pageText4.toLowerCase().includes('presidio') ||
                            pageText4.toLowerCase().includes('sunnyvale') ||
                            pageText4.toLowerCase().includes('oakland');
  console.log('After date filter, SF events?', test4HasSFEvents);
  
  await screenshot(page, '07-final-state');
  await browser.close();

  // ===== SUMMARY =====
  console.log('\n========== RESULTS SUMMARY ==========');
  const test1Pass = hasHawaiiEvents && !hasBayAreaEvents;
  const test1Partial = hasHawaiiEvents;
  console.log('Test 1 - Big Island loads Hawaii events:', test1Partial ? 'PASS' : 'UNABLE TO SWITCH REGION');
  console.log('Test 2 - SF Bay does NOT show Hawaii events:', sfHasHawaiiBleed ? 'FAIL ❌' : 'PASS ✅');
  console.log('  SF Bay state:', sfHasHawaiiBleed ? 'Hawaii bleed detected' : (sfHasSFEvents ? 'SF events present' : 'Empty/clean'));
  console.log('Test 3 - Family filter no SF bleed:', test3HasSFEvents ? 'FAIL' : 'PASS');
  console.log('Test 4 - Date filter no SF bleed:', test4HasSFEvents ? 'FAIL' : 'PASS');
  
  const verdict = sfHasHawaiiBleed ? 'REJECTED' : 'APPROVED';
  console.log('\nVERDICT:', verdict);
  console.log('SF Bay showing Hawaii events?', sfHasHawaiiBleed ? 'YES' : 'NO');

  const results = {
    test1_hawaiiLoaded: hasHawaiiEvents,
    test1_bayAreaGone: !hasBayAreaEvents,
    test2_hawaiiBleed: sfHasHawaiiBleed,
    test2_sfEvents: sfHasSFEvents,
    test3_noSFBleed: !test3HasSFEvents,
    test4_noSFBleed: !test4HasSFEvents,
    verdict,
    sfBayState: sfHasHawaiiBleed ? 'Hawaii bleed' : (sfHasSFEvents ? 'SF events present' : 'Empty/clean')
  };
  
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'results-v2.json'), JSON.stringify(results, null, 2));
  console.log('Results saved.');
})();

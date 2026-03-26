const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'scripts', 'parker-screenshots', 'phase3');
const BASE_URL = 'https://homegrown-phase1-app.netlify.app';

async function ss(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  console.log(`📸 ${name}`);
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const findings = {};

  // ---- EVENT DETAIL: Save Button + localStorage ----
  console.log('\n=== SAVE BUTTON TEST ===');
  await page.goto(BASE_URL + '/events/hawaii-pukalani-market-4-01', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1500);
  await ss(page, 'A1-detail-before-save');

  // Get directions link
  const dirLink = await page.$('a[href*="maps.google"], a[href*="google.com/maps"]');
  if (dirLink) {
    const href = await dirLink.getAttribute('href');
    console.log('✅ Get Directions link:', href);
    findings.getDirections = { pass: true, href };
  } else {
    console.log('❌ No Get Directions link');
    findings.getDirections = { pass: false };
  }

  // Save button
  const saveBtn = await page.$('button:has-text("Save")');
  if (saveBtn) {
    const isVisible = await saveBtn.isVisible();
    console.log('Save button visible:', isVisible);
    
    // Check initial state
    const saveBtnHtml = await saveBtn.evaluate(el => el.outerHTML);
    console.log('Save button HTML:', saveBtnHtml.substring(0, 200));
    
    // Click save
    await saveBtn.click();
    await sleep(1000);
    await ss(page, 'A2-after-save-click');
    
    // Check localStorage
    const ls1 = await page.evaluate(() => JSON.stringify(localStorage));
    console.log('localStorage after save:', ls1);
    
    // Check button state changed
    const saveBtnHtmlAfter = await saveBtn.evaluate(el => el.outerHTML);
    console.log('Save button after click:', saveBtnHtmlAfter.substring(0, 200));
    const stateChanged = saveBtnHtml !== saveBtnHtmlAfter;
    console.log('Button state changed:', stateChanged);
    
    // Reload and check persistence
    await page.reload({ waitUntil: 'networkidle' });
    await sleep(1500);
    const ls2 = await page.evaluate(() => JSON.stringify(localStorage));
    console.log('localStorage after reload:', ls2);
    await ss(page, 'A3-after-reload');
    
    const savedPersists = ls2 !== '{}' && ls2 !== ls1.replace('{}', '{}');
    console.log('localStorage persisted:', ls2);
    
    findings.saveButton = { 
      pass: true, 
      stateChanged,
      localStorageAfterSave: ls1,
      localStorageAfterReload: ls2
    };
  } else {
    console.log('❌ Save button not found');
    findings.saveButton = { pass: false };
  }

  // Check organizer info
  const bodyText = await page.textContent('body');
  const hasOrganizer = /organizer|hosted by|by |contact|pukalani|goFarm|gofarm/i.test(bodyText);
  console.log('Organizer present:', hasOrganizer);
  // Look for organizer section specifically
  const organizerEl = await page.$$eval('[class*="organizer"], [class*="host"], [class*="contact"]', els => 
    els.map(el => el.textContent.trim().substring(0, 100))
  );
  console.log('Organizer elements:', organizerEl);
  findings.organizer = { present: hasOrganizer, elements: organizerEl };

  // Back button
  const backBtn = await page.$('[aria-label="Go back"]');
  if (backBtn) {
    await backBtn.click();
    await sleep(1500);
    const backUrl = page.url();
    console.log('Back button URL:', backUrl);
    await ss(page, 'A4-back-nav');
    findings.backButton = { pass: backUrl === BASE_URL + '/' || backUrl === BASE_URL };
  }

  // ---- REGION SWITCHER: Click the VISIBLE mobile button ----
  console.log('\n=== REGION SWITCHER TEST ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1500);
  await ss(page, 'B1-home-start');

  // Get initial event titles
  const initialTitles = await page.$$eval('h3', els => els.map(e => e.textContent.trim()).filter(t => t.length > 3));
  console.log('Initial titles (first 5):', initialTitles.slice(0, 5));
  findings.initialRegion = { titles: initialTitles.slice(0, 5) };

  // Find the VISIBLE region button using locator (not $$)
  const regionBtns = page.locator('button[aria-label*="switch region"]');
  const count = await regionBtns.count();
  console.log('Region buttons count:', count);
  
  // Get info on each
  for (let i = 0; i < count; i++) {
    const btn = regionBtns.nth(i);
    const visible = await btn.isVisible();
    const text = await btn.textContent();
    const ariaExpanded = await btn.getAttribute('aria-expanded');
    console.log(`Button ${i}: visible=${visible}, text="${text?.trim()}", aria-expanded=${ariaExpanded}`);
  }

  // Click the first visible one
  let regionClicked = false;
  for (let i = 0; i < count; i++) {
    const btn = regionBtns.nth(i);
    const visible = await btn.isVisible();
    if (visible) {
      console.log(`Clicking visible region button ${i}`);
      await btn.click();
      await sleep(1500);
      await ss(page, 'B2-region-dropdown');
      
      // Check if a modal/dropdown appeared
      const afterHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
      console.log('After click HTML (first 500):', afterHtml.substring(0, 500));
      
      // Look for dropdown options
      const dropdownOptions = await page.$$eval('[role="listbox"] [role="option"], [role="listbox"] li, [class*="dropdown"] li, [class*="modal"] button, dialog button', 
        els => els.map(el => ({ text: el.textContent.trim(), classes: el.className.substring(0, 60) }))
      );
      console.log('Dropdown options:', dropdownOptions);
      
      // Check for overlay/modal
      const overlays = await page.$$eval('[class*="overlay"], [class*="modal"], [class*="sheet"], [class*="drawer"], [role="dialog"]',
        els => els.map(el => ({ tag: el.tagName, classes: el.className.substring(0, 80), text: el.textContent.substring(0, 100) }))
      );
      console.log('Overlays/modals:', overlays);

      // Look for SF Bay option
      const sfOption = await page.$('text="SF Bay"');
      const sfOption2 = await page.$('[role="option"]:has-text("SF"), [role="option"]:has-text("Bay"), li:has-text("SF Bay")');
      const allButtons2 = await page.$$eval('button', els => els.map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 50));
      console.log('All buttons after click:', allButtons2);
      
      if (sfOption || sfOption2) {
        console.log('Found SF Bay option!');
        await (sfOption || sfOption2).click();
        await sleep(2000);
        await ss(page, 'B3-sf-bay');
        const sfTitles = await page.$$eval('h3', els => els.map(e => e.textContent.trim()).filter(t => t.length > 3));
        console.log('SF Bay titles:', sfTitles.slice(0, 5));
        findings.regionSwitcher = { pass: true, sfTitles: sfTitles.slice(0, 5) };
      } else {
        // Maybe it's SF Bay → Big Island we need to test (app is currently on Big Island)
        // Let's look for any region options in the opened state
        await ss(page, 'B2b-region-state');
        const pageBodyAfter = await page.textContent('body');
        const hasModal = pageBodyAfter.length > (await page.evaluate(() => document.body.textContent.length));
        console.log('Any SF Bay text on page?', /sf bay|san francisco/i.test(pageBodyAfter));
        console.log('Any region options?', /maui|oahu|kauai|sf bay|los angeles|seattle/i.test(pageBodyAfter));
        
        // Check for SF Bay in any form
        const hasSF = await page.$('*:has-text("SF Bay Area"), *:has-text("San Francisco Bay")');
        console.log('SF Bay element found:', !!hasSF);

        findings.regionSwitcher = {
          pass: 'partial',
          note: 'Button clicked but SF Bay option not clearly visible as separate element',
          dropdownOptions,
          overlays
        };
      }
      regionClicked = true;
      break;
    }
  }
  
  if (!regionClicked) {
    findings.regionSwitcher = { pass: false, note: 'No visible region button found' };
  }

  // ---- DATE FILTER FINAL VERIFICATION ----
  console.log('\n=== DATE FILTER FINAL ===');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1500);
  
  const allFilters = await page.$$eval('button', els =>
    els.filter(b => b.isConnected && b.getBoundingClientRect().width > 0)
       .map(b => b.textContent.trim())
       .filter(t => /all dates|today|weekend|week|month/i.test(t))
  );
  console.log('Date filter buttons:', allFilters);
  
  const initialCount = await page.$$eval('[class*="card"]:has(h3)', els => els.length);
  console.log('Initial card count:', initialCount);

  // Click Weekend
  await page.locator('button:has-text("This Weekend")').click();
  await sleep(1500);
  await ss(page, 'C1-weekend');
  const weekendCount = await page.$$eval('[class*="card"]:has(h3)', els => els.length);
  console.log('Weekend count:', weekendCount);

  // Click Today
  await page.locator('button:has-text("Today")').click();
  await sleep(1500);
  await ss(page, 'C2-today');
  const todayCount = await page.$$eval('[class*="card"]:has(h3)', els => els.length);
  console.log('Today count:', todayCount);

  // Click All Dates
  await page.locator('button:has-text("All Dates")').click();
  await sleep(1500);
  await ss(page, 'C3-all-dates');
  const allCount = await page.$$eval('[class*="card"]:has(h3)', els => els.length);
  console.log('All Dates count:', allCount);
  
  findings.dateFiltering = {
    pass: allFilters.length >= 3,
    filters: allFilters,
    counts: { initial: initialCount, weekend: weekendCount, today: todayCount, allDates: allCount },
    filtersActuallyFilter: weekendCount !== initialCount || todayCount !== initialCount || todayCount !== weekendCount,
    allDatesRestores: allCount >= initialCount * 0.9
  };

  await browser.close();
  
  console.log('\n\n=== FINAL FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
  return findings;
}

run().catch(e => { console.error(e); process.exit(1); });

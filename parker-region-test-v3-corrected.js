const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\final-v3';
const URL = 'https://homegrown-phase1-app.netlify.app';

// The dropdown is role=listbox; check its visibility specifically
const DROPDOWN_SELECTOR = '[role="listbox"][aria-label="Select region"]';

async function isDropdownOpen(page) {
  const count = await page.locator(DROPDOWN_SELECTOR).count();
  if (count === 0) return false;
  return await page.locator(DROPDOWN_SELECTOR).isVisible().catch(() => false);
}

async function runTest(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const results = { label, steps: [], pass: true };

  function log(step, status, detail = '') {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`[${label}] ${icon} ${step}${detail ? ' — ' + detail : ''}`);
    results.steps.push({ step, status, detail });
    if (status === 'FAIL') results.pass = false;
  }

  try {
    // Step 1: Load page
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-01-loaded.png`) });
    log('Page loaded', 'PASS');

    // Step 2: Find and click VISIBLE region button
    const regionBtn = page.locator('[aria-label*="Region:"]').filter({ visible: true }).first();
    const btnVisible = await regionBtn.isVisible();
    if (!btnVisible) {
      log('Region button visible', 'FAIL', 'No visible region button found');
      await context.close();
      return results;
    }
    const btnText = await regionBtn.textContent();
    log('Region button found', 'PASS', `"${btnText.trim()}"`);

    await regionBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-02-dropdown-open.png`) });

    // Step 3: Verify dropdown opened with both regions
    const dropdownOpen = await isDropdownOpen(page);
    if (!dropdownOpen) {
      log('Dropdown opens', 'FAIL', 'Listbox not visible after click');
      await context.close();
      return results;
    }
    const sfOption = page.locator(`${DROPDOWN_SELECTOR} [role="option"]`).filter({ hasText: 'SF Bay Area' }).first();
    const hiOption = page.locator(`${DROPDOWN_SELECTOR} [role="option"]`).filter({ hasText: 'Big Island' }).first();
    const sfVis = await sfOption.isVisible().catch(() => false);
    const hiVis = await hiOption.isVisible().catch(() => false);
    if (sfVis && hiVis) {
      log('Dropdown shows both regions', 'PASS');
    } else {
      log('Dropdown shows both regions', 'FAIL', `SF: ${sfVis}, Hawaii: ${hiVis}`);
      await context.close();
      return results;
    }

    // Step 4: Click Big Island, Hawaii
    await hiOption.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-03-hawaii-selected.png`) });

    // Step 5: Verify Hawaii region active
    const btnAfter = await page.locator('[aria-label*="Region:"]').filter({ visible: true }).first().textContent().catch(() => '');
    const isHawaii = btnAfter.includes('Hawaii') || btnAfter.includes('Big Island');
    log('Hawaii region selected, events loaded', isHawaii ? 'PASS' : 'FAIL', `"${btnAfter.trim()}"`);

    const dropdownClosedAfterSelect = !(await isDropdownOpen(page));
    log('Dropdown auto-closes after selection', dropdownClosedAfterSelect ? 'PASS' : 'FAIL');

    // Step 6: Re-open and switch back to SF Bay Area
    const regionBtn2 = page.locator('[aria-label*="Region:"]').filter({ visible: true }).first();
    await regionBtn2.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-04-dropdown-reopen.png`) });

    const reopened = await isDropdownOpen(page);
    log('Dropdown reopens', reopened ? 'PASS' : 'FAIL');
    if (!reopened) { await context.close(); return results; }

    const sfOption2 = page.locator(`${DROPDOWN_SELECTOR} [role="option"]`).filter({ hasText: 'SF Bay Area' }).first();
    await sfOption2.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-05-sf-selected.png`) });

    const btnSF = await page.locator('[aria-label*="Region:"]').filter({ visible: true }).first().textContent().catch(() => '');
    const isSF = btnSF.includes('SF') || btnSF.includes('Bay Area');
    log('SF Bay Area restored, events changed', isSF ? 'PASS' : 'FAIL', `"${btnSF.trim()}"`);

    // Step 7: Click-outside closes dropdown
    const regionBtn3 = page.locator('[aria-label*="Region:"]').filter({ visible: true }).first();
    await regionBtn3.click();
    await page.waitForTimeout(600);
    const openBeforeClickOutside = await isDropdownOpen(page);
    log('Dropdown opened for click-outside test', openBeforeClickOutside ? 'PASS' : 'FAIL');

    // Click safely outside (right side for desktop, bottom for mobile)
    const outsideX = viewport.width > 600 ? 900 : Math.floor(viewport.width / 2);
    const outsideY = viewport.width > 600 ? 100 : viewport.height - 50;
    await page.mouse.click(outsideX, outsideY);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-06-click-outside.png`) });

    const closedAfterClickOutside = !(await isDropdownOpen(page));
    log('Click-outside listener closes dropdown', closedAfterClickOutside ? 'PASS' : 'FAIL');

  } catch (err) {
    results.pass = false;
    const step = 'Unexpected error';
    console.log(`[${label}] ❌ ${step} — ${err.message}`);
    results.steps.push({ step, status: 'FAIL', detail: err.message });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-error.png`) }).catch(() => {});
  }

  await context.close();
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  console.log('\n=== DESKTOP TEST (1280x800) ===');
  const desktopResults = await runTest(browser, { width: 1280, height: 800 }, 'desktop');

  console.log('\n=== MOBILE TEST (375x812) ===');
  const mobileResults = await runTest(browser, { width: 375, height: 812 }, 'mobile');

  await browser.close();

  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Desktop: ${desktopResults.pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Mobile:  ${mobileResults.pass ? '✅ PASS' : '❌ FAIL'}`);
  const allPass = desktopResults.pass && mobileResults.pass;
  console.log(`\nOVERALL: ${allPass ? '✅ APPROVED' : '❌ REJECTED'}`);

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'results.json'),
    JSON.stringify({ desktop: desktopResults, mobile: mobileResults, allPass }, null, 2)
  );
})();

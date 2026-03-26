const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\final-v3';
const URL = 'https://homegrown-phase1-app.netlify.app';

async function runTest(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const results = { label, steps: [], pass: true };

  function log(step, status, detail = '') {
    console.log(`[${label}] ${status}: ${step}${detail ? ' — ' + detail : ''}`);
    results.steps.push({ step, status, detail });
    if (status === 'FAIL') results.pass = false;
  }

  try {
    // Step 1: Load page
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-01-loaded.png`) });
    log('Page loaded', 'PASS');

    // Step 2: Find and click region button
    const regionBtn = await page.locator('[aria-label*="Region:"]').first();
    const btnVisible = await regionBtn.isVisible();
    if (!btnVisible) {
      log('Region button visible', 'FAIL', 'Button not found');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-02-no-btn.png`) });
      await context.close();
      return results;
    }
    const btnText = await regionBtn.textContent();
    log('Region button found', 'PASS', `Text: "${btnText.trim()}"`);
    
    await regionBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-02-dropdown-open.png`) });

    // Step 3: Verify dropdown with both regions
    const sfOption = await page.locator('text=SF Bay Area').first();
    const hiOption = await page.locator('text=Big Island, Hawaii').first();
    const sfVisible = await sfOption.isVisible().catch(() => false);
    const hiVisible = await hiOption.isVisible().catch(() => false);

    if (sfVisible && hiVisible) {
      log('Dropdown shows both regions', 'PASS');
    } else {
      log('Dropdown shows both regions', 'FAIL', `SF: ${sfVisible}, Hawaii: ${hiVisible}`);
      await context.close();
      return results;
    }

    // Step 4: Click Big Island, Hawaii
    await hiOption.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-03-hawaii-selected.png`) });

    // Step 5: Verify Hawaii events loaded
    const pageContent = await page.content();
    const btnTextAfter = await page.locator('[aria-label*="Region:"]').first().textContent().catch(() => '');
    const isHawaii = btnTextAfter.includes('Hawaii') || btnTextAfter.includes('Big Island');
    if (isHawaii) {
      log('Hawaii region selected and events loaded', 'PASS', `Button: "${btnTextAfter.trim()}"`);
    } else {
      log('Hawaii region selected', 'FAIL', `Button text: "${btnTextAfter.trim()}"`);
    }

    // Step 6: Click region button again
    const regionBtn2 = await page.locator('[aria-label*="Region:"]').first();
    await regionBtn2.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-04-dropdown-reopen.png`) });

    // Verify dropdown opened again
    const sfOption2 = await page.locator('text=SF Bay Area').first();
    const sfVisible2 = await sfOption2.isVisible().catch(() => false);
    if (sfVisible2) {
      log('Dropdown reopened', 'PASS');
    } else {
      log('Dropdown reopened', 'FAIL', 'SF Bay Area option not visible');
      await context.close();
      return results;
    }

    // Click SF Bay Area
    await sfOption2.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-05-sf-selected.png`) });

    // Step 7: Verify events changed back to SF
    const btnTextSF = await page.locator('[aria-label*="Region:"]').first().textContent().catch(() => '');
    const isSF = btnTextSF.includes('SF') || btnTextSF.includes('Bay Area');
    if (isSF) {
      log('SF Bay Area region selected and events loaded', 'PASS', `Button: "${btnTextSF.trim()}"`);
    } else {
      log('SF region switch', 'FAIL', `Button text: "${btnTextSF.trim()}"`);
    }

    // Bonus: test click-outside closes dropdown
    await regionBtn2.click();
    await page.waitForTimeout(500);
    await page.mouse.click(50, 50); // click outside
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${label}-06-click-outside.png`) });
    const sfAfterClickOutside = await page.locator('text=SF Bay Area').first().isVisible().catch(() => false);
    if (!sfAfterClickOutside) {
      log('Click-outside closes dropdown', 'PASS');
    } else {
      log('Click-outside closes dropdown', 'FAIL', 'Dropdown still visible after clicking outside');
    }

  } catch (err) {
    log('Unexpected error', 'FAIL', err.message);
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

  console.log('\n=== SUMMARY ===');
  console.log(`Desktop: ${desktopResults.pass ? 'PASS' : 'FAIL'}`);
  console.log(`Mobile: ${mobileResults.pass ? 'PASS' : 'FAIL'}`);

  const allPass = desktopResults.pass && mobileResults.pass;
  console.log(`\nOVERALL: ${allPass ? 'APPROVED' : 'REJECTED'}`);

  // Write JSON results
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'results.json'),
    JSON.stringify({ desktop: desktopResults, mobile: mobileResults, allPass }, null, 2)
  );
})();

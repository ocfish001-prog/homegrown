const { chromium } = require('playwright');
const path = require('path');
const SD = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase3-final';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);

  const getState = async () => page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    const s = {};
    for (const btn of btns) {
      const t = btn.textContent.trim();
      if (['All Dates','Today','This Weekend','This Week','This Month'].some(f => t.includes(f))) {
        s[t] = btn.className.includes('bg-sage text-white') ? 'ACTIVE' : 'inactive';
      }
    }
    return s;
  });

  // Find EXACT "This Week" button (not "This Weekend")
  const allBtns = await page.$$('button');
  let thisWeekBtn = null;
  for (const btn of allBtns) {
    const txt = (await btn.textContent()).trim();
    // Must be exactly "This Week" with optional emoji prefix
    if (txt === '📆 This Week' || txt === 'This Week') {
      thisWeekBtn = btn;
      console.log('Found exact This Week button:', txt);
      break;
    }
  }

  if (!thisWeekBtn) {
    console.log('FAIL: This Week button not found');
    await browser.close();
    return;
  }

  await thisWeekBtn.click();
  await sleep(1000);
  const stateAfterClick = await getState();
  console.log('After clicking This Week:', JSON.stringify(stateAfterClick));
  await page.screenshot({ path: path.join(SD, 'f3-01-this-week-clicked.png') });

  // Verify This Week is now active
  const thisWeekIsActive = stateAfterClick['📆 This Week'] === 'ACTIVE';
  console.log('This Week actually activated:', thisWeekIsActive);
  
  if (!thisWeekIsActive) {
    console.log('ISSUE: This Week click did not activate it. Checking what IS active...');
    const active = Object.entries(stateAfterClick).find(([k,v]) => v === 'ACTIVE');
    console.log('Currently active:', active);
  }

  // Now switch region - find header region button (y < 60)
  const allBtns2 = await page.$$('button');
  let hdrBtn = null;
  for (const btn of allBtns2) {
    const txt = (await btn.textContent()).trim();
    const box = await btn.boundingBox();
    if (box && box.y < 60 && (txt.includes('Hawaii') || txt.includes('Bay'))) {
      hdrBtn = btn;
      console.log('Header region button:', txt, 'at y=', Math.round(box.y));
      break;
    }
  }

  if (hdrBtn) {
    await hdrBtn.click();
    await sleep(1500);
    await page.screenshot({ path: path.join(SD, 'f3-02-dropdown-open.png') });

    // Pick different region from dropdown
    const dropBtns = await page.$$('button');
    for (const btn of dropBtns) {
      const txt = (await btn.textContent()).trim();
      // Switch to whatever we're not on
      if (txt.includes('Bay Area') || txt.includes('SF Bay')) {
        console.log('Switching to:', txt);
        await btn.click();
        await sleep(3000);
        break;
      }
      if (txt.includes('Big Island') || txt.includes('Hawaii')) {
        // If already on Bay Area, switch to Big Island
      }
    }

    const stateAfterSwitch = await getState();
    console.log('After region switch:', JSON.stringify(stateAfterSwitch));
    await page.screenshot({ path: path.join(SD, 'f3-03-after-switch.png') });

    const thisWeekStillActive = stateAfterSwitch['📆 This Week'] === 'ACTIVE';
    const allDatesNowActive = stateAfterSwitch['📅 All Dates'] === 'ACTIVE';
    
    console.log('\nThis Week still active after switch:', thisWeekStillActive);
    console.log('All Dates active after switch:', allDatesNowActive);
    
    if (allDatesNowActive && !thisWeekStillActive) {
      console.log('\nFIX 3 RESULT: PASS - filter reset to All Dates ✅');
    } else if (thisWeekStillActive) {
      console.log('\nFIX 3 RESULT: FAIL - This Week filter persisted across region switch ❌');
    } else {
      // Get which one IS active
      const activeEntry = Object.entries(stateAfterSwitch).find(([k,v]) => v === 'ACTIVE');
      console.log('\nFIX 3 RESULT: INCONCLUSIVE - active filter:', activeEntry);
    }
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

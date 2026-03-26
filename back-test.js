const { chromium } = require('playwright');
const path = require('path');
const SD = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase3-final';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  
  console.log('=== BACK BUTTON TEST ===');
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  
  // Default region is Big Island — has events
  const articles = await page.$$('article');
  console.log('Articles:', articles.length);
  
  if (articles.length > 0) {
    await articles[0].click();
    await sleep(3000);
    const detailUrl = page.url();
    console.log('URL after click:', detailUrl);
    await page.screenshot({ path: path.join(SD, 'bt-final-01-detail.png') });
    
    // Dump body text
    const bodyText = await page.textContent('body');
    console.log('Body text (first 300):', bodyText.substring(0, 300));
    
    // All elements in top 150px
    const allEls = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      const found = [];
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < 150) {
          const txt = el.textContent.trim().substring(0, 60);
          if (txt && el.children.length < 3) {
            found.push({ tag: el.tagName, txt, top: Math.round(rect.top), left: Math.round(rect.left), cls: el.className.substring(0, 80) });
          }
        }
      }
      return found;
    });
    console.log('\nAll elements in top 150px:');
    allEls.forEach(e => console.log(`  [${e.top},${e.left}] ${e.tag}: "${e.txt}" cls="${e.cls}"`));
    
    // Full page screenshot
    await page.screenshot({ path: path.join(SD, 'bt-final-02-detail-fullpage.png'), fullPage: true });
    console.log('📸 fullpage detail screenshot taken');
    
    // Look for "Go back" text anywhere
    const goBackEls = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      const found = [];
      for (const el of all) {
        if (el.textContent.trim().toLowerCase().includes('go back') || 
            el.textContent.trim().toLowerCase() === 'back') {
          const rect = el.getBoundingClientRect();
          found.push({ tag: el.tagName, txt: el.textContent.trim(), visible: rect.width > 0, cls: el.className });
        }
      }
      return found;
    });
    console.log('\nGo back elements:', JSON.stringify(goBackEls, null, 2));
    
    // Try clicking "Go back" 
    const goBackBtn = await page.$('button:has-text("Go back")');
    const backBtn = await page.$('button:has-text("Back")');
    const btn = goBackBtn || backBtn;
    
    if (btn) {
      const btnText = await btn.textContent();
      console.log('\nClicking button:', btnText);
      const beforeUrl = page.url();
      await btn.click();
      await sleep(2500);
      const afterUrl = page.url();
      console.log(`${beforeUrl} → ${afterUrl}`);
      await page.screenshot({ path: path.join(SD, 'bt-final-03-after-back.png') });
      
      if (afterUrl === 'about:blank') {
        console.log('RESULT: FAIL - still about:blank');
      } else {
        console.log('RESULT: PASS -', afterUrl);
      }
    } else {
      console.log('No Go back / Back button found');
    }
  }
  
  console.log('\n=== FILTER RESET TEST ===');
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);
  
  // Get state before
  const getState = async () => {
    return page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      const s = {};
      for (const btn of btns) {
        const t = btn.textContent.trim();
        if (['All Dates','Today','This Weekend','This Week','This Month'].some(f => t.includes(f))) {
          // Check active class (bg-sage = active, bg-white = inactive)
          s[t] = btn.className.includes('bg-sage text-white') ? 'ACTIVE' : 'inactive';
        }
      }
      return s;
    });
  };
  
  console.log('Initial state:', await getState());
  
  // Click This Week
  const twBtn = await page.$('button:has-text("This Week")');
  if (twBtn) {
    await twBtn.click();
    await sleep(1000);
    console.log('After This Week click:', await getState());
    await page.screenshot({ path: path.join(SD, 'f3-final-01-this-week.png') });
    
    // Switch region - find region button in header (not in sidebar)
    const regionBtns = await page.$$('button');
    let hdrRegionBtn = null;
    for (const btn of regionBtns) {
      const txt = (await btn.textContent()).trim();
      const box = await btn.boundingBox();
      if (box && box.y < 60 && (txt.includes('Hawaii') || txt.includes('Bay'))) {
        hdrRegionBtn = btn;
        console.log('Header region btn:', txt, 'at y=', box.y);
        break;
      }
    }
    
    if (hdrRegionBtn) {
      await hdrRegionBtn.click();
      await sleep(1500);
      await page.screenshot({ path: path.join(SD, 'f3-final-02-region-dropdown.png') });
      
      // Find and click a different region
      const opts = await page.$$('button, li, [role="option"]');
      for (const opt of opts) {
        const txt = (await opt.textContent()).trim();
        if (txt.includes('Bay Area') || txt.includes('SF Bay')) {
          console.log('Switching to:', txt);
          await opt.click();
          await sleep(3000);
          break;
        }
      }
      
      const afterSwitch = await getState();
      console.log('After region switch:', afterSwitch);
      await page.screenshot({ path: path.join(SD, 'f3-final-03-after-switch.png') });
      
      const thisWeekStillActive = afterSwitch['📆 This Week'] === 'ACTIVE';
      const allDatesActive = afterSwitch['📅 All Dates'] === 'ACTIVE';
      console.log(`This Week still active: ${thisWeekStillActive}`);
      console.log(`All Dates active: ${allDatesActive}`);
      
      if (!thisWeekStillActive && allDatesActive) {
        console.log('FIX 3 RESULT: PASS - filter reset to All Dates');
      } else if (thisWeekStillActive) {
        console.log('FIX 3 RESULT: FAIL - This Week still active');
      } else {
        console.log('FIX 3 RESULT: INCONCLUSIVE -', JSON.stringify(afterSwitch));
      }
    } else {
      console.log('Region button not found in header at y<60');
      // Try y<100
      for (const btn of regionBtns) {
        const txt = (await btn.textContent()).trim();
        const box = await btn.boundingBox();
        if (box && box.y < 100 && (txt.includes('Hawaii') || txt.includes('Bay') || txt.includes('Island'))) {
          console.log('Alt region btn:', txt, 'at y=', box.y);
        }
      }
    }
  }
  
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

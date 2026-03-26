const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'scripts', 'parker-screenshots', 'phase3');
const BASE_URL = 'https://homegrown-phase1-app.netlify.app';

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 ${name}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  // ---- PART 1: Deep dive on event detail page ----
  console.log('\n=== EVENT DETAIL DEEP DIVE ===');
  
  await page.goto(BASE_URL + '/events/hawaii-pukalani-market-4-01', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, 'detail-full-scroll');

  // Get ALL text content
  const allText = await page.textContent('body');
  console.log('\n--- Body text (first 3000 chars) ---');
  console.log(allText.substring(0, 3000));

  // Get ALL buttons
  const allButtons = await page.$$eval('button, [role="button"]', els =>
    els.map(el => ({
      text: el.textContent.trim().substring(0, 100),
      classes: el.className.substring(0, 100),
      ariaLabel: el.getAttribute('aria-label') || '',
      disabled: el.disabled,
      visible: el.offsetParent !== null
    }))
  );
  console.log('\n--- All buttons ---');
  allButtons.forEach(b => console.log(JSON.stringify(b)));

  // Get ALL links
  const allLinks = await page.$$eval('a', els =>
    els.map(el => ({
      text: el.textContent.trim().substring(0, 80),
      href: el.href,
      classes: el.className.substring(0, 80)
    })).filter(l => l.href)
  );
  console.log('\n--- All links ---');
  allLinks.forEach(l => console.log(JSON.stringify(l)));

  // Get SVG icons (hearts, etc.)
  const svgIcons = await page.$$eval('svg', els =>
    els.map(el => ({
      classes: el.className.baseVal || el.getAttribute('class') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      parent: el.parentElement?.tagName,
      parentClass: el.parentElement?.className?.substring(0, 80) || ''
    }))
  );
  console.log('\n--- SVG icons ---');
  svgIcons.forEach(s => console.log(JSON.stringify(s)));

  // Scroll down to see more
  await page.evaluate(() => window.scrollTo(0, 500));
  await sleep(500);
  await screenshot(page, 'detail-scrolled-500');
  
  await page.evaluate(() => window.scrollTo(0, 1000));
  await sleep(500);
  await screenshot(page, 'detail-scrolled-1000');

  await page.evaluate(() => window.scrollTo(0, 2000));
  await sleep(500);
  await screenshot(page, 'detail-scrolled-2000');

  // Check localStorage
  const localStorage = await page.evaluate(() => {
    const items = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      items[key] = window.localStorage.getItem(key);
    }
    return items;
  });
  console.log('\n--- localStorage ---');
  console.log(JSON.stringify(localStorage, null, 2));

  // ---- PART 2: Region Switcher ----
  console.log('\n\n=== REGION SWITCHER DEEP DIVE ===');
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, 'home-region-start');

  // Get FULL page HTML structure summary
  const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 5000));
  console.log('\n--- Body HTML (first 5000 chars) ---');
  console.log(bodyHtml);

  // Find ALL elements with "SF" or "Bay" or "region" or "switch" text
  const regionRelated = await page.$$eval('*', els =>
    Array.from(els)
      .filter(el => {
        const text = el.textContent.trim();
        return (text.length < 40 && /sf bay|san francisco|big island|hawaii|region|switch region/i.test(text)) 
               || /region|switcher|location-selector/i.test(el.className);
      })
      .map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 60),
        classes: el.className?.substring(0, 80) || '',
        id: el.id || '',
        visible: el.getBoundingClientRect().width > 0
      }))
      .slice(0, 30)
  );
  console.log('\n--- Region-related elements ---');
  regionRelated.forEach(r => console.log(JSON.stringify(r)));

  // Check the current region button more carefully
  const regionBtnInfo = await page.$$eval('[class*="bg-sage"]', els =>
    els.map(el => ({
      tag: el.tagName,
      text: el.textContent.trim(),
      classes: el.className?.substring(0, 120),
      visible: el.getBoundingClientRect().width > 0,
      rect: {
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
        w: el.getBoundingClientRect().width,
        h: el.getBoundingClientRect().height
      }
    }))
  );
  console.log('\n--- bg-sage elements ---');
  regionBtnInfo.forEach(r => console.log(JSON.stringify(r)));

  // Try clicking the VISIBLE region button (not the hidden one)
  const visibleRegionBtns = regionBtnInfo.filter(r => r.visible && r.rect.w > 0 && /big island|sf bay|hawaii/i.test(r.text));
  console.log('\nVisible region buttons:', visibleRegionBtns);

  if (visibleRegionBtns.length > 0) {
    // Click it and see what happens
    const btn = await page.$(`button:has-text("${visibleRegionBtns[0].text.substring(0, 20)}")`);
    if (btn) {
      const isVisible = await btn.isVisible();
      console.log('Button visible:', isVisible);
      await screenshot(page, 'before-region-click');
      
      try {
        await btn.click({ force: false, timeout: 5000 });
        await sleep(2000);
        await screenshot(page, 'after-region-click');
        const afterText = await page.textContent('body');
        console.log('After region click - modal/dropdown appeared?');
        console.log('Body change:', afterText.length);
        console.log(afterText.substring(0, 1000));
      } catch(e) {
        console.log('Click error:', e.message);
        // Try clicking at coordinate
        await btn.scrollIntoViewIfNeeded();
        await sleep(500);
        await screenshot(page, 'region-btn-scrolled');
        try {
          await btn.click({ force: true });
          await sleep(2000);
          await screenshot(page, 'after-force-click');
          const bodyAfter = await page.textContent('body');
          console.log('After force click:', bodyAfter.substring(0, 500));
        } catch(e2) {
          console.log('Force click also failed:', e2.message);
        }
      }
    }
  }

  // Check what SF Bay events look like vs current
  console.log('\n--- Current page events ---');
  const eventTitles = await page.$$eval('h3, [class*="title"], [class*="EventCard"] h2', 
    els => els.map(el => el.textContent.trim()).filter(t => t.length > 5).slice(0, 10)
  );
  console.log(eventTitles);

  // ---- PART 3: Date filter deep check ----
  console.log('\n\n=== DATE FILTER DEEP CHECK ===');
  
  // Get event count before filtering
  const initialEvents = await page.$$('[class*="EventCard"], [class*="event-card"], [class*="card"]:has(h3)');
  console.log('Initial event count:', initialEvents.length);

  // Click Weekend filter
  const weekendBtn = await page.$('button:has-text("This Weekend")');
  if (weekendBtn) {
    const initialTitles = await page.$$eval('[class*="card"]:has(h3) h3', els => els.map(e => e.textContent.trim()));
    console.log('Initial titles count:', initialTitles.length);
    
    await weekendBtn.click();
    await sleep(2000);
    await screenshot(page, 'filter-weekend-deep');
    
    const weekendTitles = await page.$$eval('[class*="card"]:has(h3) h3', els => els.map(e => e.textContent.trim()));
    console.log('Weekend titles count:', weekendTitles.length);
    console.log('Weekend titles:', weekendTitles);
    
    // Click Today
    const todayBtn = await page.$('button:has-text("Today")');
    if (todayBtn) {
      await todayBtn.click();
      await sleep(2000);
      await screenshot(page, 'filter-today-deep');
      const todayTitles = await page.$$eval('[class*="card"]:has(h3) h3', els => els.map(e => e.textContent.trim()));
      console.log('Today titles count:', todayTitles.length);
      console.log('Today titles:', todayTitles);
    }

    // Click All Dates
    const allBtn = await page.$('button:has-text("All Dates")');
    if (allBtn) {
      await allBtn.click();
      await sleep(2000);
      await screenshot(page, 'filter-all-dates-deep');
      const allTitles = await page.$$eval('[class*="card"]:has(h3) h3', els => els.map(e => e.textContent.trim()));
      console.log('All Dates titles count:', allTitles.length);
      console.log('Restored to initial count?', allTitles.length >= initialTitles.length);
    }
  }

  await browser.close();
  console.log('\n✅ Deep dive complete');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

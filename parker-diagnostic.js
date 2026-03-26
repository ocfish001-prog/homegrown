/**
 * Diagnostic test: log ALL API request URLs and responses
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4-final';
const URL = 'https://homegrown-phase1-app.netlify.app';

const requestLog = [];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  // NO extraHTTPHeaders - let the app send natural requests
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  // Log ALL API requests and responses
  page.on('request', req => {
    if (req.url().includes('/api/events') && !req.url().includes('/events/')) {
      const entry = { type: 'REQUEST', url: req.url(), ts: Date.now() };
      requestLog.push(entry);
      console.log(`→ REQUEST: ${req.url().replace('https://homegrown-phase1-app.netlify.app', '')}`);
    }
  });
  
  page.on('response', async res => {
    if (res.url().includes('/api/events') && !res.url().includes('/events/')) {
      try {
        const data = await res.json();
        const entry = {
          type: 'RESPONSE',
          url: res.url().replace('https://homegrown-phase1-app.netlify.app', ''),
          count: data.events?.length,
          hawaiiCoords: data.events?.filter(e => e.lat && e.lat < 25).length,
          sfCoords: data.events?.filter(e => e.lat && e.lat > 35).length,
          firstEvent: data.events?.[0]?.title?.substring(0, 50),
          firstLat: data.events?.[0]?.lat,
          ts: Date.now()
        };
        requestLog.push(entry);
        console.log(`← RESPONSE: ${entry.url.substring(0, 80)}`);
        console.log(`   count=${entry.count}, HI=${entry.hawaiiCoords}, SF=${entry.sfCoords}, first="${entry.firstEvent}" lat=${entry.firstLat}`);
      } catch(e) { /* ignore */ }
    }
  });
  
  console.log('\n=== STEP 1: Fresh load (clear localStorage) ===');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { try { localStorage.clear(); } catch(e) {} });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  const defaultRegion = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return 'NOT FOUND';
  });
  const defaultCount = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const s of spans) {
      const m = s.textContent?.trim().match(/^(\d+)\s+results?$/);
      if (m) return parseInt(m[1]);
    }
    return -1;
  });
  console.log(`Default region UI: "${defaultRegion}", count: ${defaultCount}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'd1-default-fresh.png') });
  
  console.log('\n=== STEP 2: Switch to Big Island ===');
  // Click region button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay Area') || t.includes('Big Island') || t.includes('SF Bay'))) {
        b.click(); break;
      }
    }
  });
  await page.waitForTimeout(600);
  
  // Click Big Island option
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, li, [role="option"], a'));
    for (const el of els) {
      if (el.textContent?.includes('Big Island') && el.textContent?.includes('Hilo')) {
        el.click(); return;
      }
    }
    // Fallback
    for (const el of els) {
      if (el.textContent?.toLowerCase().includes('big island')) {
        el.click(); return;
      }
    }
  });
  await page.waitForTimeout(3000);
  
  const biRegion = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return 'NOT FOUND';
  });
  const biCount = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const s of spans) {
      const m = s.textContent?.trim().match(/^(\d+)\s+results?$/);
      if (m) return parseInt(m[1]);
    }
    return -1;
  });
  console.log(`Big Island region UI: "${biRegion}", count: ${biCount}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'd2-big-island.png') });
  
  console.log('\n=== STEP 3: Switch back to SF Bay ===');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Big Island') || t.includes('Hawaii') || t.includes('Bay'))) {
        b.click(); break;
      }
    }
  });
  await page.waitForTimeout(600);
  
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, li, [role="option"], a'));
    for (const el of els) {
      if (el.textContent?.includes('SF Bay Area') || el.textContent?.includes('San Francisco, CA')) {
        el.click(); return;
      }
    }
    for (const el of els) {
      if (el.textContent?.toLowerCase().includes('sf bay') || el.textContent?.toLowerCase().includes('bay area')) {
        el.click(); return;
      }
    }
  });
  await page.waitForTimeout(3000);
  
  const sfRegion2 = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return 'NOT FOUND';
  });
  const sfCount2 = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const s of spans) {
      const m = s.textContent?.trim().match(/^(\d+)\s+results?$/);
      if (m) return parseInt(m[1]);
    }
    return -1;
  });
  console.log(`SF Bay region UI: "${sfRegion2}", count: ${sfCount2}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'd3-sf-bay-back.png') });
  
  console.log('\n=== STEP 4: Apply Young Kids filter on SF Bay ===');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent?.includes('Young Kids')) { b.click(); return; }
    }
  });
  await page.waitForTimeout(3000);
  
  const sfYKRegion = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return 'NOT FOUND';
  });
  const sfYKCount = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const s of spans) {
      const m = s.textContent?.trim().match(/^(\d+)\s+results?$/);
      if (m) return parseInt(m[1]);
    }
    return -1;
  });
  console.log(`SF Young Kids region UI: "${sfYKRegion}", count: ${sfYKCount}`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'd4-sf-young-kids.png') });
  
  console.log('\n=== STEP 5: Big Island + This Month ===');
  // Switch to Big Island
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) { b.click(); break; }
    }
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, li, [role="option"], a'));
    for (const el of els) {
      if (el.textContent?.includes('Big Island')) { el.click(); return; }
    }
  });
  await page.waitForTimeout(2000);
  
  // Reset filters
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent?.includes('All Ages')) { b.click(); return; }
    }
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent?.includes('All Dates')) { b.click(); return; }
    }
  });
  await page.waitForTimeout(1000);
  
  // Click This Month
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent?.includes('This Month')) { b.click(); return; }
    }
  });
  await page.waitForTimeout(3000);
  
  const biMonthRegion = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      const t = b.textContent?.trim();
      if (t && (t.includes('Bay') || t.includes('Island') || t.includes('Hawaii'))) return t;
    }
    return 'NOT FOUND';
  });
  const biMonthCount = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    for (const s of spans) {
      const m = s.textContent?.trim().match(/^(\d+)\s+results?$/);
      if (m) return parseInt(m[1]);
    }
    return -1;
  });
  
  const biMonthTitles = await page.evaluate(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return [];
    const text = mainEl.innerText;
    const lines = text.split('\n').filter(l => l.trim().length > 10 && l.trim().length < 100);
    return lines.slice(0, 10);
  });
  
  console.log(`BI + This Month region UI: "${biMonthRegion}", count: ${biMonthCount}`);
  console.log('Visible content sample:', biMonthTitles.slice(0, 5));
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'd5-bi-this-month.png') });
  
  // Get event times for timezone check
  const eventTimes = await page.evaluate(() => {
    const text = document.querySelector('main')?.innerText || '';
    const matches = text.match(/\d{1,2}:\d{2}\s*(AM|PM)/gi) || [];
    return [...new Set(matches)];
  });
  console.log('Event times on BI page:', eventTimes);
  
  await browser.close();
  
  console.log('\n\n=== FULL REQUEST LOG ===');
  requestLog.forEach(r => {
    if (r.type === 'REQUEST') {
      console.log(`→ ${r.url.substring(0, 120)}`);
    } else {
      console.log(`← count=${r.count}, HI=${r.hawaiiCoords}, SF=${r.sfCoords}, lat0=${r.firstLat}`);
    }
  });
  
  // Save log
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'request-log.json'), JSON.stringify(requestLog, null, 2));
  console.log('\nDone! Request log saved.');
})();

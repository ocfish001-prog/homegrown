const { chromium } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase4';
const URL = 'https://homegrown-phase1-app.netlify.app';

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  console.log(`📸 ${name}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  // ===========================
  // COMBINATION FILTER TEST 1: Big Island + Young Kids
  // ===========================
  console.log('\n=== COMBO FILTER 1: Big Island + Young Kids ===');
  
  // Get all filter buttons
  const filterButtons = await page.$$eval('button', btns => btns.map(b => ({ text: b.textContent.trim(), class: b.className.slice(0, 50) })));
  console.log('Filter buttons:', JSON.stringify(filterButtons.filter(b => b.text.length < 30)));
  
  // Find Young Kids filter
  const youngKidsBtn = await page.$('button:has-text("Young Kids"), button:has-text("young kids")');
  if (youngKidsBtn) {
    await youngKidsBtn.click();
    await page.waitForTimeout(1500);
    await screenshot(page, 'combo1-big-island-young-kids');
    
    const cards = await page.$$eval('article', articles => articles.map(a => a.textContent.trim().slice(0, 150)));
    console.log(`Cards after Big Island + Young Kids (${cards.length} total):`);
    cards.slice(0, 5).forEach(c => console.log(' -', c.replace(/\s+/g, ' ')));
    
    const pageText = page.evaluate(() => document.body.innerText.toLowerCase());
    const hasHawaii = cards.some(c => c.toLowerCase().includes('hawaii') || c.toLowerCase().includes('hilo') || c.toLowerCase().includes('waimea') || c.toLowerCase().includes('kona') || c.toLowerCase().includes('hi 9'));
    const hasSF = cards.some(c => c.toLowerCase().includes('san francisco') || c.toLowerCase().includes('sf bay') || c.toLowerCase().includes('oakland') || c.toLowerCase().includes('berkeley'));
    const noResults = cards.length === 0;
    
    console.log(`Result: cards=${cards.length}, hasHawaii=${hasHawaii}, hasSF=${hasSF}, noResults=${noResults}`);
    
    // Reset
    await youngKidsBtn.click();
    await page.waitForTimeout(500);
  } else {
    console.log('Young Kids filter not found!');
    // Log all filter-like buttons
    const allBtns = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()));
    console.log('All buttons:', allBtns);
  }
  
  // ===========================
  // COMBINATION FILTER TEST 2: SF Bay + This Weekend
  // ===========================
  console.log('\n=== COMBO FILTER 2: SF Bay + This Weekend ===');
  
  // Click region switcher to change to SF Bay
  const regionBtn = await page.$('button:has-text("Big Island, Hawaii")');
  if (regionBtn) {
    await regionBtn.click();
    await page.waitForTimeout(500);
    
    // Find SF Bay option in the dropdown
    const sfOption = await page.$('li:has-text("SF Bay Area"), [role="menuitem"]:has-text("SF Bay"), button:has-text("SF Bay Area")');
    if (sfOption) {
      await sfOption.click();
      await page.waitForTimeout(2000);
      console.log('Switched to SF Bay Area');
      await screenshot(page, 'combo2-sf-bay-selected');
      
      const regionDisplay = await page.$eval('button[class*="rounded-full"]', b => b.textContent.trim()).catch(() => 'unknown');
      console.log('Current region:', regionDisplay);
      
      // Now click "This Weekend"
      const weekendBtn = await page.$('button:has-text("This Weekend")');
      if (weekendBtn) {
        await weekendBtn.click();
        await page.waitForTimeout(1500);
        await screenshot(page, 'combo2-sf-bay-this-weekend');
        
        const cards = await page.$$eval('article', articles => articles.map(a => a.textContent.trim().slice(0, 150)));
        console.log(`Cards after SF Bay + This Weekend (${cards.length} total):`);
        cards.forEach(c => console.log(' -', c.replace(/\s+/g, ' ')));
        
        const hasSF = cards.some(c => c.toLowerCase().includes('san francisco') || c.toLowerCase().includes('bay area') || c.toLowerCase().includes('oakland') || c.toLowerCase().includes('berkeley') || c.toLowerCase().includes('ca '));
        const hasHawaii = cards.some(c => c.toLowerCase().includes('hawaii') || c.toLowerCase().includes('hilo') || c.toLowerCase().includes('waimea') || c.toLowerCase().includes('kona'));
        const noResults = cards.length === 0;
        
        console.log(`Result: cards=${cards.length}, hasSF=${hasSF}, hasHawaii=${hasHawaii}, noResults=${noResults}`);
      } else {
        const allBtns = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()));
        console.log('This Weekend btn not found. Buttons:', allBtns);
      }
    } else {
      // Try to find any option in the dropdown
      const options = await page.$$eval('li, [role="option"], [role="menuitem"]', els => els.map(e => ({ text: e.textContent.trim(), class: e.className.slice(0, 60) })));
      console.log('Dropdown options found:', JSON.stringify(options.slice(0, 10)));
    }
  }
  
  // ===========================
  // EVENT DETAIL - FULL CHECK
  // ===========================
  console.log('\n=== EVENT DETAIL FULL CHECK ===');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  // Click first article/card
  const firstCard = await page.$('article');
  if (firstCard) {
    const cardAriaLabel = await firstCard.getAttribute('aria-label');
    console.log('Clicking card:', cardAriaLabel?.slice(0, 60));
    await firstCard.click();
    await page.waitForTimeout(2000);
    
    const detailUrl = page.url();
    console.log('Event detail URL:', detailUrl);
    
    if (detailUrl !== URL && detailUrl !== URL + '/') {
      // Check all meta tags
      const allMeta = await page.evaluate(() => {
        const tags = {};
        document.querySelectorAll('meta').forEach(m => {
          const key = m.getAttribute('property') || m.getAttribute('name') || m.getAttribute('http-equiv');
          const val = m.getAttribute('content');
          if (key && val) tags[key] = val;
        });
        return tags;
      });
      console.log('All meta tags:', JSON.stringify(allMeta, null, 2));
      
      const title = await page.title();
      console.log('Page title:', title);
      
      // Check for og:image specifically
      const hasOgImage = !!allMeta['og:image'];
      const hasOgTitle = !!allMeta['og:title'];
      const hasOgDesc = !!allMeta['og:description'];
      const twitterTitleIsGeneric = allMeta['twitter:title'] === 'Homegrown';
      
      console.log(`OG tags: title=${hasOgTitle}, desc=${hasOgDesc}, image=${hasOgImage}`);
      console.log(`Twitter title is generic: ${twitterTitleIsGeneric}`);
      
      // Check page content - any broken elements?
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasTODO = bodyText.includes('TODO') || bodyText.includes('Coming soon') || bodyText.includes('placeholder');
      console.log('Has TODO/placeholder text:', hasTODO);
      
      // Check for detail page screenshot
      await screenshot(page, 'event-detail-final');
      
      // Go back
      const t = Date.now();
      await page.goBack();
      await page.waitForLoadState('networkidle');
      console.log(`Back navigation: ${Date.now() - t}ms`);
      await screenshot(page, 'after-back-navigation');
    }
  }
  
  // ===========================
  // LOAD MORE DETAIL CHECK
  // ===========================
  console.log('\n=== LOAD MORE DETAIL CHECK ===');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  const initialCards = await page.$$('article');
  console.log(`Initial cards: ${initialCards.length}`);
  
  // Check Load More button
  const loadMoreBtn = await page.$('button:has-text("Load More"), button:has-text("load more"), [class*="load"]');
  if (loadMoreBtn) {
    const btnText = await loadMoreBtn.textContent();
    console.log(`Load More button found: "${btnText}"`);
    
    // Click it multiple times
    for (let i = 0; i < 3; i++) {
      const btn = await page.$('button:has-text("Load More"), button:has-text("load more"), button:has-text("Show More")');
      if (!btn) { console.log(`No more Load More after ${i} clicks`); break; }
      await btn.click();
      await page.waitForTimeout(1500);
      const count = await page.$$eval('article', a => a.length);
      console.log(`After click ${i+1}: ${count} cards`);
    }
  } else {
    const allBtns = await page.$$eval('button', btns => btns.map(b => b.textContent.trim()).filter(t => t));
    console.log('No Load More found. Buttons:', allBtns);
  }
  
  // ===========================
  // ACCESSIBILITY - FILTER PILLS KEYBOARD
  // ===========================
  console.log('\n=== FILTER PILLS KEYBOARD ===');
  await page.goto(URL, { waitUntil: 'networkidle' });
  
  // Tab through until we hit a filter
  let filterFocused = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, text: el?.textContent?.trim().slice(0, 30), class: el?.className?.slice(0, 50) };
    });
    if (focused.text === 'All' || focused.text === 'Classes' || focused.text === 'Events') {
      console.log(`Filter pill focused at tab ${i+1}: "${focused.text}"`);
      filterFocused = true;
      
      // Try Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const activeFilter = await page.$eval('[aria-pressed="true"], [class*="active"][class*="filter"], [class*="selected"][class*="filter"]', 
        el => el?.textContent || 'unknown').catch(() => 'none');
      console.log('Active filter after Enter:', activeFilter);
      break;
    }
  }
  if (!filterFocused) console.log('Could not tab to filter pills');
  
  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });

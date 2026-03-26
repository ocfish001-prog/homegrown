const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOT_DIR = path.join('C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\phase3-final');
const URL = 'https://homegrown-phase1-app.netlify.app';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function ss(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: false });
  console.log(`📸 ${name}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile viewport
  const page = await ctx.newPage();

  console.log('=== Examining Event Detail Page ===');
  
  // Go to home, navigate to an event
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  await ss(page, 'bt-01-home');
  
  // Click a card
  const cards = await page.$$('article, [class*="EventCard"], [class*="card"]');
  console.log(`Cards: ${cards.length}`);
  
  if (cards.length > 0) {
    await cards[0].click();
    await sleep(2500);
    console.log('Event detail URL:', page.url());
    await ss(page, 'bt-02-event-detail');
    
    // Get the full HTML of the page to find back button
    const html = await page.content();
    const backRelated = html.match(/<[^>]*(back|Back|arrow|←|chevron)[^>]*>.*?<\/[^>]+>/g) || [];
    console.log('Back-related HTML elements:', backRelated.slice(0, 10));
    
    // Check for any element with ← character
    const arrowElements = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      const found = [];
      for (const el of all) {
        if (el.children.length === 0 && el.textContent.includes('←')) {
          found.push({
            tag: el.tagName,
            text: el.textContent.trim(),
            class: el.className,
            type: el.getAttribute('type'),
            onclick: el.getAttribute('onclick') ? 'yes' : 'no'
          });
        }
      }
      return found;
    });
    console.log('Arrow (←) elements:', JSON.stringify(arrowElements, null, 2));
    
    // Check for back-related classes/IDs/aria
    const backElements = await page.evaluate(() => {
      const found = [];
      const all = document.querySelectorAll('[class*="back"], [id*="back"], [aria-label*="back"], [aria-label*="Back"]');
      for (const el of all) {
        found.push({
          tag: el.tagName,
          text: el.textContent.trim().substring(0, 50),
          class: el.className,
          aria: el.getAttribute('aria-label'),
          href: el.getAttribute('href')
        });
      }
      return found;
    });
    console.log('Back-related elements by class/aria:', JSON.stringify(backElements, null, 2));
    
    // Log ALL visible interactive elements
    const interactive = await page.evaluate(() => {
      const found = [];
      const all = document.querySelectorAll('button, a, [role="button"]');
      for (const el of all) {
        if (el.offsetParent !== null) { // visible
          found.push({
            tag: el.tagName,
            text: el.textContent.trim().substring(0, 60),
            class: el.className.substring(0, 80),
            href: el.getAttribute('href'),
            aria: el.getAttribute('aria-label')
          });
        }
      }
      return found;
    });
    console.log('\nAll VISIBLE interactive elements on detail page:');
    interactive.forEach(e => console.log(`  ${e.tag}: "${e.text}" class="${e.class}" href="${e.href}" aria="${e.aria}"`));
    
    // Try the full-page screenshot to see everything  
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'bt-03-detail-fullpage.png'), fullPage: true });
    console.log('📸 bt-03-detail-fullpage');
    
    // Try scrolling to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await ss(page, 'bt-04-detail-top');

    // Try clicking browser back
    await page.goBack();
    await sleep(2000);
    console.log('After browser goBack:', page.url());
    await ss(page, 'bt-05-after-goback');
  }

  await browser.close();
}

run().catch(err => console.error('Fatal:', err));

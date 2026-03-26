const { chromium } = require('@playwright/test');
const path = require('path');

const URL = 'https://homegrown-phase1-app.netlify.app';
const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\recheck-2';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  
  console.log('Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Find the region switcher
  const switcher = page.locator('button[aria-label*="region"]').first();
  console.log('Switcher found:', await switcher.count() > 0);
  console.log('Switcher text:', await switcher.textContent());
  
  // Click to open dropdown
  await switcher.click();
  await sleep(1000);
  
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-desktop-dropdown-open.png') });
  
  // Check for the overlay
  const overlay = page.locator('div[aria-hidden="true"].fixed.inset-0');
  const overlayCount = await overlay.count();
  console.log('Overlay divs found:', overlayCount);
  
  for (let i = 0; i < Math.min(overlayCount, 5); i++) {
    const el = overlay.nth(i);
    const zIndex = await el.evaluate(e => window.getComputedStyle(e).zIndex);
    const pointerEvents = await el.evaluate(e => window.getComputedStyle(e).pointerEvents);
    const classes = await el.getAttribute('class');
    console.log(`Overlay ${i}: z-index=${zIndex}, pointer-events=${pointerEvents}, classes="${classes}"`);
  }
  
  // Check what's at the dropdown option coordinates
  const bigIslandSpan = page.locator('text=Big Island, Hawaii').first();
  const bbox = await bigIslandSpan.boundingBox();
  console.log('Big Island option bounding box:', bbox);
  
  // Check what element is at the center of the Big Island option
  if (bbox) {
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    
    const topElement = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return {
        tag: el?.tagName,
        class: el?.className,
        ariaHidden: el?.getAttribute('aria-hidden'),
        zIndex: window.getComputedStyle(el).zIndex,
        pointerEvents: window.getComputedStyle(el).pointerEvents,
      };
    }, [cx, cy]);
    
    console.log(`Element at (${cx}, ${cy}):`, JSON.stringify(topElement));
  }
  
  // Try force click
  console.log('\nAttempting force click on Big Island...');
  await bigIslandSpan.click({ force: true });
  await sleep(2000);
  
  const bodyText = await page.textContent('body');
  const hasHawaii = bodyText.includes('Hawaii') || bodyText.includes('Hilo') || bodyText.includes('Big Island');
  console.log('After force click - Hawaii content visible:', hasHawaii);
  
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-desktop-after-force-click.png') });
  
  // Also try JavaScript click directly
  await switcher.click();
  await sleep(1000);
  
  const bigIslandOption = page.locator('[role="option"]:has-text("Big Island"), [role="menuitem"]:has-text("Big Island"), button:has-text("Big Island"), li:has-text("Big Island")').first();
  const optCount = await bigIslandOption.count();
  console.log('Big Island option via role selector:', optCount);
  
  if (optCount > 0) {
    await bigIslandOption.click({ force: true });
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-desktop-after-js-click.png') });
  }
  
  // Try JS click
  await switcher.click();
  await sleep(500);
  await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    const bigIsland = spans.find(s => s.textContent.includes('Big Island'));
    if (bigIsland) {
      bigIsland.click();
      console.log('Clicked via JS');
    }
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-desktop-after-js-direct.png') });
  const finalText = await page.textContent('body');
  console.log('After JS click - page title/region area:', finalText.substring(0, 200));
  
  await browser.close();
}

main().catch(console.error);

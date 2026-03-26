const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const URL = 'https://homegrown-phase1-app.netlify.app';
const SCREENSHOTS = path.join(__dirname, 'parker-screenshots');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Parker — Region Switcher Final Verification');
  const browser = await chromium.launch({ headless: true });

  // === DESKTOP: Test switching from Big Island → SF Bay Area ===
  console.log('\n=== DESKTOP: Test switching Big Island → SF Bay Area ===');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/final-desktop-01-loaded.png` });

    // Current state
    const currentRegion = await page.locator('[aria-label*="region"]').first().textContent();
    console.log('Current region:', currentRegion?.trim());

    // Get initial events
    const initialEvents = await page.evaluate(() => {
      const cards = document.querySelectorAll('article');
      return Array.from(cards).slice(0, 3).map(c => c.textContent?.slice(0, 100).trim());
    });
    console.log('Initial events:', initialEvents);

    // Open dropdown
    await page.locator('[aria-label*="region"]').first().click();
    await sleep(1000);
    await page.screenshot({ path: `${SCREENSHOTS}/final-desktop-02-dropdown.png` });

    // Check overlay
    const overlayStyle = await page.evaluate(() => {
      const overlay = document.querySelector('div[aria-hidden="true"].fixed');
      if (!overlay) return 'no overlay';
      const s = getComputedStyle(overlay);
      return `z-index:${s.zIndex} pointer-events:${s.pointerEvents}`;
    });
    console.log('Overlay style:', overlayStyle);

    // Try clicking SF Bay Area with force (bypasses overlay)
    const sfOption = page.locator('text=SF Bay Area').first();
    const sfCount = await sfOption.count();
    console.log('SF Bay Area option count:', sfCount);
    if (sfCount > 0) {
      const sfVisible = await sfOption.isVisible();
      console.log('SF Bay Area visible:', sfVisible);
      await sfOption.click({ force: true });
      await sleep(3000);
      await page.screenshot({ path: `${SCREENSHOTS}/final-desktop-03-switched-to-SF.png` });

      const newRegion = await page.locator('[aria-label*="region"]').first().textContent().catch(() => '');
      console.log('Region after switching to SF:', newRegion?.trim());

      const sfEvents = await page.evaluate(() => {
        const cards = document.querySelectorAll('article');
        return Array.from(cards).slice(0, 3).map(c => c.textContent?.slice(0, 100).trim());
      });
      console.log('SF events:', sfEvents);

      const eventsChanged = JSON.stringify(sfEvents) !== JSON.stringify(initialEvents);
      console.log('Events changed after switch:', eventsChanged);

      // Now switch back to Big Island
      await page.locator('[aria-label*="region"]').first().click();
      await sleep(1000);
      await page.screenshot({ path: `${SCREENSHOTS}/final-desktop-04-dropdown-again.png` });
      
      const bigIslandOption = page.locator('text=Big Island').first();
      const biCount = await bigIslandOption.count();
      if (biCount > 0) {
        await bigIslandOption.click({ force: true });
        await sleep(3000);
        await page.screenshot({ path: `${SCREENSHOTS}/final-desktop-05-back-to-hawaii.png` });
        const finalRegion = await page.locator('[aria-label*="region"]').first().textContent().catch(() => '');
        console.log('Region after switching back to Big Island:', finalRegion?.trim());
      }
    }
    await ctx.close();
  }

  // === MOBILE: Test the VISIBLE region button ===
  console.log('\n=== MOBILE: Test visible region button ===');
  {
    const ctx = await browser.newContext({ 
      viewport: { width: 375, height: 812 }, 
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/final-mobile-01-loaded.png` });

    // Find ALL region buttons (visible ones)
    const allRegionBtns = await page.locator('[aria-label*="region"]').all();
    console.log('Total mobile region buttons with aria-label:', allRegionBtns.length);
    
    let visibleBtn = null;
    for (let i = 0; i < allRegionBtns.length; i++) {
      const visible = await allRegionBtns[i].isVisible();
      const text = await allRegionBtns[i].textContent().catch(() => '');
      const bbox = await allRegionBtns[i].boundingBox().catch(() => null);
      console.log(`  Mobile region btn[${i}]: "${text?.trim()}" visible:${visible} bbox:${JSON.stringify(bbox)}`);
      if (visible && !visibleBtn) visibleBtn = allRegionBtns[i];
    }

    if (visibleBtn) {
      console.log('Clicking visible mobile region button...');
      await visibleBtn.click();
      await sleep(1500);
      await page.screenshot({ path: `${SCREENSHOTS}/final-mobile-02-after-click.png` });

      // Check what happened — did dropdown open?
      const sfOption = page.locator('text=SF Bay Area').first();
      const sfCount = await sfOption.count();
      const sfVisible = sfCount > 0 ? await sfOption.isVisible().catch(() => false) : false;
      console.log('SF Bay Area option visible after click:', sfVisible);

      // List all visible text containing region info
      const pageText = await page.evaluate(() => {
        const all = document.querySelectorAll('[role="option"], [role="menuitem"], [data-value]');
        return Array.from(all).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().slice(0, 60),
          visible: el.offsetParent !== null
        }));
      });
      console.log('Mobile options after click:', pageText);

      if (sfVisible) {
        console.log('Mobile dropdown opened! Clicking SF Bay Area...');
        await sfOption.click({ force: true });
        await sleep(2000);
        await page.screenshot({ path: `${SCREENSHOTS}/final-mobile-03-switched-SF.png` });
        const newText = await visibleBtn.textContent().catch(() => '');
        console.log('Mobile region after switch:', newText?.trim());
      }

      // Check overlay on mobile too
      const mobileOverlay = await page.evaluate(() => {
        const overlay = document.querySelector('div[aria-hidden="true"].fixed');
        if (!overlay) return 'no overlay';
        const s = getComputedStyle(overlay);
        return `z-index:${s.zIndex} pointer-events:${s.pointerEvents}`;
      });
      console.log('Mobile overlay:', mobileOverlay);
    } else {
      console.log('NO visible mobile region button found');
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\nDone. Screenshots saved to:', SCREENSHOTS);
}

main().catch(console.error);

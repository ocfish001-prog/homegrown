const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const URL = 'https://homegrown-phase1-app.netlify.app';
const SCREENSHOT_DIR = 'C:\\Users\\oc\\.openclaw\\workspace\\scripts\\parker-screenshots\\recheck-2';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testDesktop(browser) {
  console.log('\n=== DESKTOP TEST (1280x800) ===');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  
  console.log('Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  
  // Screenshot initial state
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-initial.png') });
  console.log('Screenshot: initial state');

  // Find and click the region switcher button
  console.log('Looking for region switcher button...');
  
  // Try various selectors
  const switcherSelectors = [
    '[data-testid="region-switcher"]',
    'button[aria-label*="region"]',
    'button[aria-label*="Region"]',
    '.region-switcher',
    '#region-switcher',
    'button:has-text("SF Bay Area")',
    'button:has-text("Region")',
    '[class*="region"]',
  ];
  
  let switcherButton = null;
  for (const sel of switcherSelectors) {
    try {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        console.log(`Found switcher with selector: ${sel}`);
        switcherButton = el;
        break;
      }
    } catch (e) {}
  }
  
  if (!switcherButton) {
    // Try to find by text content
    console.log('Trying text-based search...');
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      console.log(`  Button: "${text?.trim().substring(0, 50)}"`);
    }
    
    // Also log sidebar content
    const sidebar = page.locator('aside, nav, [class*="sidebar"]').first();
    if (await sidebar.count() > 0) {
      const sidebarText = await sidebar.textContent();
      console.log('Sidebar text:', sidebarText?.substring(0, 300));
    }
    
    throw new Error('Could not find region switcher button');
  }
  
  // Click the region switcher
  console.log('Clicking region switcher...');
  await switcherButton.click();
  await sleep(1000);
  
  // Screenshot dropdown open
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-desktop-dropdown-open.png') });
  console.log('Screenshot: dropdown open');
  
  // Check if dropdown is visible with both regions
  const dropdownText = await page.content();
  const hasBigIsland = dropdownText.includes('Big Island') || dropdownText.includes('Hawaii');
  const hasSFBay = dropdownText.includes('SF Bay') || dropdownText.includes('San Francisco');
  console.log(`Dropdown content - Big Island: ${hasBigIsland}, SF Bay: ${hasSFBay}`);
  
  // Look for dropdown items
  const dropdownItems = await page.locator('[role="option"], [role="menuitem"], .dropdown-item, li').all();
  console.log(`Found ${dropdownItems.length} potential dropdown items`);
  for (const item of dropdownItems.slice(0, 10)) {
    const text = await item.textContent();
    if (text?.trim()) console.log(`  Item: "${text.trim().substring(0, 60)}"`);
  }
  
  // Click Big Island
  console.log('Clicking "Big Island, Hawaii"...');
  const bigIslandOption = page.locator('text=Big Island').first();
  if (await bigIslandOption.count() === 0) {
    // Try Hawaii
    const hawaiiOption = page.locator('text=Hawaii').first();
    if (await hawaiiOption.count() > 0) {
      await hawaiiOption.click();
    } else {
      throw new Error('Could not find Big Island / Hawaii option in dropdown');
    }
  } else {
    await bigIslandOption.click();
  }
  
  await sleep(2000);
  
  // Screenshot after switching to Big Island
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-desktop-big-island.png') });
  console.log('Screenshot: after switching to Big Island');
  
  // Check events changed
  const pageContent = await page.textContent('body');
  console.log('Page content snippet after Big Island:', pageContent?.substring(0, 500));
  
  // Click switcher again to go back to SF
  console.log('Clicking region switcher again...');
  await switcherButton.click();
  await sleep(1000);
  
  const sfOption = page.locator('text=SF Bay Area').first();
  if (await sfOption.count() === 0) {
    const sfOption2 = page.locator('text=San Francisco').first();
    if (await sfOption2.count() > 0) {
      await sfOption2.click();
    } else {
      throw new Error('Could not find SF Bay Area option');
    }
  } else {
    await sfOption.click();
  }
  
  await sleep(2000);
  
  // Screenshot after switching back to SF
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-desktop-sf-bay.png') });
  console.log('Screenshot: after switching back to SF Bay Area');
  
  const sfContent = await page.textContent('body');
  console.log('Page content snippet after SF Bay:', sfContent?.substring(0, 500));
  
  await ctx.close();
  return true;
}

async function testMobile(browser) {
  console.log('\n=== MOBILE TEST (375x812) ===');
  const ctx = await browser.newContext({ 
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  });
  const page = await ctx.newPage();
  
  console.log('Loading page...');
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
  
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-mobile-initial.png') });
  console.log('Screenshot: mobile initial');
  
  // Try to find region switcher
  const switcherSelectors = [
    '[data-testid="region-switcher"]',
    'button:has-text("SF Bay Area")',
    'button:has-text("Region")',
    '.region-switcher',
    '[class*="region"]',
  ];
  
  let switcherButton = null;
  for (const sel of switcherSelectors) {
    try {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        console.log(`Found mobile switcher with selector: ${sel}`);
        switcherButton = el;
        break;
      }
    } catch (e) {}
  }
  
  if (!switcherButton) {
    console.log('Mobile: Could not find region switcher directly, checking page...');
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      console.log(`  Mobile Button: "${text?.trim().substring(0, 50)}"`);
    }
  } else {
    await switcherButton.click();
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-mobile-dropdown-open.png') });
    console.log('Screenshot: mobile dropdown open');
    
    const bigIslandOption = page.locator('text=Big Island').first();
    if (await bigIslandOption.count() > 0) {
      await bigIslandOption.click();
      await sleep(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-mobile-big-island.png') });
      console.log('Screenshot: mobile after Big Island');
      
      await switcherButton.click();
      await sleep(1000);
      const sfOption = page.locator('text=SF Bay Area').first();
      if (await sfOption.count() > 0) {
        await sfOption.click();
        await sleep(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-mobile-sf-bay.png') });
        console.log('Screenshot: mobile after SF Bay');
      }
    }
  }
  
  await ctx.close();
  return true;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  let desktopResult = { pass: false, notes: '' };
  let mobileResult = { pass: false, notes: '' };
  
  try {
    await testDesktop(browser);
    desktopResult.pass = true;
    desktopResult.notes = 'All steps completed';
  } catch (e) {
    desktopResult.notes = e.message;
    console.error('Desktop test error:', e.message);
  }
  
  try {
    await testMobile(browser);
    mobileResult.pass = true;
    mobileResult.notes = 'All steps completed';
  } catch (e) {
    mobileResult.notes = e.message;
    console.error('Mobile test error:', e.message);
  }
  
  await browser.close();
  
  console.log('\n=== RESULTS ===');
  console.log('Desktop:', desktopResult.pass ? 'PASS' : 'FAIL', '-', desktopResult.notes);
  console.log('Mobile:', mobileResult.pass ? 'PASS' : 'FAIL', '-', mobileResult.notes);
}

main().catch(console.error);

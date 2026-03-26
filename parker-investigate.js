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
  
  // Get all links on the page to find event detail links
  const links = await page.$$eval('a', els => els.map(e => ({ href: e.href, text: e.textContent.trim().slice(0, 60), class: e.className.slice(0, 60) })));
  console.log('ALL LINKS (first 20):');
  links.slice(0, 20).forEach(l => console.log(JSON.stringify(l)));
  
  // Get page structure
  const structure = await page.evaluate(() => {
    const body = document.body;
    // Find main content area
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
    const firstCard = main.querySelector('[class*="card"], [class*="Card"], article');
    return {
      hasMain: !!document.querySelector('main'),
      firstCardHTML: firstCard?.outerHTML?.slice(0, 500),
      firstCardLinks: firstCard ? Array.from(firstCard.querySelectorAll('a')).map(a => ({ href: a.href, text: a.textContent.trim() })) : []
    };
  });
  console.log('\nSTRUCTURE:');
  console.log(JSON.stringify(structure, null, 2));
  
  // Look for region selector
  const regionInfo = await page.evaluate(() => {
    // Find all buttons
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const regionRelated = buttons.filter(b => {
      const text = b.textContent.trim();
      const cls = b.className;
      return text.includes('Bay') || text.includes('Island') || text.includes('SF') || text.includes('Hawaii') || 
             cls.includes('region') || cls.includes('Region') || cls.includes('switcher');
    });
    return regionRelated.map(b => ({ text: b.textContent.trim(), class: b.className.slice(0, 80), id: b.id }));
  });
  console.log('\nREGION BUTTONS:');
  console.log(JSON.stringify(regionInfo, null, 2));
  
  // After clicking Big Island button, what opens?
  const bigIslandBtn = await page.$('button:has-text("Big Island")');
  if (bigIslandBtn) {
    await bigIslandBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, 'investigate-region-dropdown');
    
    const dropdown = await page.evaluate(() => {
      // Look for visible dropdowns/menus
      const allEls = document.querySelectorAll('[class*="dropdown"], [class*="menu"], [class*="Dropdown"], [class*="Menu"], [class*="select"], [class*="Select"], [class*="popover"], [class*="Popover"], [role="listbox"], [role="menu"], [role="dialog"]');
      return Array.from(allEls).map(el => {
        const style = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          class: el.className.slice(0, 80),
          visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
          text: el.textContent.trim().slice(0, 100)
        };
      }).filter(e => e.visible);
    });
    console.log('\nOPEN DROPDOWNS:');
    console.log(JSON.stringify(dropdown, null, 2));
    
    // Try to find SF Bay option
    const sfOption = await page.$('li:has-text("SF"), li:has-text("San Francisco"), [role="option"]:has-text("SF"), button:has-text("SF Bay"), [class*="option"]:has-text("SF")');
    if (sfOption) {
      console.log('\nFound SF Bay option!');
      const sfText = await sfOption.textContent();
      console.log('SF option text:', sfText);
    } else {
      // Log all visible li/option elements
      const options = await page.$$eval('li, [role="option"]', els => els.map(e => ({ text: e.textContent.trim(), class: e.className.slice(0, 60) })).filter(e => e.text));
      console.log('\nAll li/options:', JSON.stringify(options.slice(0, 20)));
    }
    
    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  
  // Check for OG tags on homepage and event detail
  const homepageOG = await page.evaluate(() => {
    const tags = {};
    document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach(m => {
      tags[m.getAttribute('property') || m.getAttribute('name')] = m.getAttribute('content');
    });
    return tags;
  });
  console.log('\nHOMEPAGE OG TAGS:', JSON.stringify(homepageOG, null, 2));
  
  // Try clicking the first card to navigate to detail
  const firstCard = await page.$('[class*="card"], [class*="Card"], article');
  if (firstCard) {
    const cardHTML = await firstCard.evaluate(el => el.outerHTML.slice(0, 300));
    console.log('\nFIRST CARD HTML:', cardHTML);
    
    // Click the card itself
    try {
      await firstCard.click();
      await page.waitForTimeout(2000);
      const newUrl = page.url();
      console.log('\nAfter clicking card, URL:', newUrl);
      if (newUrl !== URL && newUrl !== URL + '/') {
        await screenshot(page, 'investigate-event-detail');
        
        const detailOG = await page.evaluate(() => {
          const tags = {};
          document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach(m => {
            tags[m.getAttribute('property') || m.getAttribute('name')] = m.getAttribute('content');
          });
          return tags;
        });
        console.log('EVENT DETAIL OG TAGS:', JSON.stringify(detailOG, null, 2));
        
        const title = await page.title();
        console.log('Event detail page title:', title);
        
        // Go back
        await page.goBack();
        await page.waitForTimeout(1000);
        await screenshot(page, 'investigate-after-back');
      }
    } catch (e) {
      console.log('Error clicking card:', e.message);
    }
  }
  
  // Mobile investigation
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(URL, { waitUntil: 'networkidle' });
  
  // Check bottom nav height and safe area
  const navInfo = await mobilePage.evaluate(() => {
    const navSelectors = ['nav', '[class*="bottom"]', '[class*="tab"]', '[class*="nav"]'];
    for (const sel of navSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.y > 400) {
          return {
            selector: sel,
            y: rect.y,
            height: rect.height,
            bottom: rect.bottom,
            class: el.className.slice(0, 100),
            html: el.outerHTML.slice(0, 300)
          };
        }
      }
    }
    return null;
  });
  console.log('\nMOBILE NAV INFO:', JSON.stringify(navInfo, null, 2));
  
  // Check mobile card images
  const mobileImages = await mobilePage.evaluate(() => {
    const cards = document.querySelectorAll('[class*="card"], [class*="Card"], article');
    return Array.from(cards).slice(0, 3).map(card => {
      const img = card.querySelector('img');
      const divWithBg = Array.from(card.querySelectorAll('div')).find(d => window.getComputedStyle(d).backgroundImage !== 'none');
      return {
        hasImg: !!img,
        imgSrc: img?.src?.slice(0, 80),
        imgAlt: img?.alt,
        hasBgImage: !!divWithBg,
        bgImage: divWithBg ? window.getComputedStyle(divWithBg).backgroundImage.slice(0, 80) : null
      };
    });
  });
  console.log('\nMOBILE CARD IMAGES:', JSON.stringify(mobileImages, null, 2));
  
  await screenshot(mobilePage, 'investigate-mobile-detail');
  
  await browser.close();
}

run().catch(e => { console.error(e.message); process.exit(1); });

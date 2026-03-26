const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Intercept network requests to see what API calls are made
  const apiCalls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('supabase') || url.includes('api') || url.includes('event') || url.includes('search')) {
      apiCalls.push({ method: req.method(), url: url.substring(0, 120) });
    }
  });
  page.on('response', async (res) => {
    const url = res.url();
    if ((url.includes('supabase') || url.includes('api')) && res.status() === 200) {
      try {
        const text = await res.text();
        if (text.length < 5000 && text.startsWith('[') || text.startsWith('{')) {
          console.log('API RESPONSE:', url.substring(0, 100), '| size:', text.length, '| preview:', text.substring(0, 200));
        }
      } catch(e) {}
    }
  });
  
  await page.goto('https://homegrown-phase1-app.netlify.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  console.log('\n=== API CALLS MADE ===');
  apiCalls.forEach(c => console.log(c.method, c.url));
  
  // Now click Young Kids and see what happens
  console.log('\n=== Clicking Young Kids ===');
  apiCalls.length = 0;
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent && b.textContent.includes('Young Kids')) {
        console.log('Clicking Young Kids button');
        b.click();
        break;
      }
    }
  });
  await page.waitForTimeout(2000);
  
  console.log('API calls after YK click:');
  apiCalls.forEach(c => console.log(c.method, c.url));
  
  // Get the visible count
  const countInfo = await page.evaluate(() => {
    const mainText = document.querySelector('main')?.innerText || '';
    const match = mainText.match(/(\d+)\s+results?/);
    
    // Try to find a non-sr-only count element
    const allEls = Array.from(document.querySelectorAll('h1, h2, h3, p, span, div'));
    const countEls = allEls.filter(el => {
      return el.children.length === 0 && 
             el.textContent?.trim().match(/^\d+ results?$/) &&
             !el.closest('.sr-only') &&
             !el.classList.contains('sr-only');
    }).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim(),
      classes: el.className?.substring(0, 80),
      visible: el.offsetParent !== null
    }));
    
    return { mainMatch: match ? match[0] : null, countEls };
  });
  
  console.log('\nCount info after YK:', JSON.stringify(countInfo, null, 2));
  
  // Look at the actual list items
  const listItems = await page.evaluate(() => {
    // Find the event list container
    const main = document.querySelector('main');
    if (!main) return [];
    
    // Get all list-like elements
    const listEls = main.querySelectorAll('ul, ol');
    if (listEls.length > 0) {
      const ul = listEls[0];
      return Array.from(ul.children).slice(0, 5).map(li => li.innerText?.substring(0, 100));
    }
    
    // Try grid/flex children
    const gridEls = Array.from(main.querySelectorAll('[class*="grid"], [class*="flex"]')).filter(el => el.children.length > 2);
    if (gridEls.length > 0) {
      return Array.from(gridEls[0].children).slice(0, 5).map(c => c.innerText?.substring(0, 100));
    }
    
    return ['no list found'];
  });
  
  console.log('\nList items after YK filter:', listItems);
  
  // Check if age filter button looks active/selected
  const filterState = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.filter(b => {
      const t = b.textContent?.trim();
      return t && (t.includes('Young Kids') || t.includes('Family') || t.includes('All Ages') || t.includes('This Weekend') || t.includes('All Dates'));
    }).map(b => ({
      text: b.textContent?.trim(),
      classes: b.className?.substring(0, 120),
      ariaCurrent: b.getAttribute('aria-current'),
      ariaSelected: b.getAttribute('aria-selected'),
      dataActive: b.getAttribute('data-active'),
      dataSelected: b.getAttribute('data-selected'),
    }));
  });
  
  console.log('\nFilter button states:');
  filterState.forEach(f => console.log(JSON.stringify(f)));
  
  await browser.close();
})();

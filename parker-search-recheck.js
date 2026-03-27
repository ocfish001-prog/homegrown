const { chromium } = require('playwright');

async function checkSearch() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('https://homegrown-phase1-app.netlify.app');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('=== SEARCH TEST ===');
  const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], input[type="text"]').first();
  
  if (await searchInput.count() > 0) {
    const initialCards = await page.locator('article').count();
    console.log(`Initial cards: ${initialCards}`);
    
    await searchInput.click();
    await searchInput.fill('market');
    await page.waitForTimeout(2000);
    
    const afterSearch = await page.locator('article').count();
    console.log(`After "market" search: ${afterSearch}`);
    
    // Clear with fill('')
    await searchInput.fill('');
    await page.waitForTimeout(2000);
    
    const afterClear = await page.locator('article').count();
    console.log(`After clear: ${afterClear}`);
    
    const searchWorks = afterSearch < initialCards && afterSearch > 0;
    const clearWorks = afterClear >= initialCards - 2;
    console.log(`Search filters: ${searchWorks}`);
    console.log(`Clear restores: ${clearWorks}`);
    console.log(`SEARCH TEST: ${searchWorks && clearWorks ? 'PASS' : 'PARTIAL'}`);
  }

  console.log('\n=== PAGE LOAD CONSOLE ERRORS ===');
  console.log(`Total errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e, i) => console.log(`Error ${i+1}: ${e.substring(0, 150)}`));
  
  // Check if events actually loaded (they should from static/fallback)
  const cardCount = await page.locator('article').count();
  console.log(`\nEvents loaded despite error: ${cardCount}`);
  
  // Check encoding issue in modal
  console.log('\n=== MODAL ENCODING CHECK ===');
  await page.locator('article').first().click();
  await page.waitForTimeout(2000);
  
  const modal = page.locator('[role="dialog"]').first();
  if (await modal.count() > 0) {
    const modalText = await modal.textContent();
    // Check for encoding artifacts
    const hasEncodingIssue = modalText.includes('Â·') || modalText.includes('â€') || modalText.includes('Ã');
    console.log(`Modal has encoding issues: ${hasEncodingIssue}`);
    if (hasEncodingIssue) {
      console.log(`Problematic text: ${modalText.substring(0, 300)}`);
    }
    
    // Check for actual event data
    console.log(`Modal content (first 200): ${modalText.substring(0, 200)}`);
  }
  
  await browser.close();
}

checkSearch().catch(console.error);

/**
 * Final verification: direct API calls with cache bypass + response header check
 */
const https = require('https');

function fetchUrl(url, extraHeaders) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Parker-Test/1.0',
        ...extraHeaders
      }
    };
    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      res.on('error', reject);
    });
  });
}

async function run() {
  console.log('=== Parker Final API Verification ===\n');
  
  const ts = Date.now();
  
  // Test 1: SF Bay fresh (cache-busted)
  const r1 = await fetchUrl(`https://homegrown-phase1-app.netlify.app/api/events?lat=37.7749&lng=-122.4194&radius=25&region=sfbay&_cb=${ts}`, {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });
  const d1 = JSON.parse(r1.body);
  console.log(`SF Bay (fresh): ${d1.events?.length} events`);
  console.log(`  Cache-age: ${r1.headers['age'] || 'n/a'}, x-cache: ${r1.headers['x-cache'] || r1.headers['cf-cache-status'] || 'n/a'}`);
  console.log(`  First 3 events:`);
  d1.events?.slice(0, 3).forEach(e => console.log(`    "${e.title?.substring(0,50)}" lat=${e.lat}`));
  
  // Test 2: Big Island / Hawaii fresh
  const r2 = await fetchUrl(`https://homegrown-phase1-app.netlify.app/api/events?lat=19.8968&lng=-155.5828&radius=25&region=hawaii&_cb=${ts}`, {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });
  const d2 = JSON.parse(r2.body);
  console.log(`\nBig Island/Hawaii (fresh): ${d2.events?.length} events`);
  console.log(`  Cache-age: ${r2.headers['age'] || 'n/a'}`);
  console.log(`  Hawaii coords (lat<25): ${d2.events?.filter(e => e.lat && e.lat < 25).length}`);
  console.log(`  SF coords (lat>35): ${d2.events?.filter(e => e.lat && e.lat > 35).length}`);
  console.log(`  Sources: ${JSON.stringify([...new Set(d2.events?.map(e => e.source))].slice(0,5))}`);
  console.log(`  First 5 events:`);
  d2.events?.slice(0, 5).forEach(e => console.log(`    "${e.title?.substring(0,50)}" lat=${e.lat}`));
  
  // Test 3: Age filter fresh
  const r3 = await fetchUrl(`https://homegrown-phase1-app.netlify.app/api/events?lat=37.7749&lng=-122.4194&radius=25&region=sfbay&ageRange=young_kids&_cb=${ts}`, {
    'Cache-Control': 'no-cache', 'Pragma': 'no-cache'
  });
  const d3 = JSON.parse(r3.body);
  const ykAgeRanges = [...new Set(d3.events?.slice(0,20).map(e => e.ageRange))];
  console.log(`\nSF Bay + ageRange=young_kids: ${d3.events?.length} events`);
  console.log(`  Age ranges present: ${ykAgeRanges.join(', ')}`);
  const filterWorking = d3.events?.every(e => e.ageRange === 'young_kids');
  console.log(`  All events are young_kids: ${filterWorking}`);
  
  // Test 4: Date filter fresh
  const r4 = await fetchUrl(`https://homegrown-phase1-app.netlify.app/api/events?lat=37.7749&lng=-122.4194&radius=25&region=sfbay&dateFilter=weekend&_cb=${ts}`, {
    'Cache-Control': 'no-cache', 'Pragma': 'no-cache'
  });
  const d4 = JSON.parse(r4.body);
  const sfAllCount = d1.events?.length;
  const sfWeekendCount = d4.events?.length;
  console.log(`\nSF Bay all: ${sfAllCount}, SF Bay weekend: ${sfWeekendCount}`);
  console.log(`  Date filter reduces count: ${sfWeekendCount < sfAllCount}`);
  if (d4.events?.length > 0) {
    d4.events.slice(0,3).forEach(e => console.log(`    "${e.title?.substring(0,50)}" date="${e.date}"`));
  }
  
  // Test 5: Hawaii timezone check
  console.log(`\nHawaii event times (from date field):`);
  const timePattern = /(\d{1,2}:\d{2})\s*(AM|PM)/gi;
  const hawaiiTimes = new Set();
  d2.events?.slice(0,30).forEach(e => {
    if (e.date) {
      let m;
      while ((m = timePattern.exec(e.date)) !== null) {
        hawaiiTimes.add(m[0]);
      }
      timePattern.lastIndex = 0;
    }
  });
  console.log(`  Times found: ${[...hawaiiTimes].join(', ')}`);
  
  // Check for overnight times
  const badTimes = [...hawaiiTimes].filter(t => {
    const m = t.match(/(\d{1,2}):\d{2}\s*(AM)/i);
    return m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 5;
  });
  console.log(`  Suspicious 1-5 AM times: ${badTimes.join(', ') || 'none'}`);
  
  // Final summary
  console.log('\n\n=== SUMMARY ===');
  const hawaiiDataCorrect = d2.events?.every(e => !e.lat || e.lat < 25);
  const sfDataCorrect = d1.events?.every(e => !e.lat || e.lat > 35);
  const ageFilterWorks = d3.events?.length < d1.events?.length;
  const dateFilterWorks = sfWeekendCount < sfAllCount;
  const noTimezoneIssue = badTimes.length === 0;
  
  console.log(`Region isolation (Hawaii has only Hawaii events): ${hawaiiDataCorrect ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Region isolation (SF has only SF events): ${sfDataCorrect ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Age filter works (narrows results): ${ageFilterWorks ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Date filter works (narrows results): ${dateFilterWorks ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`Timezone (no 1-5 AM times): ${noTimezoneIssue ? 'PASS ✅' : `PARTIAL ⚠️ (${badTimes.join(',')})`}`);
}

run().catch(console.error);

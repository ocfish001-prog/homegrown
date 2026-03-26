const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      const headers = {};
      Object.keys(res.headers).forEach(k => headers[k] = res.headers[k]);
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers, body: data }));
      res.on('error', reject);
    });
  });
}

async function run() {
  console.log('=== API Deep Check ===\n');
  
  // Check API route directly with hawaii
  const r1 = await fetchUrl('https://homegrown-phase1-app.netlify.app/api/events?lat=19.8968&lng=-155.5828&radius=25&region=hawaii');
  const d1 = JSON.parse(r1.body);
  
  console.log('Response headers for Hawaii:');
  const relevantHeaders = ['cache-control', 'age', 'x-nf-request-id', 'cf-cache-status'];
  relevantHeaders.forEach(h => { if (r1.headers[h]) console.log(' ', h, ':', r1.headers[h]); });
  
  console.log('\nHawaii API (region=hawaii) returns', d1.events?.length, 'events');
  
  // Check if first events have hawaii coords
  const firstFiveHawaii = d1.events?.slice(0, 5);
  console.log('\nFirst 5 Hawaii events:');
  firstFiveHawaii?.forEach(e => {
    console.log(`  "${e.title?.substring(0,45)}" lat:${e.lat} lng:${e.lng}`);
  });
  
  // Check date for an NPS event
  const npsEvents = d1.events?.filter(e => e.source === 'nps').slice(0, 3);
  console.log('\nNPS events and their times:');
  npsEvents?.forEach(e => {
    console.log(`  title: ${e.title?.substring(0,45)}`);
    console.log(`  date: ${e.date}`);
    console.log(`  dateISO: ${e.dateISO}`);
    console.log(`  ---`);
  });
  
  // Check cache age
  const ageHeader = r1.headers['age'];
  const cacheControl = r1.headers['cache-control'];
  console.log('\nCache info - age:', ageHeader, '| cache-control:', cacheControl);
  
  // If age is very high, old response is cached 
  if (ageHeader && parseInt(ageHeader) > 3600) {
    console.log('⚠️  STALE CACHE: Response is', Math.round(parseInt(ageHeader)/60), 'minutes old!');
  }
  
  // Check if this is actually Hawaii data or SF data
  const hawaiiCoordsCount = d1.events?.filter(e => e.lat && e.lat < 25 && e.lat > 18).length;
  const sfCoordsCount = d1.events?.filter(e => e.lat && e.lat > 35 && e.lat < 40).length;
  
  console.log('\nCoordinate check:');
  console.log('Events with Hawaii coords (lat 18-25):', hawaiiCoordsCount);
  console.log('Events with SF coords (lat 35-40):', sfCoordsCount);
  
  // Check what sources are in the Hawaii response
  const sources = {};
  d1.events?.forEach(e => {
    sources[e.source] = (sources[e.source] || 0) + 1;
  });
  console.log('\nSources in Hawaii response:', sources);
  
  // Check ageRange distribution
  const ageRanges = {};
  d1.events?.forEach(e => {
    const ar = e.ageRange || 'null';
    ageRanges[ar] = (ageRanges[ar] || 0) + 1;
  });
  console.log('Age range distribution:', ageRanges);
}
run().catch(console.error);

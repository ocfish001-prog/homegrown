const https = require('https');

https.get('https://homegrown-phase1-app.netlify.app/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const buildHashMatch = data.match(/"buildId":"([^"]+)"/);
    const hasSFBay = data.includes('SF Bay') || data.includes('sfbay');
    const hasHawaii = data.includes('Hawaii') || data.includes('hawaii');
    console.log('buildId:', buildHashMatch ? buildHashMatch[1] : 'not found');
    console.log('Has SF Bay in HTML:', hasSFBay);
    console.log('Has Hawaii in HTML:', hasHawaii);
    console.log('HTML length:', data.length);
  });
});

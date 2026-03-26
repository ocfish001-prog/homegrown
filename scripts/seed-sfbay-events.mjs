/**
 * Seed Supabase with SF Bay Area events from live sources.
 * Sources: NPS API, Contra Costa iCal, Eventbrite SFBay, WordPress iCal sources,
 *          Bibliocommons libraries
 *
 * Run: node scripts/seed-sfbay-events.mjs
 *
 * Each source fetches live data and upserts to Supabase.
 * Dedup strategy: composite key (source + externalId)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4';
const NPS_API_KEY = process.env.NPS_API_KEY || 'DEMO_KEY';
const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY || 'BXMNY6PQFEF2C3MLEP';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

function unescapeIcal(s) {
  return (s || '').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
}

function extractICalField(vevent, field) {
  const unfolded = vevent.replace(/\r?\n[ \t]/g, '');
  const re = new RegExp(`^${field}(?:;[^:]+)?:(.*)$`, 'im');
  const m = unfolded.match(re);
  return m ? unescapeIcal((m[1] || '').trim()) : '';
}

function parseICalDate(val) {
  if (!val) return null;
  const clean = val.replace(/TZID=[^:]+:/, '').trim();
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const [, yr, mo, dy, hr = '0', mn = '0', sc = '0'] = m;
  const d = new Date(`${yr}-${mo}-${dy}T${hr.padStart(2,'0')}:${mn.padStart(2,'0')}:${sc.padStart(2,'0')}-08:00`);
  return isNaN(d.getTime()) ? null : d;
}

function genId(prefix, uid) {
  return `${prefix}-${uid.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60)}`;
}

// ─── Upsert helper ──────────────────────────────────────────────────────────

async function upsertEvents(events, sourceName) {
  if (!events.length) {
    console.log(`  [${sourceName}] No events to upsert`);
    return;
  }

  // Ensure default venue for sfbay events
  const defaultVenueId = 'venue-sfbay-default';
  await supabase.from('venues').upsert({
    id: defaultVenueId,
    name: 'SF Bay Area',
    city: 'San Francisco',
    state: 'CA',
    lat: 37.7749,
    lng: -122.4194,
  }, { onConflict: 'id', ignoreDuplicates: true });

  // Upsert events in batches of 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const rows = batch.map(ev => ({
      id: ev.id,
      externalId: ev.externalId || ev.id,
      source: ev.source,
      title: ev.title,
      description: ev.description || null,
      startDate: ev.startDate,
      endDate: ev.endDate || null,
      isFree: ev.isFree || false,
      cost: ev.cost || null,
      imageUrl: ev.imageUrl || null,
      externalUrl: ev.externalUrl || 'https://homegrown.app',
      ageRange: ev.ageRange || 'all_ages',
      relevanceScore: ev.relevanceScore || 70,
      isApproved: true,
      venueId: ev.venueId || defaultVenueId,
      updatedAt: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('events')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`  [${sourceName}] Upsert error (batch ${i}):`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  [${sourceName}] ✓ Upserted ${inserted} events`);
}

// ─── SOURCE 1: NPS API ──────────────────────────────────────────────────────

async function seedNPS() {
  console.log('\n📍 NPS API (muwo + pore + goga)...');
  const params = new URLSearchParams({
    parkCode: 'muwo,pore,goga',
    limit: '100',
    api_key: NPS_API_KEY,
  });

  const PARK_META = {
    muwo: { lat: 37.8910, lng: -122.5714, name: 'Muir Woods National Monument' },
    pore: { lat: 38.0580, lng: -122.8069, name: 'Point Reyes National Seashore' },
    goga: { lat: 37.8270, lng: -122.4735, name: 'Golden Gate National Recreation Area' },
  };

  try {
    const res = await fetch(`https://developer.nps.gov/api/v1/events?${params}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'HomegrownApp/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) { console.warn(`  NPS returned ${res.status}`); return; }

    const data = await res.json();
    const rawEvents = data?.data ?? [];
    const now = new Date();

    // Upsert venue per park
    for (const [code, meta] of Object.entries(PARK_META)) {
      await supabase.from('venues').upsert({
        id: `venue-nps-${code}`,
        name: meta.name,
        city: 'San Francisco Bay Area',
        state: 'CA',
        lat: meta.lat,
        lng: meta.lng,
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    const events = [];
    for (const ev of rawEvents) {
      const eventId = ev.eventid || ev.id;
      if (!eventId) continue;

      const title = (ev.title || '').trim();
      if (!title) continue;

      // Skip past events
      const dateStr = ev.date || ev.datestart || '';
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()) && d < now) continue;
      }

      const parkCode = (ev.sitecode || ev.parkCode || '').toLowerCase().trim();
      const park = PARK_META[parkCode] || PARK_META['goga'];
      const venueId = `venue-nps-${parkCode || 'goga'}`;

      // Parse time
      const timeEntry = ev.times?.[0];
      const timeStr = timeEntry?.timestart || '';
      let startDate = dateStr ? new Date(`${dateStr}T12:00:00-08:00`) : null;
      if (dateStr && timeStr) {
        const [timePart, meridiem] = timeStr.split(' ');
        const [hourStr, minStr] = (timePart || '').split(':');
        let hour = parseInt(hourStr || '0', 10);
        if ((meridiem || '').toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if ((meridiem || '').toUpperCase() === 'AM' && hour === 12) hour = 0;
        const d = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minStr||'00').padStart(2,'0')}:00-08:00`);
        if (!isNaN(d.getTime())) startDate = d;
      }

      if (!startDate || startDate < now) continue;

      events.push({
        id: `nps-${eventId}`,
        externalId: `nps-${eventId}`,
        source: 'nps',
        title,
        description: stripHtml(ev.description || '').slice(0, 600),
        startDate: startDate.toISOString(),
        endDate: null,
        isFree: ev.isfree === 'true',
        cost: ev.isfree === 'true' ? 'Free' : 'See site',
        externalUrl: ev.infourl || `https://www.nps.gov/${parkCode}/planyourvisit/events.htm`,
        ageRange: 'all_ages',
        relevanceScore: 80,
        venueId,
      });
    }

    console.log(`  Found ${events.length} upcoming NPS events`);
    await upsertEvents(events, 'NPS');
  } catch (err) {
    console.error('  NPS error:', err.message);
  }
}

// ─── SOURCE 2: Contra Costa iCal ────────────────────────────────────────────

async function seedContraCosta() {
  console.log('\n📍 Contra Costa County iCal...');
  try {
    // catID=68 = Parks & Recreation category feed
    const res = await fetch('https://www.contracosta.ca.gov/common/modules/iCalendar/iCalendar.aspx?catID=68&feed=calendar', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)', 'Accept': 'text/calendar' },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) { console.warn(`  Contra Costa returned ${res.status}`); return; }

    const ical = await res.text();
    if (!ical.includes('BEGIN:VCALENDAR')) {
      console.warn('  Response not valid iCal');
      return;
    }

    // Upsert venue
    await supabase.from('venues').upsert({
      id: 'venue-contra-costa',
      name: 'Contra Costa County',
      city: 'Martinez',
      state: 'CA',
      lat: 37.9161,
      lng: -121.9552,
    }, { onConflict: 'id', ignoreDuplicates: true });

    const vevents = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const now = new Date();
    const events = [];

    const familyKeywords = ['park', 'recreation', 'nature', 'kid', 'child', 'family', 'youth', 'outdoor', 'hike', 'camp', 'storytime', 'story time'];

    for (const vevent of vevents) {
      const uid = extractICalField(vevent, 'UID');
      if (!uid) continue;

      const summary = extractICalField(vevent, 'SUMMARY');
      if (!summary) continue;

      const dtstart = extractICalField(vevent, 'DTSTART');
      const dtend = extractICalField(vevent, 'DTEND');
      const description = stripHtml(extractICalField(vevent, 'DESCRIPTION')).slice(0, 600);
      const url = extractICalField(vevent, 'URL');
      const categories = extractICalField(vevent, 'CATEGORIES');

      const startDate = parseICalDate(dtstart);
      const endDate = parseICalDate(dtend);

      if (!startDate || startDate < now) continue;

      // Family filter
      const text = `${summary} ${description} ${categories}`.toLowerCase();
      const isFamilyRelevant = familyKeywords.some(kw => text.includes(kw));
      if (!isFamilyRelevant) continue;

      events.push({
        id: genId('contra-costa-ical', uid),
        externalId: uid,
        source: 'contra-costa-ical',
        title: summary,
        description: description || null,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || null,
        isFree: text.includes('free'),
        cost: text.includes('free') ? 'Free' : 'See site',
        externalUrl: url || 'https://www.contracosta.ca.gov/calendar.aspx',
        ageRange: 'all_ages',
        relevanceScore: 70,
        venueId: 'venue-contra-costa',
      });
    }

    console.log(`  Found ${events.length} upcoming family events`);
    await upsertEvents(events, 'ContraCosta');
  } catch (err) {
    console.error('  Contra Costa error:', err.message);
  }
}

// ─── SOURCE 3: Eventbrite SF Bay Area ───────────────────────────────────────

async function seedEventbriteSFBay() {
  console.log('\n📍 Eventbrite SF Bay Area...');

  if (!EVENTBRITE_API_KEY || EVENTBRITE_API_KEY === 'your_key_here') {
    console.warn('  No EVENTBRITE_API_KEY — skipping');
    return;
  }

  const SEARCH_AREAS = [
    { label: 'San Francisco', address: 'San Francisco, CA', within: '15mi', lat: 37.7749, lng: -122.4194 },
    { label: 'Oakland', address: 'Oakland, CA', within: '20mi', lat: 37.8044, lng: -122.2712 },
    { label: 'San Jose', address: 'San Jose, CA', within: '20mi', lat: 37.3382, lng: -121.8863 },
    { label: 'Walnut Creek', address: 'Walnut Creek, CA', within: '15mi', lat: 37.9101, lng: -122.0652 },
    { label: 'Redwood City', address: 'Redwood City, CA', within: '15mi', lat: 37.4852, lng: -122.2364 },
  ];

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const seen = new Set();

  for (const area of SEARCH_AREAS) {
    try {
      const params = new URLSearchParams({
        categories: '11004,102',
        'location.address': area.address,
        'location.within': area.within,
        'start_date.range_start': now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        'start_date.range_end': thirtyDaysOut.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        expand: 'venue,organizer,ticket_availability',
        page_size: '50',
        sort_by: 'date',
      });

      const res = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`, {
        headers: { 'Authorization': `Bearer ${EVENTBRITE_API_KEY}`, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        console.warn(`  Eventbrite ${area.label}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const rawEvents = data?.events ?? [];
      const events = [];

      for (const ev of rawEvents) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);

        const title = ev.name?.text || '';
        if (!title) continue;

        const startIso = ev.start?.utc || ev.start?.local || '';
        if (!startIso) continue;

        const startDate = new Date(startIso);
        if (startDate < now) continue;

        const venue = ev.venue;
        let venueId = `venue-eb-${ev.id}`;

        if (venue?.id) {
          venueId = `venue-eb-venue-${venue.id}`;
          await supabase.from('venues').upsert({
            id: venueId,
            name: venue.name || area.label,
            address: venue.address?.address_1 || null,
            city: venue.address?.city || null,
            state: venue.address?.region || 'CA',
            lat: venue.latitude ? parseFloat(venue.latitude) : area.lat,
            lng: venue.longitude ? parseFloat(venue.longitude) : area.lng,
          }, { onConflict: 'id', ignoreDuplicates: true });
        } else {
          // Use area default venue
          venueId = `venue-sfbay-${area.label.toLowerCase().replace(/\s+/g, '-')}`;
          await supabase.from('venues').upsert({
            id: venueId,
            name: area.label,
            city: area.label,
            state: 'CA',
            lat: area.lat,
            lng: area.lng,
          }, { onConflict: 'id', ignoreDuplicates: true });
        }

        const isFree = ev.is_free || false;
        const ticket = ev.ticket_availability?.minimum_ticket_price;
        const cost = isFree ? 'Free'
          : ticket?.major_value ? `From $${ticket.major_value}`
          : 'See site';

        events.push({
          id: `eventbrite-sfbay-${ev.id}`,
          externalId: ev.id,
          source: 'eventbrite-sfbay',
          title,
          description: (ev.description?.text || ev.summary || '').slice(0, 600),
          startDate: startIso,
          endDate: ev.end?.utc || null,
          isFree,
          cost,
          imageUrl: ev.logo?.url || null,
          externalUrl: ev.url || `https://www.eventbrite.com/e/${ev.id}`,
          ageRange: 'all_ages',
          relevanceScore: 75,
          venueId,
        });
      }

      console.log(`  ${area.label}: ${events.length} events`);
      await upsertEvents(events, `Eventbrite-${area.label}`);
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  Eventbrite ${area.label} error:`, err.message);
    }
  }
}

// ─── SOURCE 4: WordPress iCal sources ───────────────────────────────────────

async function seedWordPressIcal(config) {
  console.log(`\n📍 ${config.name} (iCal)...`);

  await supabase.from('venues').upsert({
    id: `venue-${config.source}`,
    name: config.defaultLocation,
    city: config.city,
    state: 'CA',
    lat: config.lat,
    lng: config.lng,
  }, { onConflict: 'id', ignoreDuplicates: true });

  try {
    const res = await fetch(config.icalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)', 'Accept': 'text/calendar, */*' },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn(`  ${config.name} iCal returned ${res.status} — source may not support ?ical=1`);
      return;
    }

    const ical = await res.text();
    if (!ical.includes('BEGIN:VCALENDAR')) {
      console.warn(`  ${config.name}: Response not valid iCal`);
      return;
    }

    const vevents = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const now = new Date();
    const events = [];

    for (const vevent of vevents) {
      const uid = extractICalField(vevent, 'UID');
      if (!uid) continue;

      const summary = extractICalField(vevent, 'SUMMARY');
      if (!summary) continue;

      const dtstart = extractICalField(vevent, 'DTSTART');
      const dtend = extractICalField(vevent, 'DTEND');
      const description = stripHtml(extractICalField(vevent, 'DESCRIPTION')).slice(0, 600);
      const url = extractICalField(vevent, 'URL');

      const startDate = parseICalDate(dtstart);
      const endDate = parseICalDate(dtend);

      if (!startDate || startDate < now) continue;

      events.push({
        id: genId(config.source, uid),
        externalId: uid,
        source: config.source,
        title: summary,
        description: description || null,
        startDate: startDate.toISOString(),
        endDate: endDate?.toISOString() || null,
        isFree: description.toLowerCase().includes('free'),
        cost: 'See site',
        externalUrl: url || config.fallbackUrl,
        ageRange: 'all_ages',
        relevanceScore: 75,
        venueId: `venue-${config.source}`,
      });
    }

    console.log(`  Found ${events.length} upcoming events`);
    await upsertEvents(events, config.name);
  } catch (err) {
    console.error(`  ${config.name} error:`, err.message);
  }
}

// ─── SOURCE 5: Bibliocommons libraries ──────────────────────────────────────

async function seedBibliocommons(lib) {
  console.log(`\n📍 ${lib.name} (Bibliocommons)...`);

  await supabase.from('venues').upsert({
    id: `venue-${lib.source}`,
    name: lib.name,
    city: lib.city,
    state: 'CA',
    lat: lib.lat,
    lng: lib.lng,
  }, { onConflict: 'id', ignoreDuplicates: true });

  const AUDIENCE_IDS = [
    '5d5f0926be771f2300369397', // Children
    '5d714d6c4464033900bac7c2', // Pre-Teen
  ];

  const events = [];
  const seen = new Set();

  for (const audienceId of AUDIENCE_IDS) {
    try {
      // Try the internal Bibliocommons API
      const params = new URLSearchParams({
        audiences: audienceId,
        locale: 'en-US',
        size: '50',
      });

      const res = await fetch(
        `https://${lib.subdomain}.bibliocommons.com/api/v2/events?${params}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
          },
          signal: AbortSignal.timeout(12000),
        }
      );

      if (!res.ok) {
        console.warn(`  ${lib.name} API returned ${res.status} for audience ${audienceId}`);
        continue;
      }

      const data = await res.json();
      const rawEvents = data?.entities?.events
        ? Object.values(data.entities.events)
        : (data?.events || data?.data || []);

      const now = new Date();

      for (const ev of rawEvents) {
        const id = ev.id || ev.event_id;
        if (!id || seen.has(id)) continue;
        seen.add(id);

        const title = ev.title || ev.name || '';
        if (!title) continue;

        const startStr = ev.start_date || ev.startDate || ev.start || '';
        if (!startStr) continue;

        let startDate;
        try {
          startDate = new Date(startStr);
          if (isNaN(startDate.getTime()) || startDate < now) continue;
        } catch { continue; }

        const endStr = ev.end_date || ev.endDate || ev.end || '';

        events.push({
          id: `${lib.source}-${id}`,
          externalId: String(id),
          source: lib.source,
          title,
          description: (ev.description || '').slice(0, 600),
          startDate: startDate.toISOString(),
          endDate: endStr ? (() => { try { return new Date(endStr).toISOString(); } catch { return null; } })() : null,
          isFree: true,
          cost: 'Free',
          externalUrl: ev.url || ev.event_url || `https://${lib.subdomain}.bibliocommons.com/v2/events/${id}`,
          ageRange: audienceId === AUDIENCE_IDS[0] ? 'young_kids' : 'older_kids',
          relevanceScore: 80,
          venueId: `venue-${lib.source}`,
        });
      }
    } catch (err) {
      console.warn(`  ${lib.name} audience ${audienceId} error:`, err.message);
    }
  }

  console.log(`  Found ${events.length} kids/family events`);
  await upsertEvents(events, lib.name);
}

// ─── SOURCE 6: East Bay Regional Parks (HTML scrape) ────────────────────────

async function seedEastBayParks() {
  console.log('\n📍 East Bay Regional Parks...');

  await supabase.from('venues').upsert({
    id: 'venue-ebparks',
    name: 'East Bay Regional Parks',
    city: 'Oakland',
    state: 'CA',
    lat: 37.8404,
    lng: -122.2477,
  }, { onConflict: 'id', ignoreDuplicates: true });

  const FAMILY_KEYWORDS = ['family', 'kids', 'children', 'story', 'storytime', 'hike', 'hiking',
    'birding', 'bird', 'nature', 'fish', 'fishing', 'junior', 'ranger', 'outdoor', 'drop-in',
    'drop in', 'creek', 'wildlife', 'habitat', 'good night', 'cafecito', 'wade', 'paddle'];

  const events = [];
  const seen = new Set();

  for (let page = 0; page <= 4; page++) {
    const url = page === 0 ? 'https://www.ebparks.org/calendar' : `https://www.ebparks.org/calendar?page=${page}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const linkRe = /<a[^>]+href="(https:\/\/apm\.activecommunities\.com\/ebparks\/Activity_Search\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      let found = false;

      while ((m = linkRe.exec(html)) !== null) {
        const evUrl = m[1] || '';
        const activityId = m[2] || '';
        const rawText = (m[3] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        if (!activityId || seen.has(activityId)) continue;
        seen.add(activityId);
        found = true;

        const lowerText = rawText.toLowerCase();
        const isFamilyEvent = FAMILY_KEYWORDS.some(kw => lowerText.includes(kw));
        if (!isFamilyEvent) continue;

        const dateM = rawText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+\.?\s+\d+,\s*\d{4}(?:,\s*\d+:\d+\s*[AP]M)?)/i);

        let title = rawText;
        let startDate = null;

        if (dateM && dateM.index !== undefined) {
          title = rawText.slice(0, dateM.index).replace(/^(?:Drop-in Program|Registration Required)\s*/i, '').trim();
          const cleaned = dateM[0].replace(/^\w+,\s*/, '').replace(/\./g, '');
          try {
            const d = new Date(`${cleaned} PST`);
            if (!isNaN(d.getTime()) && d > new Date()) startDate = d;
          } catch { /* ignore */ }
        }

        if (!title || title.length < 3) continue;
        if (!startDate) continue;

        events.push({
          id: `ebparks-${activityId}`,
          externalId: activityId,
          source: 'ebparks',
          title,
          description: null,
          startDate: startDate.toISOString(),
          endDate: null,
          isFree: true,
          cost: 'Free',
          externalUrl: evUrl,
          ageRange: 'all_ages',
          relevanceScore: 85,
          venueId: 'venue-ebparks',
        });
      }

      if (!found) break; // No more pages
    } catch (err) {
      console.warn(`  EBParks page ${page} error:`, err.message);
    }
  }

  console.log(`  Found ${events.length} family events`);
  await upsertEvents(events, 'EBParks');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const WORDPRESS_SOURCES = [
  {
    name: 'Chabot Space & Science Center',
    icalUrl: 'https://chabotspace.org/programs/calendar-view/?ical=1',
    fallbackUrl: 'https://chabotspace.org/programs/calendar-view/',
    source: 'chabot-ical',
    defaultLocation: 'Chabot Space & Science Center',
    city: 'Oakland',
    lat: 37.8169,
    lng: -122.1728,
  },
  {
    name: 'Lindsay Wildlife Experience',
    icalUrl: 'https://lindsaywildlife.org/education/calendar/?ical=1',
    fallbackUrl: 'https://lindsaywildlife.org/education/calendar/',
    source: 'lindsay-ical',
    defaultLocation: 'Lindsay Wildlife Experience',
    city: 'Walnut Creek',
    lat: 37.9013,
    lng: -122.0633,
  },
  {
    name: 'Bay Area Discovery Museum',
    icalUrl: 'https://bayareadiscoverymuseum.org/?ical=1',
    fallbackUrl: 'https://bayareadiscoverymuseum.org/events/',
    source: 'badm-ical',
    defaultLocation: 'Bay Area Discovery Museum',
    city: 'Sausalito',
    lat: 37.8320,
    lng: -122.4786,
  },
  {
    name: 'California Homeschool Network',
    icalUrl: 'https://californiahomeschool.net/events/?ical=1',
    fallbackUrl: 'https://californiahomeschool.net/events/',
    source: 'chn-ical',
    defaultLocation: 'Bay Area, CA',
    city: 'San Francisco',
    lat: 37.7749,
    lng: -122.4194,
  },
];

const BIBLIOCOMMONS_SOURCES = [
  { name: 'San Jose Public Library', subdomain: 'sjpl', city: 'San Jose', lat: 37.3382, lng: -121.8863, source: 'sjpl-bibliocommons' },
  { name: 'Oakland Public Library', subdomain: 'oaklandlibrary', city: 'Oakland', lat: 37.8044, lng: -122.2712, source: 'oakland-bibliocommons' },
  { name: 'San Mateo County Library', subdomain: 'smcl', city: 'San Mateo', lat: 37.5630, lng: -122.3255, source: 'smcl-bibliocommons' },
];

async function main() {
  console.log('🌉 Seeding SF Bay Area events into Supabase...\n');

  await seedNPS();
  await seedContraCosta();
  await seedEventbriteSFBay();
  for (const src of WORDPRESS_SOURCES) await seedWordPressIcal(src);
  await seedEastBayParks();
  for (const lib of BIBLIOCOMMONS_SOURCES) await seedBibliocommons(lib);

  console.log('\n✅ SF Bay Area seed complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

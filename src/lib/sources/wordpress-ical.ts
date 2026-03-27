/**
 * WordPress "The Events Calendar" iCal integration
 * Pattern: [calendar-url]?ical=1
 *
 * Sources:
 *   - Chabot Space & Science Center: https://chabotspace.org/programs/calendar-view/?ical=1
 *   - Lindsay Wildlife Experience: https://lindsaywildlife.org/education/calendar/?ical=1
 *   - Bay Area Discovery Museum: https://bayareadiscoverymuseum.org/?ical=1  (test)
 *   - California Homeschool Network: https://californiahomeschool.net/events/?ical=1
 *
 * These all use The Events Calendar WordPress plugin which has a standard iCal export.
 */
import type { HomegrownEvent } from '../types'
import type { SyncResult } from '../sync-engine'

export interface WordPressIcalSource {
  name: string
  icalUrl: string
  fallbackUrl: string
  source: HomegrownEvent['source']
  organizer: string
  lat: number
  lng: number
  defaultLocation: string
  tags: string[]
}

export const WORDPRESS_ICAL_SOURCES: WordPressIcalSource[] = [
  {
    name: 'Chabot Space & Science Center',
    icalUrl: 'https://chabotspace.org/programs/calendar-view/?ical=1',
    fallbackUrl: 'https://chabotspace.org/programs/calendar-view/',
    source: 'chabot-ical',
    organizer: 'Chabot Space & Science Center',
    lat: 37.8169,
    lng: -122.1728,
    defaultLocation: 'Chabot Space & Science Center, Oakland',
    tags: ['science', 'space', 'museum', 'oakland', 'stem', 'bay area'],
  },
  {
    name: 'Lindsay Wildlife Experience',
    icalUrl: 'https://lindsaywildlife.org/education/calendar/?ical=1',
    fallbackUrl: 'https://lindsaywildlife.org/education/calendar/',
    source: 'lindsay-ical',
    organizer: 'Lindsay Wildlife Experience',
    lat: 37.9013,
    lng: -122.0633,
    defaultLocation: 'Lindsay Wildlife Experience, Walnut Creek',
    tags: ['wildlife', 'nature', 'animals', 'walnut creek', 'homeschool', 'bay area'],
  },
  {
    name: 'Bay Area Discovery Museum',
    icalUrl: 'https://bayareadiscoverymuseum.org/?ical=1',
    fallbackUrl: 'https://bayareadiscoverymuseum.org/events/',
    source: 'badm-ical',
    organizer: 'Bay Area Discovery Museum',
    lat: 37.8320,
    lng: -122.4786,
    defaultLocation: 'Bay Area Discovery Museum, Sausalito',
    tags: ['museum', 'art', 'creativity', 'sausalito', 'marin', 'bay area'],
  },
  {
    name: 'California Homeschool Network',
    icalUrl: 'https://californiahomeschool.net/events/?ical=1',
    fallbackUrl: 'https://californiahomeschool.net/events/',
    source: 'chn-ical',
    organizer: 'California Homeschool Network',
    lat: 37.5630,
    lng: -122.0530,
    defaultLocation: 'Bay Area, CA',
    tags: ['homeschool', 'education', 'community', 'bay area', 'california'],
  },
]

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim()
}

function unescapeIcal(s: string): string {
  return s.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
}

function extractICalField(vevent: string, field: string): string {
  const unfolded = vevent.replace(/\r?\n[ \t]/g, '')
  const re = new RegExp(`^${field}(?:;[^:]+)?:(.*)$`, 'im')
  const m = unfolded.match(re)
  return m ? unescapeIcal((m[1] ?? '').trim()) : ''
}

function parseICalDate(val: string): Date | null {
  const clean = val.replace(/TZID=[^:]+:/, '').trim()
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/)
  if (!m) return null
  const [, yr, mo, dy, hr = '0', mn = '0', sc = '0'] = m
  const d = new Date(`${yr}-${mo}-${dy}T${hr.padStart(2,'0')}:${mn.padStart(2,'0')}:${sc.padStart(2,'0')}-08:00`)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
  const isAllDay = d.getHours() === 0 && d.getMinutes() === 0
  return isAllDay ? datePart.replace(',', ' \u00B7') : `${datePart.replace(',', ' \u00B7')} \u00B7 ${timePart}`
}

function mapCategory(summary: string, description: string): string {
  const text = `${summary} ${description}`.toLowerCase()
  if (text.includes('hike') || text.includes('trail') || text.includes('field trip')) return 'Field Trips'
  if (text.includes('workshop') || text.includes('class') || text.includes('lesson') || text.includes('homeschool day')) return 'Workshops'
  if (text.includes('storytime') || text.includes('story time')) return 'Events'
  if (text.includes('camp')) return 'Camps'
  if (text.includes('art') || text.includes('craft')) return 'Arts'
  if (text.includes('science') || text.includes('stem') || text.includes('astronomy') || text.includes('telescope')) return 'Workshops'
  if (text.includes('nature') || text.includes('wildlife') || text.includes('animal')) return 'Field Trips'
  return 'Events'
}

export async function fetchWordPressIcalSource(
  config: WordPressIcalSource,
  _lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
      'Accept': 'text/calendar, text/plain, */*',
    }
    if (lastEtag) headers['If-None-Match'] = lastEtag

    const res = await fetch(config.icalUrl, {
      headers,
      next: { revalidate: 3600 * 6 },
      signal: AbortSignal.timeout(12000),
    })

    if (res.status === 304) return { events: [] }

    if (!res.ok) {
      console.warn(`[${config.name}] iCal returned ${res.status} — source may not support ?ical=1`)
      return { events: [], isStub: true }
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('calendar') && !contentType.includes('text')) {
      console.warn(`[${config.name}] Unexpected content-type: ${contentType}`)
    }

    const etag = res.headers.get('etag') ?? undefined
    const ical = await res.text()

    if (!ical.includes('BEGIN:VCALENDAR')) {
      console.warn(`[${config.name}] Response doesn't look like iCal — may need scraper fallback`)
      return { events: [], isStub: true }
    }

    const vevents = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []
    const now = new Date()
    const events: HomegrownEvent[] = []

    for (const vevent of vevents) {
      const uid = extractICalField(vevent, 'UID')
      if (!uid) continue

      const summary = extractICalField(vevent, 'SUMMARY')
      if (!summary) continue

      const dtstart = extractICalField(vevent, 'DTSTART')
      const dtend = extractICalField(vevent, 'DTEND')
      const description = stripHtml(extractICalField(vevent, 'DESCRIPTION')).slice(0, 600)
      const location = extractICalField(vevent, 'LOCATION') || config.defaultLocation
      const url = extractICalField(vevent, 'URL') || config.fallbackUrl

      const startDate = dtstart ? parseICalDate(dtstart) : null
      const endDate = dtend ? parseICalDate(dtend) : null

      if (!startDate || startDate < now) continue

      events.push({
        id: `${config.source}-${uid.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 60)}`,
        title: summary,
        description: description || undefined,
        category: mapCategory(summary, description),
        date: formatDate(startDate),
        dateISO: startDate.toISOString(),
        endDateISO: endDate?.toISOString(),
        location,
        lat: config.lat,
        lng: config.lng,
        organizer: config.organizer,
        price: 'See site',
        url,
        source: config.source,
        tags: config.tags,
      })
    }

    console.log(`[${config.name}] ${events.length} upcoming events from iCal`)
    return { events, ...(etag ? { etag } : {}) }
  } catch (err) {
    console.error(`[${config.name}] iCal fetch error:`, err)
    return { events: [] }
  }
}

// Individual exported fetch functions per source (for API route + cron)
export async function fetchChabotIcalEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchWordPressIcalSource(WORDPRESS_ICAL_SOURCES[0]!, lastSyncedAt, lastEtag)
}

export async function fetchLindsayIcalEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchWordPressIcalSource(WORDPRESS_ICAL_SOURCES[1]!, lastSyncedAt, lastEtag)
}

export async function fetchBADMIcalEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchWordPressIcalSource(WORDPRESS_ICAL_SOURCES[2]!, lastSyncedAt, lastEtag)
}

export async function fetchCHNIcalEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchWordPressIcalSource(WORDPRESS_ICAL_SOURCES[3]!, lastSyncedAt, lastEtag)
}

/**
 * California Homeschool Network events integration
 * Source: https://californiahomeschool.net/events/
 *
 * INVESTIGATION FINDINGS (2026-03-26):
 * - Tribe Events REST API is live and returns well-structured JSON
 * - Endpoint: /wp-json/tribe/events/v1/events
 * - Stable ID: integer event ID (e.g. 10000766)
 * - Events have: start_date, end_date, url, title, description, venue, cost
 * - Sample event: "Homeschooling Q & As" — Zoom Q&A, Apr 7 2026, 7-8pm
 * - Events are statewide but many are Zoom/virtual (include those for Bay Area families)
 * - Venue field has city/address for in-person events
 *
 * INCREMENTAL SYNC:
 * - API supports `start_date` param: fetch events starting after lastSyncedAt date
 * - Use `start_date=YYYY-MM-DD` to only get upcoming events
 * - Stable ID: tribe event integer ID → externalId = "cahomeschool-{id}"
 * - Bay Area filter: include virtual/online events + events with Bay Area location
 *
 * FAMILY FILTER:
 * - All CHN events are homeschool-relevant by definition — no keyword filter needed
 * - Apply isAdultContent() as safety gate
 */
import type { HomegrownEvent } from '../types'
import { isAdultContent } from '../eventbrite'
import type { SyncResult } from '../sync-engine'

const BASE_URL = 'https://californiahomeschool.net'
const TRIBE_API = `${BASE_URL}/wp-json/tribe/events/v1/events`

const BAYAREA_LAT = 37.7749
const BAYAREA_LNG = -122.4194

// Bay Area cities/regions — include these + all virtual/online events
const BAY_AREA_TERMS = [
  'san francisco', 'sf', 'bay area', 'east bay', 'south bay', 'silicon valley',
  'oakland', 'berkeley', 'san jose', 'marin', 'contra costa', 'alameda',
  'richmond', 'fremont', 'hayward', 'concord', 'walnut creek', 'pleasanton',
  'livermore', 'antioch', 'san mateo', 'palo alto', 'mountain view', 'sunnyvale',
  'santa clara', 'santa rosa', 'napa', 'vallejo', 'fairfield', 'vacaville',
  'online', 'virtual', 'zoom', 'statewide', 'northern california',
]

function isBayAreaOrVirtual(location: string, description: string): boolean {
  const text = `${location} ${description}`.toLowerCase()
  return BAY_AREA_TERMS.some(term => text.includes(term))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatCHNDate(dateStr: string): string {
  if (!dateStr) return 'Date TBD'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    }).replace(',', ' ·')
  } catch {
    return dateStr
  }
}

function mapCHNCategory(title: string, description: string): string {
  const l = `${title} ${description}`.toLowerCase()
  if (l.includes('co-op') || l.includes('coop') || l.includes('co op')) return 'Co-ops'
  if (l.includes('convention') || l.includes('conference') || l.includes('faire')) return 'Events'
  if (l.includes('park day') || l.includes('field trip') || l.includes('tour')) return 'Field Trips'
  if (l.includes('support') || l.includes('q&a') || l.includes('q & a') || l.includes('question')) return 'Support Groups'
  if (l.includes('workshop') || l.includes('class') || l.includes('curriculum') || l.includes('lesson')) return 'Workshops'
  if (l.includes('camp')) return 'Camps'
  if (l.includes('meetup') || l.includes('meet-up') || l.includes('group') || l.includes('gather')) return 'Community'
  return 'Events'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTribeEvent(ev: any): HomegrownEvent | null {
  const id: number | string = ev.id
  if (!id) return null

  const title = typeof ev.title === 'string' ? ev.title.replace(/&#\d+;/g, (c: string) => {
    const n = parseInt(c.slice(2, -1))
    return String.fromCharCode(n)
  }).trim() : ''
  if (!title) return null

  const description = stripHtml(ev.description ?? '').slice(0, 600)
  if (isAdultContent(title, description)) return null

  // Build location string
  const venue = ev.venue
  const locationParts = [
    venue?.venue,
    venue?.address,
    venue?.city,
    venue?.stateprovince,
  ].filter(Boolean)
  const locationFull = locationParts.join(', ') || ''

  // Include virtual events and Bay Area events
  if (locationFull && !isBayAreaOrVirtual(locationFull, description)) return null

  const isVirtual = isBayAreaOrVirtual('', description) &&
    ['online', 'virtual', 'zoom'].some(kw => description.toLowerCase().includes(kw))

  const startDate = ev.start_date || ''
  const endDate = ev.end_date || ''
  const url = ev.url || `${BASE_URL}/events/`

  const cost = ev.cost
  const price = !cost || cost === '0' || cost === '' ? 'Free' :
    cost.toLowerCase().includes('free') ? 'Free' : cost

  return {
    id: `cahomeschool-${id}`,
    title,
    description,
    category: mapCHNCategory(title, description),
    date: formatCHNDate(startDate),
    dateISO: startDate || undefined,
    endDateISO: endDate || undefined,
    location: isVirtual ? 'Online (Zoom)' : (locationFull || 'California Homeschool Network'),
    lat: BAYAREA_LAT,
    lng: BAYAREA_LNG,
    organizer: 'California Homeschool Network',
    imageUrl: ev.image?.url ?? undefined,
    price,
    url,
    source: 'cahomeschool',
    tags: ['homeschool', 'education', 'california', 'family',
           ...(isVirtual ? ['online', 'virtual', 'zoom'] : ['bay area'])],
  }
}

export async function fetchCAHomeschoolEvents(
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  void lastEtag
  // Use start_date to only fetch events from today forward (upcoming only)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDateParam = today.toISOString().slice(0, 10) // YYYY-MM-DD

  const params = new URLSearchParams({
    per_page: '50',
    page: '1',
    start_date: startDateParam,
  })

  try {
    const res = await fetch(`${TRIBE_API}?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      console.warn(`[CAHomeschool] Tribe API returned ${res.status}`)
      return { events: [] }
    }

    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawEvents: any[] = data?.events ?? []

    // Incremental: filter to events modified/created after lastSyncedAt
    const events: HomegrownEvent[] = []
    let skippedOld = 0

    for (const ev of rawEvents) {
      // Check if this event was modified since last sync
      const modifiedAt = ev.modified_utc ? new Date(ev.modified_utc) : null
      const createdAt = ev.date_utc ? new Date(ev.date_utc) : null
      const relevantDate = modifiedAt ?? createdAt
      if (relevantDate && relevantDate <= lastSyncedAt) { skippedOld++; continue }

      const mapped = mapTribeEvent(ev)
      if (mapped) events.push(mapped)
    }

    // If we skipped everything (full sync already done), return all upcoming events
    // to ensure they're in the API response even if not being re-upserted
    if (events.length === 0 && skippedOld > 0) {
      for (const ev of rawEvents) {
        const mapped = mapTribeEvent(ev)
        if (mapped) events.push(mapped)
      }
      console.log(`[CAHomeschool] Returning ${events.length} existing events (no changes since last sync)`)
    } else {
      console.log(`[CAHomeschool] ${events.length} new/updated events (${skippedOld} unchanged)`)
    }

    return { events }
  } catch (err) {
    console.error('[CAHomeschool] API error:', err)
    return { events: [] }
  }
}

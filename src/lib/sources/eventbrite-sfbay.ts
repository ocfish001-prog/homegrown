/**
 * Eventbrite SF Bay Area integration
 * Source: Eventbrite API v3 search
 *
 * STRATEGY: Use the Eventbrite REST API search endpoint to find family/kids
 * events across SF Bay Area counties.
 *
 * API endpoint: https://www.eventbriteapi.com/v3/events/search/
 * Auth: Bearer token (EVENTBRITE_API_KEY env var)
 * Category IDs:
 *   11004 = Family & Education
 *   102   = Science & Technology
 *
 * Search areas (one request per county center):
 *   San Francisco, Oakland/Alameda, San Jose/Santa Clara, Walnut Creek/Contra Costa, Redwood City/San Mateo
 *
 * NOTE: The Eventbrite API requires an OAuth token. Get one free at:
 *   https://www.eventbrite.com/platform/api
 * Set EVENTBRITE_API_KEY env var.
 *
 * INCREMENTAL SYNC:
 * - Use date_modified_range_start for incremental fetching
 * - Stable ID: "eventbrite-sfbay-{event_id}"
 */
import type { HomegrownEvent } from '../types'
import { isAdultContent } from '../eventbrite'
import type { SyncResult } from '../sync-engine'

const EVENTBRITE_BASE = 'https://www.eventbriteapi.com/v3/events/search/'

// SF Bay Area search locations + radii
const SEARCH_AREAS = [
  { label: 'San Francisco', address: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, within: '15mi' },
  { label: 'Oakland/East Bay', address: 'Oakland, CA', lat: 37.8044, lng: -122.2712, within: '20mi' },
  { label: 'San Jose/Silicon Valley', address: 'San Jose, CA', lat: 37.3382, lng: -121.8863, within: '20mi' },
  { label: 'Walnut Creek/Contra Costa', address: 'Walnut Creek, CA', lat: 37.9101, lng: -122.0652, within: '15mi' },
  { label: 'Redwood City/San Mateo', address: 'Redwood City, CA', lat: 37.4852, lng: -122.2364, within: '15mi' },
]

const FAMILY_CATEGORIES = '11004,102' // Family & Education, Science & Technology

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEventbriteEvent(ev: any, area: typeof SEARCH_AREAS[0]): HomegrownEvent | null {
  const id: string = ev.id
  if (!id) return null

  const title: string = ev.name?.text || ev.name?.html?.replace(/<[^>]+>/g, '') || ''
  if (!title) return null

  const description: string = (ev.description?.text || ev.summary || '').slice(0, 600)
  if (isAdultContent(title, description)) return null

  const startIso: string = ev.start?.utc || ev.start?.local || ''
  const endIso: string = ev.end?.utc || ev.end?.local || ''

  let dateDisplay = 'Date TBD'
  if (startIso) {
    try {
      const d = new Date(startIso)
      const datePart = d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        timeZone: 'America/Los_Angeles',
      })
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
        timeZone: 'America/Los_Angeles',
      })
      dateDisplay = `${datePart.replace(',', ' \u00B7')} \u00B7 ${timePart}`
    } catch { /* ignore */ }
  }

  const venue = ev.venue
  const locationName = venue?.name || venue?.address?.localized_address_display || area.label
  const address = venue?.address?.localized_address_display
  const lat = venue?.latitude ? parseFloat(venue.latitude) : area.lat
  const lng = venue?.longitude ? parseFloat(venue.longitude) : area.lng

  const isFree = ev.is_free || false
  const ticket = ev.ticket_availability?.minimum_ticket_price
  const price = isFree ? 'Free'
    : ticket?.major_value ? `From $${ticket.major_value}`
    : ev.is_sold_out ? 'Sold out'
    : 'See site'

  // Map category
  const catName: string = ev.category?.name || ''
  const subcatName: string = ev.subcategory?.name || ''
  const text = `${title} ${description} ${catName} ${subcatName}`.toLowerCase()
  let category = 'Events'
  if (text.includes('workshop') || text.includes('class') || text.includes('lesson')) category = 'Workshops'
  else if (text.includes('hike') || text.includes('nature') || text.includes('outdoor') || text.includes('field trip')) category = 'Field Trips'
  else if (text.includes('camp')) category = 'Camps'
  else if (text.includes('music') || text.includes('concert')) category = 'Music'
  else if (text.includes('art') || text.includes('craft')) category = 'Arts'
  else if (text.includes('science') || text.includes('stem') || text.includes('tech')) category = 'Workshops'
  else if (text.includes('sport') || text.includes('swim')) category = 'Sports'

  return {
    id: `eventbrite-sfbay-${id}`,
    title,
    description: description || undefined,
    category,
    date: dateDisplay,
    dateISO: startIso || undefined,
    endDateISO: endIso || undefined,
    location: locationName,
    address: address || undefined,
    lat: isNaN(lat) ? area.lat : lat,
    lng: isNaN(lng) ? area.lng : lng,
    organizer: ev.organizer?.name || undefined,
    imageUrl: ev.logo?.url || undefined,
    price,
    url: ev.url || `https://www.eventbrite.com/e/${id}`,
    source: 'eventbrite-sfbay',
    tags: ['eventbrite', 'bay area', 'family', area.label.toLowerCase()],
  }
}

export async function fetchEventbriteSFBayEvents(
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  void lastEtag
  const apiKey = process.env.EVENTBRITE_API_KEY
  if (!apiKey) {
    console.warn('[EventbriteSFBay] No EVENTBRITE_API_KEY set — skipping')
    return { events: [] }
  }

  const now = new Date()
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 3600 * 1000)
  const startFloor = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endCeiling = thirtyDaysOut.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const modifiedSince = lastSyncedAt > new Date('2001-01-01') ? lastSyncedAt.toISOString() : undefined

  const allEvents = new Map<string, HomegrownEvent>() // dedup by id

  for (const area of SEARCH_AREAS) {
    try {
      const params = new URLSearchParams({
        'categories': FAMILY_CATEGORIES,
        'location.address': area.address,
        'location.within': area.within,
        'start_date.range_start': startFloor,
        'start_date.range_end': endCeiling,
        'expand': 'venue,organizer,category,subcategory,ticket_availability',
        'page_size': '50',
        'sort_by': 'date',
      })
      if (modifiedSince) params.set('date_modified.range_start', modifiedSince)

      const res = await fetch(`${EVENTBRITE_BASE}?${params}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        if (res.status === 401) console.warn('[EventbriteSFBay] Invalid API key')
        else if (res.status === 429) console.warn('[EventbriteSFBay] Rate limited')
        else console.warn(`[EventbriteSFBay] ${area.label} returned ${res.status}`)
        continue
      }

      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawEvents: any[] = data?.events ?? []

      for (const ev of rawEvents) {
        const mapped = mapEventbriteEvent(ev, area)
        if (mapped && !allEvents.has(mapped.id)) {
          allEvents.set(mapped.id, mapped)
        }
      }
    } catch (err) {
      console.error(`[EventbriteSFBay] Error fetching ${area.label}:`, err)
    }
  }

  const events = Array.from(allEvents.values())
  console.log(`[EventbriteSFBay] ${events.length} unique family events across SF Bay Area`)
  return { events }
}

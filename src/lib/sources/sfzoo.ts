/**
 * San Francisco Zoo events integration
 * Uses the Tribe Events REST API (WordPress plugin) publicly available at:
 * https://www.sfzoo.org/wp-json/tribe/events/v1/events
 *
 * This is a proper JSON API — no scraping needed. Returns live event data.
 * Target: family programs, zoo events, special events (excludes venue-for-hire pages)
 */
import type { HomegrownEvent } from '../types'

// SF Zoo coordinates (1 Zoo Rd, SF)
const SFZOO_LAT = 37.7338
const SFZOO_LNG = -122.5021

/**
 * Keywords in title/description that indicate an SF Zoo event is NOT suitable
 * for a family/homeschool audience. Checked case-insensitively.
 */
const SFZOO_EXCLUSION_KEYWORDS = [
  'senior',
  'seniors',
  '65+',
  '18+',
  'adult only',
  'adults only',
  'adult tour',
  'adults tour',
  'for adults',
]

/**
 * Positive tags/keywords indicating the event is for families, kids, or all ages.
 * At least one of these (OR no exclusions) should be present.
 */
const SFZOO_FAMILY_KEYWORDS = [
  'family',
  'families',
  'kid',
  'child',
  'children',
  'youth',
  'toddler',
  'junior',
  'all ages',
  'school',
  'homeschool',
  'preschool',
  'elementary',
]

/**
 * Returns true if a Zoo event should be excluded (adult/senior-targeted).
 */
function isSFZooAdultEvent(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  return SFZOO_EXCLUSION_KEYWORDS.some((kw) => text.includes(kw))
}

/**
 * Returns true if the event is explicitly family/kid-friendly OR
 * doesn't have any exclusion signals (benefit of the doubt for general zoo events).
 */
function isSFZooFamilyEvent(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  // Exclude anything that's explicitly adult/senior targeted
  if (isSFZooAdultEvent(title, description)) return false
  // Always include events that have explicit family/kids signals
  if (SFZOO_FAMILY_KEYWORDS.some((kw) => text.includes(kw))) return true
  // General zoo events (no exclusion, no explicit family tag) get benefit of the doubt
  // since SF Zoo is a family venue by default
  return true
}

interface TribeEvent {
  id: number
  url: string
  title: string
  description: string
  start_date: string // "2026-03-29 09:00:00"
  end_date: string
  timezone: string
  cost: string
  image?: {
    url?: string
    sizes?: { medium?: { url?: string } }
  }
  venue?: {
    venue?: string
    address?: string
    city?: string
    stateprovince?: string
  }
}

interface TribeEventsResponse {
  events: TribeEvent[]
  total: number
  total_pages: number
}

function parseTribeDate(dateStr: string, timezone: string): string {
  if (!dateStr) return 'Date TBD'
  try {
    const d = new Date(dateStr.replace(' ', 'T'))
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || 'America/Los_Angeles',
    }
    return d.toLocaleDateString('en-US', opts).replace(',', ' \u00B7')
  } catch {
    return dateStr
  }
}

function mapTribeEvent(ev: TribeEvent): HomegrownEvent {
  // Strip HTML tags from description
  const description = ev.description
    ? ev.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)
    : undefined

  const startISO = ev.start_date ? ev.start_date.replace(' ', 'T') : undefined
  const endISO = ev.end_date ? ev.end_date.replace(' ', 'T') : undefined

  const imageUrl = ev.image?.sizes?.medium?.url ?? ev.image?.url

  // Build location string
  const venueParts = [
    ev.venue?.venue,
    ev.venue?.address,
    ev.venue?.city,
  ].filter(Boolean)
  const location = venueParts.length > 0 ? venueParts.join(', ') : 'San Francisco Zoo & Gardens'

  let price = 'See site'
  if (!ev.cost || ev.cost === '' || ev.cost.toLowerCase().includes('free')) {
    price = 'Free with admission'
  } else {
    price = ev.cost
  }

  return {
    id: `sfzoo-${ev.id}`,
    title: ev.title,
    description,
    category: 'Events',
    date: parseTribeDate(ev.start_date, ev.timezone),
    dateISO: startISO,
    endDateISO: endISO,
    location,
    lat: SFZOO_LAT,
    lng: SFZOO_LNG,
    organizer: 'San Francisco Zoo & Gardens',
    imageUrl,
    price,
    url: ev.url || 'https://www.sfzoo.org/calendar-of-events/',
    source: 'sfzoo',
    tags: ['zoo', 'animals', 'family', 'kids'],
  }
}

export async function fetchSFZooEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  try {
    const url = 'https://www.sfzoo.org/wp-json/tribe/events/v1/events?per_page=20&status=publish'
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'HomegrownApp/1.0 (family events aggregator)',
      },
      next: { revalidate: 3600 }, // 1 hour cache
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error(`[SF Zoo] API returned ${res.status}`)
      return { events: [], error: `SF Zoo API returned ${res.status}` }
    }

    const data: TribeEventsResponse = await res.json()
    const allEvents = (data.events ?? []).map(mapTribeEvent)
    // Filter out adult/senior-targeted events — Homegrown is for families
    const events = allEvents.filter((ev) => isSFZooFamilyEvent(ev.title, ev.description))
    const excluded = allEvents.length - events.length
    if (excluded > 0) {
      console.log(`[SF Zoo] Excluded ${excluded} adult/senior events, kept ${events.length} family-friendly events`)
    } else {
      console.log(`[SF Zoo] Fetched ${events.length} events`)
    }
    return { events }
  } catch (err) {
    console.error('[SF Zoo] Fetch error:', err)
    return {
      events: [],
      error: 'Could not connect to SF Zoo',
      requiresSetup: false,
    }
  }
}

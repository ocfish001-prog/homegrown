/**
 * Eventbrite integration
 * The v3 REST API search endpoint was deprecated in Dec 2019.
 * Instead, we scrape the Eventbrite discover page which returns
 * structured JSON data embedded in the page's __SERVER_DATA__.
 *
 * Requires EVENTBRITE_PRIVATE_TOKEN env var (used for auth on direct event fetches)
 *
 * ─── FAMILY-FRIENDLY FILTERING ──────────────────────────────────────────────
 * Homegrown's audience is homeschool parents with children. We explicitly filter
 * OUT adult-only content (nightlife, bars, 21+ events) and preferentially surface
 * events tagged for families, kids, education, and community.
 *
 * We use the family-specific Eventbrite category page:
 *   https://www.eventbrite.com/d/ca--san-francisco/family--events/
 * instead of the generic events page, which mixes in adult content.
 *
 * Additional exclusion keywords (applied to title + description):
 *   "21+", "nightlife", "bar", "club", "cocktail", "wine", "beer",
 *   "adult only", "adults only", "dating", "speed dating", "hookup"
 *
 * Family-positive keywords (used to boost category assignment):
 *   "kids", "children", "family", "youth", "homeschool", "toddler", "teen"
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { HomegrownEvent } from './types'

/**
 * Keywords that indicate adult-only or non-family content — exclude these events entirely.
 * Checked against event title + description (case-insensitive).
 */
const ADULT_EXCLUSION_KEYWORDS = [
  '21+',
  '21 and over',
  '21 and up',
  'nightlife',
  'night life',
  ' bar ',
  'cocktail',
  'wine tasting',
  'beer tasting',
  'brewery tour',
  'adult only',
  'adults only',
  'speed dating',
  'dating event',
  'hookup',
  'bachelorette',
  'bachelor party',
  'strip ',
  'burlesque',
  // Professional / social services content (flagged by Parker)
  'senior',
  '65+',
  'case management',
  'trauma training',
  'professional development',
  'certification',
  'social worker',
  'pregnancy',
  'memorial',
  'fundraiser gala',
  'policy discussion',
  'early intervention training',
  'protective factors training',
  'nonprofit professional',
]

/**
 * Positive keywords that signal an event is relevant to a homeschool family.
 * At least ONE of these must be present for an Eventbrite event to pass.
 */
const FAMILY_POSITIVE_KEYWORDS = [
  'kids',
  'children',
  'family',
  'youth',
  'homeschool',
  'toddler',
  'elementary',
  'preschool',
  'teen',
  'junior',
  'baby',
  'camp',
  'workshop for kids',
  'science for kids',
  'art for kids',
  'nature walk',
  'storytime',
  // Broader but still family-adjacent
  'child',
  'kid',
  'parent',
]

/**
 * Returns true if the event title/description contains adult-only or
 * non-family-relevant content that should be excluded from the Homegrown feed.
 */
export function isAdultContent(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  return ADULT_EXCLUSION_KEYWORDS.some((kw) => text.includes(kw))
}

/**
 * Returns true if the event title/description contains family-positive signals.
 * Used for category mapping and quality filtering.
 * Exported for use in other source integrations.
 */
export function isFamilyFriendly(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  return FAMILY_POSITIVE_KEYWORDS.some((kw) => text.includes(kw))
}

/**
 * Scores an event on how relevant it is to a homeschool family.
 * Higher score = more relevant. Minimum threshold: 1 point.
 * Used as a quality gate before displaying events.
 */
export function familyRelevanceScore(title: string, description?: string): number {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  let score = 0
  for (const kw of FAMILY_POSITIVE_KEYWORDS) {
    if (text.includes(kw)) score++
  }
  return score
}

export interface EventbriteDestinationEvent {
  eid: string
  name: string
  summary?: string
  url: string
  start_date: string
  start_time: string
  end_date?: string
  end_time?: string
  timezone: string
  is_free?: boolean
  is_online_event: boolean
  image?: {
    url: string
  }
  primary_venue?: {
    name?: string
    address?: {
      localized_address_display: string
      latitude?: string
      longitude?: string
      city?: string
      region?: string
    }
  }
  tags?: Array<{
    prefix: string
    tag: string
    display_name: string
  }>
  ticket_availability?: {
    minimum_ticket_price?: { display: string }
    maximum_ticket_price?: { display: string }
    is_free?: boolean
  }
}

/**
 * Family-friendly Eventbrite category IDs.
 * Events in these categories are suitable for the Homegrown audience.
 * Category IDs reference: Eventbrite's public category taxonomy.
 *   11  = Family & Education (primary target)
 *   102 = Science & Technology
 *   105 = Arts
 *   108 = Sports & Fitness
 *   113 = Community & Culture
 *   103 = Music (family-friendly shows exist here)
 *   119 = Hobbies (crafts, games — often family-friendly)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const FAMILY_FRIENDLY_CATEGORY_IDS = new Set([
  'EventbriteCategory/11',   // Family & Education
  'EventbriteCategory/102',  // Science & Technology
  'EventbriteCategory/105',  // Arts
  'EventbriteCategory/108',  // Sports & Fitness
  'EventbriteCategory/113',  // Community & Culture
  'EventbriteCategory/103',  // Music
  'EventbriteCategory/119',  // Hobbies & Special Interest
])

function mapCategory(tags?: Array<{ prefix: string; tag: string; display_name: string }>): string {
  if (!tags) return 'Events'
  const catTag = tags.find(t => t.prefix === 'EventbriteCategory')
  if (!catTag) return 'Events'
  const map: Record<string, string> = {
    'EventbriteCategory/11':  'Events',     // Family & Education
    'EventbriteCategory/103': 'Music',
    'EventbriteCategory/110': 'Food & Drink',
    'EventbriteCategory/105': 'Arts',
    'EventbriteCategory/108': 'Sports',
    'EventbriteCategory/115': 'Classes',
    'EventbriteCategory/119': 'Workshops',
    'EventbriteCategory/113': 'Community',
    'EventbriteCategory/107': 'Events',
    'EventbriteCategory/102': 'Workshops',  // Science & Tech → Workshops
    'EventbriteCategory/101': 'Events',
    'EventbriteCategory/104': 'Events',
    'EventbriteCategory/116': 'Events',
    'EventbriteCategory/117': 'Events',
    'EventbriteCategory/120': 'Classes',    // School Activities
  }
  return map[catTag.tag] ?? catTag.display_name ?? 'Events'
}

function formatEventDate(startDate: string, startTime: string, timezone: string): string {
  try {
    const dt = new Date(`${startDate}T${startTime}`)
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || 'America/Los_Angeles',
    }
    return dt.toLocaleDateString('en-US', opts).replace(',', ' ·')
  } catch {
    return `${startDate} ${startTime}`
  }
}

function mapPrice(ev: EventbriteDestinationEvent): string {
  if (ev.is_free || ev.ticket_availability?.is_free) return 'Free'
  const min = ev.ticket_availability?.minimum_ticket_price?.display
  const max = ev.ticket_availability?.maximum_ticket_price?.display
  if (min && max && min !== max) return `${min}–${max}`
  if (min) return min
  return 'See site'
}

/**
 * Legacy interface for direct event fetch by ID (still works via v3 API)
 */
export interface EventbriteEvent {
  id: string
  name: { text: string }
  description?: { text: string }
  start: { local: string; utc: string }
  end?: { local: string; utc: string }
  url: string
  logo?: { url: string }
  category_id?: string
  is_free: boolean
  ticket_availability?: {
    minimum_ticket_price?: { display: string }
    maximum_ticket_price?: { display: string }
  }
  venue?: {
    name?: string
    address?: {
      localized_address_display: string
      latitude?: string
      longitude?: string
    }
  }
  organizer?: {
    name: string
  }
}

function mapCategoryId(id?: string): string {
  const map: Record<string, string> = {
    '108': 'Arts',
    '103': 'Music',
    '110': 'Food & Drink',
    '105': 'Sports',
    '114': 'Classes',
    '119': 'Workshops',
    '113': 'Community',
  }
  return id ? (map[id] ?? 'Events') : 'Events'
}

function mapEventPrice(eb: EventbriteEvent): string {
  if (eb.is_free) return 'Free'
  const min = eb.ticket_availability?.minimum_ticket_price?.display
  const max = eb.ticket_availability?.maximum_ticket_price?.display
  if (min && max && min !== max) return `${min}–${max}`
  if (min) return min
  return 'See site'
}

/**
 * Maps a direct Eventbrite v3 API event response (for single event fetch by ID)
 */
export function mapEventbriteEvent(eb: EventbriteEvent): HomegrownEvent {
  const venue = eb.venue
  const address = venue?.address?.localized_address_display ?? venue?.name ?? ''
  const lat = venue?.address?.latitude ? parseFloat(venue.address.latitude) : undefined
  const lng = venue?.address?.longitude ? parseFloat(venue.address.longitude) : undefined

  let dateFormatted = eb.start.local
  try {
    const d = new Date(eb.start.utc)
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    }
    dateFormatted = d.toLocaleDateString('en-US', opts).replace(',', ' ·')
  } catch {}

  return {
    id: `eb-${eb.id}`,
    title: eb.name.text,
    description: eb.description?.text?.slice(0, 1000),
    category: mapCategoryId(eb.category_id),
    date: dateFormatted,
    dateISO: eb.start.utc,
    endDateISO: eb.end?.utc,
    location: address || 'Big Island, Hawaii',
    address,
    lat,
    lng,
    organizer: eb.organizer?.name,
    imageUrl: eb.logo?.url,
    price: mapEventPrice(eb),
    url: eb.url,
    source: 'eventbrite',
  }
}

export function mapDestinationEvent(ev: EventbriteDestinationEvent): HomegrownEvent {
  const venue = ev.primary_venue
  const address = venue?.address?.localized_address_display ?? venue?.name ?? ''
  const lat = venue?.address?.latitude ? parseFloat(venue.address.latitude) : undefined
  const lng = venue?.address?.longitude ? parseFloat(venue.address.longitude) : undefined

  // Build ISO date string
  const dateISO = ev.start_date && ev.start_time
    ? `${ev.start_date}T${ev.start_time}:00`
    : ev.start_date

  return {
    id: `eb-${ev.eid}`,
    title: ev.name,
    description: ev.summary?.slice(0, 1000),
    category: mapCategory(ev.tags),
    date: formatEventDate(ev.start_date, ev.start_time, ev.timezone),
    dateISO,
    location: address || 'Big Island, Hawaii',
    address,
    lat,
    lng,
    imageUrl: ev.image?.url,
    price: mapPrice(ev),
    url: ev.url,
    source: 'eventbrite',
  }
}

/**
 * Fetch events from Eventbrite's discover page for a given city slug.
 * Parses the __SERVER_DATA__ JSON embedded in the page HTML.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchEventbriteEvents(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<{ events: HomegrownEvent[]; error?: string; requiresSetup?: boolean; setupMessage?: string }> {
  void lat; void lng; void radiusMiles;
  // We use the EVENTBRITE_PRIVATE_TOKEN to know the feature is enabled
  // But discovery is done via the public web page scrape
  const apiKey = process.env.EVENTBRITE_PRIVATE_TOKEN || process.env.EVENTBRITE_API_KEY

  if (!apiKey) {
    return {
      events: [],
      requiresSetup: true,
      setupMessage: 'Add EVENTBRITE_PRIVATE_TOKEN to your environment to enable Eventbrite events.',
    }
  }

  try {
    // ── KIDS-SPECIFIC URL ─────────────────────────────────────────────────────
    // Use the kids-specific Eventbrite page to pre-filter for child/family
    // events. The former "family--events" URL was pulling in social services
    // professional content (case management, social worker training, etc.).
    // See: https://www.eventbrite.com/d/ca--san-francisco/kids-events/
    // ─────────────────────────────────────────────────────────────────────────
    const url = 'https://www.eventbrite.com/d/ca--san-francisco/kids-events/'
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // Cache for 15 minutes
      next: { revalidate: 900 },
    })

    if (!res.ok) {
      console.error(`[Eventbrite] Discover page returned ${res.status}`)
      return { events: [], error: 'Eventbrite is temporarily unavailable' }
    }

    const html = await res.text()

    // Extract the JSON-LD structured data (most reliable)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1])
        if (jsonLd['@type'] === 'ItemList' && Array.isArray(jsonLd.itemListElement)) {
          const events: HomegrownEvent[] = jsonLd.itemListElement
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => item.item && item.item['@type'] === 'Event')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((item: any) => item.item.location?.['@type'] !== 'VirtualLocation')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => {
              const ev = item.item
              const geo = ev.location?.geo
              const lat = geo?.latitude ? parseFloat(geo.latitude) : undefined
              const lng = geo?.longitude ? parseFloat(geo.longitude) : undefined
              const address = ev.location?.address
                ? `${ev.location.address.streetAddress}, ${ev.location.address.addressLocality}, ${ev.location.address.addressRegion} ${ev.location.address.postalCode}`
                : ev.location?.name ?? 'Big Island, Hawaii'

              // Parse date
              const startDate = ev.startDate || ''
              let dateFormatted = startDate
              try {
                const d = new Date(startDate)
                if (!isNaN(d.getTime())) {
                  const opts: Intl.DateTimeFormatOptions = {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Los_Angeles',
                  }
                  dateFormatted = d.toLocaleDateString('en-US', opts).replace(',', ' ·')
                }
              } catch {}

              // Extract event ID from URL
              const urlMatch = ev.url?.match(/tickets-(\d+)$/)
              const id = urlMatch ? `eb-${urlMatch[1]}` : `eb-${Math.random().toString(36).slice(2)}`

              // Extract image URL
              const imageUrl = typeof ev.image === 'string' ? ev.image : ev.image?.url

              return {
                id,
                title: ev.name,
                description: ev.description?.slice(0, 1000),
                category: 'Events',
                date: dateFormatted,
                dateISO: startDate,
                location: ev.location?.name ?? address,
                address,
                lat,
                lng,
                imageUrl,
                price: 'See site',
                url: ev.url,
                source: 'eventbrite',
              } as HomegrownEvent
            })
            .filter((ev: HomegrownEvent) => ev.title && ev.url)
            // ── FAMILY-FRIENDLY FILTER ────────────────────────────────────────
            // 1. Exclude adult-only / professional / non-family events.
            // 2. Require at least 1 positive family keyword (quality gate).
            //    Even on the kids page, unrelated events can slip through.
            // ─────────────────────────────────────────────────────────────────
            .filter((ev: HomegrownEvent) => !isAdultContent(ev.title, ev.description))
            .filter((ev: HomegrownEvent) => familyRelevanceScore(ev.title, ev.description) >= 1)

          // Tag family-positive events for future prioritization
          const taggedEvents = events.map((ev) => ({
            ...ev,
            tags: isFamilyFriendly(ev.title, ev.description)
              ? [...(ev.tags ?? []), 'family-friendly']
              : ev.tags,
          }))

          console.log(`[Eventbrite] Scraped ${taggedEvents.length} family-friendly events from discover page`)
          return { events: taggedEvents }
        }
      } catch (parseErr) {
        console.error('[Eventbrite] JSON-LD parse error:', parseErr)
      }
    }

    // Fallback: try to parse __SERVER_DATA__ 
    const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*(\{[\s\S]*?\});\s*(?:window|<\/script>)/)
    if (serverDataMatch && serverDataMatch[1]) {
      try {
        const serverData = JSON.parse(serverDataMatch[1])
        const sections = serverData?.components ?? []
        const allEvents: HomegrownEvent[] = []

        for (const section of sections) {
          if (section?.events && Array.isArray(section.events)) {
            for (const ev of section.events) {
              if (ev._type === 'destination_event' && !ev.is_online_event && ev.primary_venue) {
                allEvents.push(mapDestinationEvent({
                  eid: ev.eid || ev.id,
                  name: ev.name,
                  summary: ev.summary,
                  url: ev.url,
                  start_date: ev.start_date,
                  start_time: ev.start_time,
                  end_date: ev.end_date,
                  end_time: ev.end_time,
                  timezone: ev.timezone,
                  is_free: ev.ticket_availability?.is_free,
                  is_online_event: ev.is_online_event,
                  image: ev.image,
                  primary_venue: ev.primary_venue,
                  tags: ev.tags,
                  ticket_availability: ev.ticket_availability,
                }))
              }
            }
          }
        }

        if (allEvents.length > 0) {
          // Apply family-friendly filter + quality gate to __SERVER_DATA__ results too
          const familyEvents = allEvents
            .filter((ev) => !isAdultContent(ev.title, ev.description))
            .filter((ev) => familyRelevanceScore(ev.title, ev.description) >= 1)
          console.log(`[Eventbrite] Scraped ${familyEvents.length} family-friendly events from __SERVER_DATA__`)
          return { events: familyEvents }
        }
      } catch (parseErr) {
        console.error('[Eventbrite] __SERVER_DATA__ parse error:', parseErr)
      }
    }

    console.warn('[Eventbrite] Could not extract events from discover page')
    return { events: [], error: 'Could not parse Eventbrite events' }
  } catch (err) {
    console.error('[Eventbrite] Fetch error:', err)
    return { events: [], error: 'Could not connect to Eventbrite' }
  }
}

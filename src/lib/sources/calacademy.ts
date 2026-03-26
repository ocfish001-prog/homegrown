/**
 * California Academy of Sciences events integration
 * Source: https://www.calacademy.org/events/lectures-workshops
 *
 * Cal Academy does not expose a public REST API or RSS feed for events.
 * The events pages are rendered via JavaScript (React/CMS).
 *
 * Strategy: Attempt to scrape JSON-LD structured data from the lectures/workshops
 * and daily calendar pages. If that fails, return a stub with helpful CTA.
 *
 * NOTE: NightLife (21+, every Thursday) is explicitly EXCLUDED from results —
 * Homegrown targets families with children, not adult-only events.
 * See: https://www.calacademy.org/nightlife — "All guests must be 21+"
 *
 * Target events: Family programs, lectures, workshops, sleepovers, planetarium shows
 * Location: 55 Music Concourse Drive, Golden Gate Park, SF 94118
 */
import type { HomegrownEvent } from '../types'

// Cal Academy coordinates (Golden Gate Park)
const CALACADEMY_LAT = 37.7699
const CALACADEMY_LNG = -122.4661

const CALACADEMY_ADDRESS = '55 Music Concourse Dr, San Francisco, CA 94118'

// Event pages to attempt scraping
const EVENT_PAGES = [
  'https://www.calacademy.org/events/lectures-workshops',
  'https://www.calacademy.org/penguinspajamas-sleepovers',
]

function formatCalAcademyDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    }
    return d.toLocaleDateString('en-US', opts).replace(',', ' ·')
  } catch {
    return dateStr
  }
}

/**
 * NightLife filter: Cal Academy's 21+ Thursday event must never appear
 * in Homegrown. Filter by title keyword and known URL slug.
 */
function isNightLife(title: string, url?: string): boolean {
  const lower = title.toLowerCase()
  const urlLower = (url ?? '').toLowerCase()
  return (
    lower.includes('nightlife') ||
    lower.includes('night life') ||
    urlLower.includes('nightlife') ||
    urlLower.includes('nightlife')
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJsonLdEvent(ev: any, index: number): HomegrownEvent | null {
  if (!ev || (ev['@type'] !== 'Event' && ev['@type'] !== 'EducationEvent')) return null
  const title = typeof ev.name === 'string' ? ev.name.trim() : null
  if (!title) return null
  if (isNightLife(title, ev.url)) return null // Exclude NightLife 21+ events

  const startDate = ev.startDate || ''
  const locationName = ev.location?.name || 'California Academy of Sciences'
  const imageUrl =
    typeof ev.image === 'string'
      ? ev.image
      : ev.image?.url || ev.image?.contentUrl

  return {
    id: `calacademy-${index}-${title.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
    title,
    description: ev.description?.slice(0, 800),
    category: mapCalAcademyCategory(title),
    date: formatCalAcademyDate(startDate),
    dateISO: startDate || undefined,
    endDateISO: ev.endDate || undefined,
    location: locationName,
    address: ev.location?.address
      ? [
          ev.location.address.streetAddress,
          ev.location.address.addressLocality,
          ev.location.address.addressRegion,
        ]
          .filter(Boolean)
          .join(', ')
      : CALACADEMY_ADDRESS,
    lat: CALACADEMY_LAT,
    lng: CALACADEMY_LNG,
    organizer: 'California Academy of Sciences',
    imageUrl,
    price: ev.offers?.price === 0 || ev.offers?.price === '0' ? 'Free' : (ev.offers?.priceCurrency ? `See site` : 'See site'),
    url: ev.url || 'https://www.calacademy.org/exhibits-events',
    source: 'calacademy',
    tags: ['science', 'nature', 'museum', 'golden gate park', 'family'],
  }
}

function mapCalAcademyCategory(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('sleepover') || lower.includes('penguin')) return 'Camps'
  if (lower.includes('workshop') || lower.includes('class')) return 'Workshops'
  if (lower.includes('lecture') || lower.includes('talk') || lower.includes('speaker')) return 'Events'
  if (lower.includes('planetarium') || lower.includes('show')) return 'Events'
  if (lower.includes('family') || lower.includes('kids') || lower.includes('children')) return 'Events'
  return 'Events'
}

export async function fetchCalAcademyEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  const allEvents: HomegrownEvent[] = []
  const seenIds = new Set<string>()

  for (const pageUrl of EVENT_PAGES) {
    try {
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        console.warn(`[Cal Academy] Page ${pageUrl} returned ${res.status}`)
        continue
      }

      const html = await res.text()

      // Extract JSON-LD blocks
      const jsonLdMatches = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi))
      for (let blockIdx = 0; blockIdx < jsonLdMatches.length; blockIdx++) {
        const m = jsonLdMatches[blockIdx]
        if (!m) continue
        const rawJson = m[1]
        if (!rawJson) continue
        try {
          const parsed = JSON.parse(rawJson)
          const items: unknown[] = Array.isArray(parsed)
            ? parsed
            : parsed['@type'] === 'ItemList'
              ? (parsed.itemListElement ?? []).map((i: { item?: unknown }) => i.item)
              : [parsed]

          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const mapped = mapJsonLdEvent(item, allEvents.length + blockIdx * 100 + i)
            if (mapped && !seenIds.has(mapped.id)) {
              seenIds.add(mapped.id)
              allEvents.push(mapped)
            }
          }
        } catch { /* skip malformed */ }
      }
    } catch (err) {
      console.error(`[Cal Academy] Fetch error for ${pageUrl}:`, err)
    }
  }

  if (allEvents.length > 0) {
    console.log(`[Cal Academy] Found ${allEvents.length} events`)
    return { events: allEvents }
  }

  // Cal Academy's CMS renders events via JavaScript — JSON-LD may not be present
  // Return a stub pointing users to the website
  return {
    events: [],
    requiresSetup: true,
    setupMessage:
      'California Academy of Sciences events are coming soon. Visit calacademy.org/exhibits-events to browse lectures, workshops, and family programs.',
  }
}

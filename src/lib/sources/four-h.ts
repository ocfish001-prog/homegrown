/**
 * 4-H events integration — California / Bay Area
 * Source: UC Cooperative Extension 4-H Youth Development Program
 *
 * Research findings:
 * - National 4-H (4-h.org/events) uses a custom WordPress calendar with no public API
 * - UC California 4-H (ucanr.edu) lists state events on a static page
 * - Bay Area / county-level 4-H events are managed by individual county offices
 *   (Santa Clara, Alameda, San Mateo, Marin) — no unified feed
 * - No public RSS, iCal, or JSON API found for local Bay Area 4-H events
 *
 * Strategy: Return a well-labeled stub with direct links to the relevant county
 * 4-H programs, and attempt to fetch the UCANR events page for state-level events.
 *
 * TODO: If Bay Area county 4-H offices ever publish an iCal/RSS feed,
 * integrate it here. Known county pages:
 *   - Santa Clara: https://ucanr.edu/sites/mgsantaclara/ (4-H section)
 *   - Marin: https://marin4h.ucanr.edu/Events/
 *   - San Mateo: https://cesanmateo.ucanr.edu/4-H_Youth_Development/
 *
 * Target: kids agricultural, STEM, and community events
 */
import type { HomegrownEvent } from '../types'

// Bay Area center point (approximate)
const BAY_AREA_LAT = 37.6879
const BAY_AREA_LNG = -122.1870

/** UC ANRE 4-H state events page (static HTML table) */
const UCANR_EVENTS_URL = 'https://ucanr.edu/program/university-california-4-h-youth-development-program/events'

/**
 * Parse the UCANR 4-H events page — it renders a static table of
 * upcoming state events. We extract Date | Event Name pairs.
 */
function parseUCANREvents(html: string): HomegrownEvent[] {
  const events: HomegrownEvent[] = []

  // The UCANR page renders events in a pattern like:
  // "Mar. 5\nHealthy Living Office Hours - Outdoor Exploration"
  // We extract pairs from the visible text content
  const rowPattern = /(\w{3,4}\.?\s+\d{1,2}(?:\s*-\s*(?:\w{3,4}\.?\s+)?\d{1,2})?)\s*\n([^\n]+)/g

  let match
  let index = 0
  const currentYear = new Date().getFullYear()

  while ((match = rowPattern.exec(html)) !== null) {
    const rawDate = (match[1] ?? '').trim()
    const title = (match[2] ?? '').trim()

    if (!title || title.length < 5) continue
    // Skip header-like lines
    if (title.toLowerCase().includes('### date') || title.toLowerCase().includes('### event')) continue

    // Try to parse the date
    let dateISO: string | undefined
    let dateFormatted = rawDate
    try {
      const cleanDate = rawDate.replace(/\./g, '').replace(/\s*-\s*\w+\s*\d+/, '') // take start date only
      const parsed = new Date(`${cleanDate} ${currentYear}`)
      if (!isNaN(parsed.getTime())) {
        dateISO = parsed.toISOString()
        const opts: Intl.DateTimeFormatOptions = {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'America/Los_Angeles',
        }
        dateFormatted = parsed.toLocaleDateString('en-US', opts).replace(',', ' \u00B7')
      }
    } catch { /* keep raw */ }

    events.push({
      id: `4h-ucanr-${index++}`,
      title: `4-H: ${title}`,
      description: 'UC California 4-H Youth Development Program state event.',
      category: 'Events',
      date: dateFormatted,
      dateISO,
      location: 'California (various locations)',
      lat: BAY_AREA_LAT,
      lng: BAY_AREA_LNG,
      organizer: 'UC California 4-H Youth Development Program',
      price: 'See site',
      url: UCANR_EVENTS_URL,
      source: '4h',
      tags: ['4-H', 'agriculture', 'STEM', 'youth', 'community'],
    })

    if (events.length >= 15) break
  }

  return events
}

export async function fetch4HEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  try {
    const res = await fetch(UCANR_EVENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 7200 }, // 2 hour cache (state events don't change often)
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn(`[4-H] UCANR page returned ${res.status}`)
      return buildStub()
    }

    const html = await res.text()

    // Try JSON-LD first
    const jsonLdMatches = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi))
    const jsonLdEvents: HomegrownEvent[] = []
    for (const m of jsonLdMatches) {
      const rawJson = m[1]
      if (!rawJson) continue
      try {
        const parsed = JSON.parse(rawJson)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          if (item['@type'] === 'Event' && item.name) {
            jsonLdEvents.push({
              id: `4h-${jsonLdEvents.length}`,
              title: `4-H: ${item.name}`,
              description: item.description?.slice(0, 800),
              category: 'Events',
              date: formatDate(item.startDate),
              dateISO: item.startDate,
              location: item.location?.name || 'California',
              lat: BAY_AREA_LAT,
              lng: BAY_AREA_LNG,
              organizer: '4-H Youth Development Program',
              price: 'See site',
              url: item.url || UCANR_EVENTS_URL,
              source: '4h',
              tags: ['4-H', 'youth', 'STEM', 'agriculture'],
            })
          }
        }
      } catch { /* skip */ }
    }

    if (jsonLdEvents.length > 0) {
      console.log(`[4-H] Found ${jsonLdEvents.length} events via JSON-LD`)
      return { events: jsonLdEvents }
    }

    // Fall back to HTML parsing
    const htmlEvents = parseUCANREvents(html)
    if (htmlEvents.length > 0) {
      console.log(`[4-H] Found ${htmlEvents.length} events via HTML parsing`)
      return { events: htmlEvents }
    }

    return buildStub()
  } catch (err) {
    console.error('[4-H] Fetch error:', err)
    return buildStub()
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Los_Angeles',
    }).replace(',', ' \u00B7')
  } catch {
    return dateStr
  }
}

function buildStub() {
  return {
    events: [] as HomegrownEvent[],
    requiresSetup: true,
    setupMessage:
      '4-H events are coming soon. Visit 4-h.org/events or your local county UC Cooperative Extension for Bay Area 4-H programs.',
  }
}

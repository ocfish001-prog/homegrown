/**
 * San Mateo County Libraries (SMCL) events integration
 * Source: https://smcl.bibliocommons.com/v2/events
 *
 * BiblioCommons does not expose a public REST API — the events page is
 * server-rendered HTML. We scrape the events listing page which renders
 * structured event data as JSON-LD and visible HTML.
 *
 * Strategy: fetch the events page filtered for children/family audiences,
 * then parse JSON-LD <script> blocks and/or structured HTML event items.
 *
 * Audience IDs discovered from URL filters on the live site:
 *   Children (6-11):   564274cf4d0090f742000012
 *   Preschoolers (0-5): 564274cf4d0090f742000011
 *   All Ages:           564274cf4d0090f742000010
 */
import type { HomegrownEvent } from '../types'

// SMCL Central branch (San Mateo)
const SMCL_LAT = 37.5630
const SMCL_LNG = -122.3255

// Audience IDs for family/kids filtering
const FAMILY_AUDIENCES = [
  '564274cf4d0090f742000012', // Children (6-11)
  '564274cf4d0090f742000011', // Preschoolers (0-5)
  '564274cf4d0090f742000010', // All Ages
].join(',')

function parseBiblioDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD'
  try {
    const d = new Date(dateStr)
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    }
    return d.toLocaleDateString('en-US', opts).replace(',', ' \u00B7')
  } catch {
    return dateStr
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJsonLdEvent(ev: any, index: number): HomegrownEvent | null {
  if (!ev || ev['@type'] !== 'Event') return null
  const title = typeof ev.name === 'string' ? ev.name : null
  if (!title) return null

  const startDate = ev.startDate || ev.starttime || ''
  const location =
    ev.location?.name ||
    ev.location?.address?.addressLocality ||
    'San Mateo County Library'

  const url = ev.url || ev['@id'] || 'https://smcl.bibliocommons.com/events'

  return {
    id: `smcl-${index}-${title.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
    title,
    description: ev.description?.slice(0, 800),
    category: 'Classes',
    date: parseBiblioDate(startDate),
    dateISO: startDate || undefined,
    endDateISO: ev.endDate || undefined,
    location,
    lat: SMCL_LAT,
    lng: SMCL_LNG,
    organizer: 'San Mateo County Libraries',
    price: 'Free',
    url: typeof url === 'string' ? url : 'https://smcl.bibliocommons.com/events',
    source: 'smcl',
    tags: ['library', 'kids', 'family', 'san mateo'],
  }
}

/**
 * Parse events from HTML event item blocks.
 * BiblioCommons renders event items as <li> blocks with structured links and dates.
 * Pattern: find text blocks like "on Month DD, YYYY, HH:MMam/pm" and event titles.
 */
function parseHtmlEvents(html: string): HomegrownEvent[] {
  const events: HomegrownEvent[] = []

  // Match event blocks: title link + date + location pattern
  // Pattern from observed HTML: ### [Title](url)\non Month DD, YYYY, HH:MMam to HH:MMpm[Event location: Location]
  const eventBlockPattern = /###\s+\[([^\]]+)\]\((https:\/\/smcl\.bibliocommons\.com\/events\/[^\)]+)\)\s*\n([^\n]+)/g

  let match
  let index = 0
  while ((match = eventBlockPattern.exec(html)) !== null) {
    const title = (match[1] ?? '').trim()
    const url = (match[2] ?? '').trim()
    const dateLine = (match[3] ?? '').trim()

    // Try to extract ISO-ish date from "on March 26, 2026, 10:00am to 1:00pm"
    const dateMatch = dateLine.match(/on\s+(\w+ \d+, \d{4}),\s+(\d+:\d+(?:am|pm))/i)
    let dateISO: string | undefined
    let dateFormatted = dateLine.replace(/^on\s+/, '')
    if (dateMatch) {
      const datePart = dateMatch[1] ?? ''
      const timePart = dateMatch[2] ?? ''
      try {
        const rawDate = new Date(`${datePart} ${timePart}`)
        if (!isNaN(rawDate.getTime())) {
          dateISO = rawDate.toISOString()
          dateFormatted = parseBiblioDate(dateISO)
        }
      } catch { /* keep raw */ }
    }

    // Extract location if present
    const locationMatch = dateLine.match(/\[Event location:\s*([^\]]+)\]/)
    const location = locationMatch ? (locationMatch[1] ?? 'San Mateo County Library').trim() : 'San Mateo County Library'

    events.push({
      id: `smcl-${index++}`,
      title,
      category: 'Classes',
      date: dateFormatted,
      dateISO,
      location,
      lat: SMCL_LAT,
      lng: SMCL_LNG,
      organizer: 'San Mateo County Libraries',
      price: 'Free',
      url,
      source: 'smcl',
      tags: ['library', 'kids', 'family', 'san mateo'],
    })

    if (events.length >= 30) break
  }

  return events
}

export async function fetchSMCLEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  // Fetch events filtered for children and family audiences
  const urls = [
    `https://smcl.bibliocommons.com/v2/events?audiences=${encodeURIComponent('564274cf4d0090f742000012')}`, // Children
    `https://smcl.bibliocommons.com/v2/events?audiences=${encodeURIComponent('564274cf4d0090f742000011')}`, // Preschoolers
  ]

  // Try each audience URL, collect unique events
  const allEvents: HomegrownEvent[] = []
  const seenIds = new Set<string>()

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        console.warn(`[SMCL] Page returned ${res.status} for ${url}`)
        continue
      }

      const html = await res.text()

      // Try JSON-LD first
      const jsonLdMatches = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi))
      let foundJsonLd = false
      for (const m of jsonLdMatches) {
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
            const mapped = mapJsonLdEvent(item, allEvents.length + i)
            if (mapped && !seenIds.has(mapped.id)) {
              seenIds.add(mapped.id)
              allEvents.push(mapped)
              foundJsonLd = true
            }
          }
        } catch { /* skip bad JSON-LD */ }
      }

      // Fall back to HTML parsing if JSON-LD found nothing
      if (!foundJsonLd) {
        const parsed = parseHtmlEvents(html)
        for (const ev of parsed) {
          if (!seenIds.has(ev.id)) {
            seenIds.add(ev.id)
            allEvents.push(ev)
          }
        }
      }
    } catch (err) {
      console.error(`[SMCL] Error fetching ${url}:`, err)
    }
  }

  if (allEvents.length > 0) {
    console.log(`[SMCL] Found ${allEvents.length} events`)
    return { events: allEvents.slice(0, 40) }
  }

  return {
    events: [],
    requiresSetup: true,
    setupMessage:
      'San Mateo County Library events are loading. Visit smcl.bibliocommons.com/events to browse directly.',
  }
}

export { FAMILY_AUDIENCES }

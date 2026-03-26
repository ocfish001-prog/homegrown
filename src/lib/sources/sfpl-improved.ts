/**
 * SF Public Library (SFPL) — improved integration
 * Source: https://sfpl.bibliocommons.com/v2/events
 *
 * Research findings:
 * - sfpl.org/events?_format=json returns 406 (HTML only)
 * - sfpl.bibliocommons.com/events redirects to /v2/events and returns 403 (bot protection)
 * - BiblioCommons does NOT expose a public REST API for events
 * - No public iCal or RSS feed found
 *
 * Strategy: Try multiple approaches:
 * 1. Attempt sfpl.bibliocommons.com/v2/events with family/kids audience filter
 * 2. Parse any JSON-LD from the HTML response
 * 3. Fall back to stub with CTA link
 *
 * NOTE: This replaces the original sfpl.ts which attempted sfpl.org endpoints.
 * The improved version targets the correct BiblioCommons subdomain with audience filtering.
 *
 * Family audience IDs (same system as SMCL):
 *   Children (6-11):    564274cf4d0090f742000012
 *   Preschoolers (0-5): 564274cf4d0090f742000011
 *   Teens (12-18):      564274cf4d0090f742000013
 */
import type { HomegrownEvent } from '../types'

// SFPL Main Branch coordinates
const SFPL_LAT = 37.7786
const SFPL_LNG = -122.4158

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
    return d.toLocaleDateString('en-US', opts).replace(',', ' ·')
  } catch {
    return dateStr
  }
}

function mapSFPLCategory(title: string, description?: string): string {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  if (text.includes('storytime') || text.includes('story time') || text.includes('read aloud')) return 'Events'
  if (text.includes('craft') || text.includes('art') || text.includes('draw') || text.includes('make')) return 'Arts'
  if (text.includes('stem') || text.includes('science') || text.includes('coding') || text.includes('robot')) return 'Workshops'
  if (text.includes('class') || text.includes('learn') || text.includes('workshop')) return 'Classes'
  if (text.includes('family') || text.includes('kids') || text.includes('children')) return 'Events'
  return 'Events'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJsonLdSFPL(ev: any, index: number): HomegrownEvent | null {
  if (!ev || ev['@type'] !== 'Event') return null
  const title = typeof ev.name === 'string' ? ev.name.trim() : null
  if (!title) return null

  const startDate = ev.startDate || ''
  const location = ev.location?.name || ev.location?.address?.addressLocality || 'SF Public Library'
  const url = ev.url || 'https://sfpl.org/events'

  return {
    id: `sfpl-v2-${index}-${title.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`,
    title,
    description: ev.description?.slice(0, 800),
    category: mapSFPLCategory(title, ev.description),
    date: parseBiblioDate(startDate),
    dateISO: startDate || undefined,
    endDateISO: ev.endDate || undefined,
    location,
    lat: SFPL_LAT,
    lng: SFPL_LNG,
    organizer: 'San Francisco Public Library',
    price: 'Free',
    url,
    source: 'sfpl',
    tags: ['library', 'kids', 'family', 'san francisco'],
  }
}

/**
 * Parse events from HTML rendering (fallback when JSON-LD not available).
 * BiblioCommons renders events as markdown-like structured blocks.
 */
function parseSFPLHtml(html: string): HomegrownEvent[] {
  const events: HomegrownEvent[] = []
  const eventBlockPattern = /###\s+\[([^\]]+)\]\((https:\/\/sfpl\.bibliocommons\.com\/events\/[^\)]+)\)\s*\n([^\n]+)/g

  let match
  let index = 0
  while ((match = eventBlockPattern.exec(html)) !== null) {
    const title = (match[1] ?? '').trim()
    const url = (match[2] ?? '').trim()
    const dateLine = (match[3] ?? '').trim()

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

    const locationMatch = dateLine.match(/\[Event location:\s*([^\]]+)\]/)
    const location = locationMatch ? (locationMatch[1] ?? 'SF Public Library').trim() : 'SF Public Library'

    events.push({
      id: `sfpl-v2-${index++}`,
      title,
      category: mapSFPLCategory(title),
      date: dateFormatted,
      dateISO,
      location,
      lat: SFPL_LAT,
      lng: SFPL_LNG,
      organizer: 'San Francisco Public Library',
      price: 'Free',
      url,
      source: 'sfpl',
      tags: ['library', 'kids', 'family', 'san francisco'],
    })

    if (events.length >= 30) break
  }

  return events
}

export async function fetchSFPLEventsImproved(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  // Try family-filtered BiblioCommons URLs
  const audienceUrls = [
    'https://sfpl.bibliocommons.com/v2/events?audiences=564274cf4d0090f742000012', // Children
    'https://sfpl.bibliocommons.com/v2/events?audiences=564274cf4d0090f742000011', // Preschoolers
  ]

  const allEvents: HomegrownEvent[] = []
  const seenIds = new Set<string>()

  for (const url of audienceUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://sfpl.org/',
        },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        console.warn(`[SFPL] BiblioCommons returned ${res.status}`)
        continue
      }

      const html = await res.text()

      // Try JSON-LD
      const jsonLdMatches = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi))
      let foundJsonLd = false
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
            const mapped = mapJsonLdSFPL(item, allEvents.length + blockIdx * 100 + i)
            if (mapped && !seenIds.has(mapped.id)) {
              seenIds.add(mapped.id)
              allEvents.push(mapped)
              foundJsonLd = true
            }
          }
        } catch { /* skip bad JSON-LD */ }
      }

      if (!foundJsonLd) {
        const htmlEvents = parseSFPLHtml(html)
        for (const ev of htmlEvents) {
          if (!seenIds.has(ev.id)) {
            seenIds.add(ev.id)
            allEvents.push(ev)
          }
        }
      }
    } catch (err) {
      console.warn(`[SFPL] Error fetching ${url}:`, err)
    }
  }

  if (allEvents.length > 0) {
    console.log(`[SFPL improved] Found ${allEvents.length} events`)
    return { events: allEvents.slice(0, 40) }
  }

  // BiblioCommons blocks server-side fetches — return helpful stub
  return {
    events: [],
    requiresSetup: true,
    setupMessage:
      'SF Public Library events are coming soon. Visit sfpl.org/events to browse storytime, workshops, and family programs.',
  }
}

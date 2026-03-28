/**
 * BigIslandNow Events Scraper
 * Source: https://bigislandnow.com/events/
 *
 * STATUS: BROKEN (2026-03-27)
 * The events page is now fully JavaScript-rendered via a custom
 * `eventlistings` WordPress plugin. Server-side HTML has no event content.
 * This scraper returns 0 events. Needs either:
 *   1. Headless browser (Playwright) to render the JS
 *   2. Discovery of the internal API endpoint the JS calls
 *   3. Data partnership with BigIslandNow
 *
 * INCREMENTAL SYNC:
 * - Scrapes HTML, extracts structured event data
 * - ID: stable event slug/token from event URL
 * - ETag: HTTP ETag/Last-Modified for 304 optimization
 */
import type { HomegrownEvent } from '../types'
import type { SyncResult } from '../sync-engine'

const BASE_URL = 'https://bigislandnow.com/events/'

// Big Island center coordinates (Hilo area)
const BIG_ISLAND_LAT = 19.7284
const BIG_ISLAND_LNG = -155.0890

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeUrl(url: string): string {
  if (!url) return BASE_URL
  try {
    return new URL(url, BASE_URL).toString()
  } catch {
    return BASE_URL
  }
}

function slugToId(url: string): string {
  try {
    const u = new URL(normalizeUrl(url))
    const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean)
    const eventIdx = parts.lastIndexOf('event')
    if (eventIdx >= 0 && parts[eventIdx + 1]) return parts[eventIdx + 1]!
    return parts[parts.length - 1] || u.pathname.replace(/[^a-z0-9]/gi, '-').substring(0, 60).toLowerCase()
  } catch {
    return url.replace(/[^a-z0-9]/gi, '-').substring(0, 60).toLowerCase()
  }
}

function mapCategory(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase()
  if (text.includes('concert') || text.includes('music') || text.includes('jazz') || text.includes('band') || text.includes('luau')) return 'Music'
  if (text.includes('film') || text.includes('movie') || text.includes('cinema') || text.includes('screen')) return 'Events'
  if (text.includes('dance') || text.includes('ballet') || text.includes('hula')) return 'Arts'
  if (text.includes('theater') || text.includes('theatre') || text.includes('play') || text.includes('performance')) return 'Arts'
  if (text.includes('workshop') || text.includes('class') || text.includes('lesson') || text.includes('training')) return 'Workshops'
  if (text.includes('festival') || text.includes('fair') || text.includes('market')) return 'Events'
  if (text.includes('yoga') || text.includes('fitness') || text.includes('run') || text.includes('hike') || text.includes('surf')) return 'Outdoors'
  if (text.includes('food') || text.includes('dinner') || text.includes('culinary') || text.includes('chocolate') || text.includes('coffee')) return 'Food'
  if (text.includes('art') || text.includes('exhibit') || text.includes('gallery') || text.includes('craft')) return 'Arts'
  if (text.includes('cultural') || text.includes('heritage') || text.includes('hawaiian') || text.includes('aloha')) return 'Culture'
  if (text.includes('kid') || text.includes('child') || text.includes('family') || text.includes('youth')) return 'Family'
  return 'Events'
}

interface ParsedBigIslandNowEvent {
  title: string
  url: string
  date: string
  dateISO: string | null
  location: string
  description: string
}

function parseJsonLdBlock(jsonText: string): Partial<ParsedBigIslandNowEvent> {
  try {
    const parsed = JSON.parse(jsonText) as {
      '@type'?: string
      name?: string
      startDate?: string
      description?: string
      location?: { name?: string } | string
    }

    if (parsed['@type'] !== 'Event') return {}

    let date = 'See site'
    let dateISO: string | null = null
    if (parsed.startDate) {
      const d = new Date(parsed.startDate)
      if (!isNaN(d.getTime())) {
        dateISO = d.toISOString()
        date = d.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Pacific/Honolulu',
        }).replace(',', ' ·')
      }
    }

    const location = typeof parsed.location === 'string'
      ? parsed.location
      : parsed.location?.name || ''

    return {
      title: stripHtml(parsed.name || ''),
      date,
      dateISO,
      location: stripHtml(location),
      description: stripHtml(parsed.description || ''),
    }
  } catch {
    return {}
  }
}

/**
 * Parse a BigIslandNow events page and extract event data.
 * Current site markup uses <a class="staticEvent event"> cards plus adjacent JSON-LD.
 */
function parseBigIslandNowHtml(html: string): ParsedBigIslandNowEvent[] {
  const events: ParsedBigIslandNowEvent[] = []
  const seen = new Set<string>()

  const cardRe = /(?:<script type="application\/ld\+json">([\s\S]*?)<\/script>\s*)?<a[^>]+href="([^"]*\/events\/event\/[^"#?]+[^"]*)"[^>]+class="[^"]*staticEvent[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  // eslint-disable-next-line no-cond-assign
  while ((match = cardRe.exec(html)) !== null) {
    const jsonLd = (match[1] ?? '').trim()
    const href = normalizeUrl((match[2] ?? '').trim())
    const cardHtml = match[3] ?? ''
    const fromJson = jsonLd ? parseJsonLdBlock(jsonLd) : {}

    const title = stripHtml(
      cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]
      ?? fromJson.title
      ?? ''
    )
    if (!title || seen.has(href)) continue

    const date = stripHtml(
      cardHtml.match(/<span[^>]+class="[^"]*eventTime[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]
      ?? fromJson.date
      ?? 'See site'
    )
    const location = stripHtml(
      cardHtml.match(/<span[^>]+class="[^"]*subText[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1]
      ?? fromJson.location
      ?? 'Big Island, Hawaii'
    )
    const description = stripHtml((fromJson.description ?? '').toString()).substring(0, 400)

    events.push({
      title,
      url: href,
      date: date || 'See site',
      dateISO: fromJson.dateISO ?? null,
      location: location || 'Big Island, Hawaii',
      description,
    })
    seen.add(href)
  }

  return events
}

export async function fetchBigIslandNowEvents(
  _lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0; +https://homegrown-phase1-app.netlify.app)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    }
    if (lastEtag) headers['If-None-Match'] = lastEtag

    const res = await fetch(BASE_URL, {
      headers,
      next: { revalidate: 3600 * 6 }, // 6 hour cache
      signal: AbortSignal.timeout(20000),
    })

    if (res.status === 304) {
      console.log('[BigIslandNow] 304 Not Modified')
      return { events: [] }
    }
    if (!res.ok) {
      console.warn(`[BigIslandNow] HTTP ${res.status}`)
      return { events: [] }
    }

    const etag = res.headers.get('etag') ?? undefined
    const html = await res.text()

    const parsed = parseBigIslandNowHtml(html)
    const now = new Date()

    const events: HomegrownEvent[] = parsed
      .filter(e => {
        if (e.dateISO) return new Date(e.dateISO) >= now
        return true
      })
      .map(e => ({
        id: `bigislandnow-${slugToId(e.url)}`,
        title: e.title,
        description: e.description || undefined,
        category: mapCategory(e.title, e.description),
        date: e.date,
        dateISO: e.dateISO ?? undefined,
        location: e.location || 'Big Island, Hawaii',
        address: 'Big Island, HI',
        lat: BIG_ISLAND_LAT,
        lng: BIG_ISLAND_LNG,
        organizer: 'BigIslandNow',
        price: 'See site',
        url: e.url,
        source: 'bigislandnow',
        tags: ['hawaii', 'big island', 'events'],
      }) as unknown as HomegrownEvent)

    console.log(`[BigIslandNow] ${events.length} upcoming events scraped`)
    return { events, ...(etag ? { etag } : {}) }
  } catch (err) {
    console.error('[BigIslandNow] Error:', err)
    return { events: [] }
  }
}

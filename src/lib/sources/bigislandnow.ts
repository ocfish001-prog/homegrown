/**
 * BigIslandNow Events Scraper
 * Source: https://bigislandnow.com/events/
 * Scrapes The Events Calendar (WordPress) events listing for Big Island Hawaii.
 *
 * INCREMENTAL SYNC:
 * - Scrapes HTML, extracts structured event data
 * - ID: slug from event URL
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugToId(url: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.replace(/\/$/, '').split('/')
    return parts[parts.length - 1] || u.pathname.replace(/[^a-z0-9]/g, '-').substring(0, 60)
  } catch {
    return url.replace(/[^a-z0-9]/g, '-').substring(0, 60)
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

/**
 * Parse a BigIslandNow events page and extract event data.
 * The Events Calendar (WordPress) renders events in article elements with
 * class "tribe_events_cat-*" or inside .tribe-events-loop.
 */
function parseBigIslandNowHtml(html: string): Array<{
  title: string
  url: string
  date: string
  dateISO: string | null
  location: string
  description: string
}> {
  const events: Array<{
    title: string
    url: string
    date: string
    dateISO: string | null
    location: string
    description: string
  }> = []

  // The Events Calendar structure: articles with class containing tribe-events
  // Extract event articles
  const articleRe = /<article[^>]+class="[^"]*tribe[^"]*"[^>]*>([\s\S]*?)<\/article>/gi
  let articleMatch: RegExpExecArray | null

  // eslint-disable-next-line no-cond-assign
  while ((articleMatch = articleRe.exec(html)) !== null) {
    const articleHtml = articleMatch[1] ?? ''

    // Title + URL
    const titleMatch = articleHtml.match(/<h2[^>]*class="[^"]*tribe-events-list-event-title[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/i)
      || articleHtml.match(/<a[^>]+class="[^"]*url[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    if (!titleMatch) continue

    const url = (titleMatch[1] ?? '').trim()
    const title = stripHtml(titleMatch[2] ?? '').trim()
    if (!title || !url) continue

    // Date — look for datetime attribute or text
    const dateMatch = articleHtml.match(/<abbr[^>]+class="[^"]*tribe-events-abbr[^"]*"[^>]+title="([^"]+)"/i)
      || articleHtml.match(/<time[^>]+datetime="([^"]+)"/i)
      || articleHtml.match(/<span[^>]+class="[^"]*tribe-event-date-start[^"]*"[^>]*>([^<]+)<\/span>/i)

    let dateISO: string | null = null
    let dateDisplay = 'See site'

    if (dateMatch) {
      const rawDate = (dateMatch[1] ?? '').trim()
      // Try ISO parse
      const d = new Date(rawDate)
      if (!isNaN(d.getTime())) {
        dateISO = d.toISOString()
        dateDisplay = d.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          timeZone: 'Pacific/Honolulu',
        })
      } else {
        dateDisplay = rawDate
      }
    }

    // Location
    const locationMatch = articleHtml.match(/<address[^>]*>([\s\S]*?)<\/address>/i)
      || articleHtml.match(/<span[^>]+class="[^"]*tribe-venue[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    const location = locationMatch ? stripHtml(locationMatch[1] ?? '').substring(0, 120) : 'Big Island, Hawaii'

    // Description
    const descMatch = articleHtml.match(/<div[^>]+class="[^"]*tribe-events-schedule[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || articleHtml.match(/<div[^>]+class="[^"]*tribe-events-list-event-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    const description = descMatch ? stripHtml(descMatch[1] ?? '').substring(0, 400) : ''

    events.push({ title, url, date: dateDisplay, dateISO, location, description })
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
        // Filter out past events if we have a date
        if (e.dateISO) {
          return new Date(e.dateISO) >= now
        }
        return true
      })
      .map(e => {
        const id = `bigislandnow-${slugToId(e.url)}`
        const category = mapCategory(e.title, e.description)

        return {
          id,
          title: e.title,
          description: e.description || undefined,
          category,
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
        } as unknown as HomegrownEvent
      })

    console.log(`[BigIslandNow] ${events.length} upcoming events scraped`)
    return { events, ...(etag ? { etag } : {}) }
  } catch (err) {
    console.error('[BigIslandNow] Error:', err)
    return { events: [] }
  }
}

/**
 * SF Funcheap events integration
 * Source: https://sf.funcheap.com/
 *
 * INVESTIGATION FINDINGS (2026-03-26):
 * - RSS at /feed/ redirects to FeedBurner (same content either way)
 * - The kids-families category RSS URL redirects to the MAIN feed (FeedBurner strips category)
 * - Titles encode event dates: "5/6/26: SF Zoo Free Admission Day - FREE"
 * - GUID is a stable permalink slug — use URL slug as externalId
 * - Content is minimal: just the post permalink, no detailed body
 * - RSS is chronologically ordered (newest first) and shows ~10-20 items
 * - Family filtering: check <category> tags for "Kids & Families"
 *
 * INCREMENTAL SYNC:
 * - RSS only shows the most recent N items — process diff against DB
 * - Stable ID: URL slug extracted from <link> or <guid>
 * - lastSyncedAt: compare pubDate against last sync, skip older items
 * - ETag: pass If-None-Match on RSS fetch; 304 = no new content
 */
import type { HomegrownEvent } from '../types'
import { isAdultContent } from '../eventbrite'
import type { SyncResult } from '../sync-engine'

const FUNCHEAP_LAT = 37.7749
const FUNCHEAP_LNG = -122.4194

// Funcheap main RSS (kids category URL redirects here anyway)
const RSS_URL = 'https://sf.funcheap.com/feed/'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function extractTagText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? stripHtml(m[1] ?? '') : ''
}

function extractCDATA(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const m = xml.match(re)
  return m ? (m[1] ?? '').trim() : extractTagText(xml, tag)
}

/** Extract URL slug from a Funcheap URL for use as stable externalId */
function slugFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname.replace(/^\/|\/$/g, '') || url
  } catch {
    return url
  }
}

/** Extract all <category> tag values from an RSS item */
function extractCategories(xml: string): string[] {
  const cats: string[] = []
  const re = /<category><!\[CDATA\[(.*?)\]\]><\/category>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) cats.push((m[1] ?? '').trim())
  return cats
}

/** Parse date from Funcheap title format: "5/6/26: Event Name - FREE" */
function parseFuncheapEventDate(title: string): Date | null {
  // Pattern: MM/DD/YY or MM/DD/YYYY at start of title
  const m = title.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (!m) return null
  const [, month, day, yr] = m
  const year = (yr ?? '').length === 2 ? `20${yr}` : yr
  const d = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).replace(',', ' \u00B7')
}

function mapCategory(title: string, cats: string[]): string {
  const text = `${title} ${cats.join(' ')}`.toLowerCase()
  if (text.includes('music') || text.includes('concert') || text.includes('live music')) return 'Music'
  if (text.includes('art') || text.includes('museum') || text.includes('gallery')) return 'Arts'
  if (text.includes('hike') || text.includes('outdoor') || text.includes('nature') || text.includes('park')) return 'Field Trips'
  if (text.includes('workshop') || text.includes('class')) return 'Workshops'
  if (text.includes('festival') || text.includes('fair') || text.includes('parade')) return 'Events'
  if (text.includes('food') || text.includes('drink') || text.includes('eat')) return 'Food & Drink'
  return 'Events'
}

export async function fetchFuncheapEvents(
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml',
    }
    if (lastEtag) headers['If-None-Match'] = lastEtag

    const res = await fetch(RSS_URL, {
      headers,
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    })

    // 304 Not Modified — no new content
    if (res.status === 304) {
      console.log('[Funcheap] 304 Not Modified — no new events')
      return { events: [] }
    }

    if (!res.ok) {
      console.warn(`[Funcheap] RSS returned ${res.status}`)
      return { events: [] }
    }

    const etag = res.headers.get('etag') ?? undefined
    const xml = await res.text()
    const events: HomegrownEvent[] = []

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let m: RegExpExecArray | null

    while ((m = itemRegex.exec(xml)) !== null) {
      const item = m[1] ?? ''

      const title = extractCDATA(item, 'title') || extractTagText(item, 'title')
      if (!title) continue

      // Stable ID: URL slug
      const linkMatch = item.match(/<link>([^<]+)<\/link>/)
      const guidMatch = item.match(/<guid[^>]*>([^<]+)<\/guid>/)
      const url = (linkMatch ? (linkMatch[1] ?? '').trim() : '') ||
                  (guidMatch ? (guidMatch[1] ?? '').trim() : '')
      if (!url) continue

      const externalId = slugFromUrl(url)

      // pubDate for incremental filtering
      const pubDateStr = extractTagText(item, 'pubDate')
      const pubDate = pubDateStr ? new Date(pubDateStr) : null

      // Skip items older than last sync (RSS is newest-first; once we hit old, stop)
      if (pubDate && pubDate <= lastSyncedAt) continue

      const cats = extractCategories(item)
      const description = stripHtml(extractCDATA(item, 'description')).slice(0, 400)

      // Family filter: must have "Kids & Families" category OR pass keyword check
      const isKidsCategory = cats.some(c => c.toLowerCase().includes('kid') || c.toLowerCase().includes('famil'))
      if (!isKidsCategory) {
        // Fall back to keyword filter for uncategorized family events
        const familyKeywords = ['kid', 'child', 'famil', 'toddler', 'baby', 'youth', 'junior', 'story time', 'storytime']
        const hasFamilyKeyword = familyKeywords.some(kw => title.toLowerCase().includes(kw) || description.toLowerCase().includes(kw))
        if (!hasFamilyKeyword) continue
      }

      if (isAdultContent(title, description)) continue

      // Parse event date from title (Funcheap encodes it: "5/6/26: ...")
      const eventDate = parseFuncheapEventDate(title)
      const dateISO = eventDate ? eventDate.toISOString() : (pubDate ? pubDate.toISOString() : undefined)

      events.push({
        id: externalId,
        title,
        description,
        category: mapCategory(title, cats),
        date: eventDate ? formatDate(eventDate) : (pubDate ? formatDate(pubDate) : 'Date TBD'),
        dateISO,
        location: 'San Francisco Bay Area',
        lat: FUNCHEAP_LAT,
        lng: FUNCHEAP_LNG,
        organizer: 'SF Funcheap',
        price: title.toLowerCase().includes('free') ? 'Free' : 'Free / Cheap',
        url,
        source: 'funcheap',
        tags: ['free', 'cheap', 'family', 'bay area', ...cats.map(c => c.toLowerCase())],
      })
    }

    console.log(`[Funcheap] ${events.length} new events since ${lastSyncedAt.toISOString()}`)
    return { events, ...(etag ? { etag } : {}) }
  } catch (err) {
    console.error('[Funcheap] Error:', err)
    return { events: [] }
  }
}

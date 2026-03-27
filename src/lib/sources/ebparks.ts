/**
 * East Bay Regional Park District events integration
 * Source: https://www.ebparks.org/calendar
 *
 * INVESTIGATION FINDINGS (2026-03-26):
 * - Correct URL is /calendar (not /programs/calendar — that 404s)
 * - Page renders server-side HTML (no JS required — readability extracts events)
 * - Events are listed as links with format:
 *   "[Drop-in Program Fish Feeding\nWednesday, Mar. 25, 2026, 3:00 PM\nCrown Beach, Alameda]"
 *   linking to: https://apm.activecommunities.com/ebparks/Activity_Search/{numericId}
 * - Numeric ID in the APM URL is the stable externalId
 * - Pagination: ?page=N&category={catId} — at least 75 pages of events
 * - Family programs: fish feeding, birding, hike+storytime, story time, nature walks
 * - No API — pure HTML scrape with stable APM IDs
 *
 * INCREMENTAL SYNC:
 * - Fetch page 1 (most recent/upcoming events)
 * - Extract APM activity IDs as stable externalIds
 * - Only process events not in DB (upsert handles dedup)
 * - Date is in title: "Wednesday, Mar. 25, 2026, 3:00 PM"
 * - Future pages fetched on initial sync only (lastSyncedAt near epoch)
 */
import type { HomegrownEvent } from '../types'
import { isAdultContent } from '../eventbrite'
import type { SyncResult } from '../sync-engine'

const CALENDAR_URL = 'https://www.ebparks.org/calendar'
const EBPARKS_LAT = 37.8404
const EBPARKS_LNG = -122.2477

const FAMILY_KEYWORDS = [
  'family', 'kids', 'children', 'story', 'storytime', 'hike', 'hiking',
  'birding', 'bird', 'nature', 'fish', 'fishing', 'junior', 'ranger',
  'outdoor', 'drop-in', 'drop in', 'creek', 'wildlife', 'habitat',
  'good night', 'cafecito', 'wade', 'paddle',
]

function isFamilyEvent(title: string): boolean {
  const lower = title.toLowerCase()
  return FAMILY_KEYWORDS.some(kw => lower.includes(kw))
}

/**
 * Parse the EBParks calendar HTML.
 *
 * The rendered page from readability looks like:
 *   [Drop-in Program Fish Feeding\nWednesday, Mar. 25, 2026, 3:00 PM\nCrown Beach, Alameda](https://apm.activecommunities.com/ebparks/Activity_Search/58552)
 *
 * We parse: markdown links OR raw HTML <a> tags.
 */
function parseEbparksPage(content: string): HomegrownEvent[] {
  const events: HomegrownEvent[] = []
  const seenIds = new Set<string>()

  // Match markdown links from readability output:
  // [Drop-in Program Fish Feeding...](https://apm.activecommunities.com/ebparks/Activity_Search/58552)
  // OR the text/HTML version
  const linkPattern = /\[([^\]]+)\]\((https:\/\/apm\.activecommunities\.com\/ebparks\/Activity_Search\/(\d+)[^)]*)\)/g
  let m: RegExpExecArray | null

  while ((m = linkPattern.exec(content)) !== null) {
    const fullText = (m[1] ?? '').replace(/\n+/g, '\n').trim()
    const url = m[2] ?? ''
    const activityId = m[3] ?? ''

    if (!activityId || seenIds.has(activityId)) continue
    seenIds.add(activityId)

    // Parse the block text: may contain program type, title, date, location
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean)

    // First line(s) before the date line are the title (may include program type prefix)
    // Date pattern: "Wednesday, Mar. 25, 2026, 3:00 PM" or "Thursday, Mar. 26, 2026, 9:00 AM"
    const dateLineIdx = lines.findIndex(l =>
      /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(l)
    )

    let title = ''
    let dateStr = ''
    let location = 'East Bay Regional Parks'

    if (dateLineIdx > 0) {
      // Lines before date = title (strip "Drop-in Program" / "Registration Required" prefix)
      title = lines.slice(0, dateLineIdx)
        .join(' ')
        .replace(/^(?:Drop-in Program|Registration Required)\s*/i, '')
        .trim()
      dateStr = lines[dateLineIdx] ?? ''
      if (dateLineIdx + 1 < lines.length) {
        location = lines.slice(dateLineIdx + 1).join(', ')
      }
    } else if (lines.length > 0) {
      // Fallback: first line is title
      title = (lines[0] ?? '').replace(/^(?:Drop-in Program|Registration Required)\s*/i, '').trim()
      dateStr = lines[1] ?? ''
      location = lines[2] ?? 'East Bay Regional Parks'
    }

    if (!title || title.length < 3) continue
    if (isAdultContent(title, '')) continue
    if (!isFamilyEvent(title)) continue

    // Parse date: "Wednesday, Mar. 25, 2026, 3:00 PM"
    let dateISO: string | undefined
    let dateDisplay = 'Date TBD'

    if (dateStr) {
      try {
        // Remove day-of-week prefix: "Wednesday, " → "Mar. 25, 2026, 3:00 PM"
        const cleaned = dateStr.replace(/^\w+,\s*/, '').replace(/\./g, '')
        // "Mar 25, 2026, 3:00 PM"
        const d = new Date(`${cleaned} PST`)
        if (!isNaN(d.getTime())) {
          dateISO = d.toISOString()
          dateDisplay = d.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
            timeZone: 'America/Los_Angeles',
          }).replace(',', ' \u00B7')
        } else {
          dateDisplay = dateStr
        }
      } catch {
        dateDisplay = dateStr
      }
    }

    // Extract city from location for more specific lat/lng (we keep default for simplicity)
    const locationDisplay = location || 'East Bay Regional Parks'

    events.push({
      id: `ebparks-${activityId}`,
      title,
      category: mapEbparksCategory(title),
      date: dateDisplay,
      dateISO,
      location: locationDisplay,
      lat: EBPARKS_LAT,
      lng: EBPARKS_LNG,
      organizer: 'East Bay Regional Parks',
      price: 'Free',
      url,
      source: 'ebparks',
      tags: ['east bay', 'outdoor', 'nature', 'parks', 'family'],
    })
  }

  return events
}

function mapEbparksCategory(title: string): string {
  const l = title.toLowerCase()
  if (l.includes('story') || l.includes('storytime')) return 'Events'
  if (l.includes('hike') || l.includes('walk') || l.includes('trail') || l.includes('paddle')) return 'Field Trips'
  if (l.includes('bird') || l.includes('nature') || l.includes('wildlife') || l.includes('cafecito')) return 'Field Trips'
  if (l.includes('fish') || l.includes('creek') || l.includes('wade')) return 'Field Trips'
  if (l.includes('good night') || l.includes('farm')) return 'Events'
  if (l.includes('class') || l.includes('workshop')) return 'Workshops'
  return 'Events'
}

/**
 * Fetch multiple pages for initial sync; just page 1 for incremental.
 */
async function fetchCalendarPage(page: number): Promise<string | null> {
  const url = page === 0 ? CALENDAR_URL : `${CALENDAR_URL}?page=${page}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
        'Accept': 'text/html',
      },
      next: { revalidate: 7200 },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function fetchEastBayParksEvents(
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  void lastEtag
  const isInitialSync = lastSyncedAt.getFullYear() < 2020

  // Pages to fetch: first 3 pages on initial sync, just page 1 on incremental
  const pagesToFetch = isInitialSync ? [0, 1, 2, 3, 4] : [0]
  const allEvents: HomegrownEvent[] = []
  const seenIds = new Set<string>()

  for (const page of pagesToFetch) {
    const html = await fetchCalendarPage(page)
    if (!html) continue

    // Convert raw HTML links to a parseable format
    // Extract <a href="...apm...">...</a> patterns from raw HTML
    const linkRe = /<a[^>]+href="(https:\/\/apm\.activecommunities\.com\/ebparks\/Activity_Search\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    let m: RegExpExecArray | null
    let found = false

    while ((m = linkRe.exec(html)) !== null) {
      const url = m[1] ?? ''
      const activityId = m[2] ?? ''
      const rawText = (m[3] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      if (!activityId || seenIds.has(activityId)) continue
      seenIds.add(activityId)
      found = true

      // rawText contains the full block: "Drop-in Program Fish Feeding Wednesday, Mar. 25, 2026, 3:00 PM Crown Beach, Alameda"
      const dateM = rawText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+ \d+,\s*\d{4}(?:,\s*\d+:\d+\s*[AP]M)?)/i)

      let title = rawText
      let dateStr = ''
      let location = 'East Bay Regional Parks'

      if (dateM && dateM.index !== undefined) {
        title = rawText.slice(0, dateM.index)
          .replace(/^(?:Drop-in Program|Registration Required)\s*/i, '').trim()
        dateStr = dateM[0] ?? ''
        location = rawText.slice(dateM.index + dateStr.length).trim() || 'East Bay Regional Parks'
      } else {
        title = rawText.replace(/^(?:Drop-in Program|Registration Required)\s*/i, '').trim()
      }

      if (!title || title.length < 3) continue
      if (isAdultContent(title, '')) continue
      if (!isFamilyEvent(title)) continue

      let dateISO: string | undefined
      let dateDisplay = 'Date TBD'

      if (dateStr) {
        try {
          const cleaned = dateStr.replace(/^\w+,\s*/, '').replace(/\./g, '')
          const d = new Date(`${cleaned} PST`)
          if (!isNaN(d.getTime())) {
            dateISO = d.toISOString()
            dateDisplay = d.toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
              timeZone: 'America/Los_Angeles',
            }).replace(',', ' \u00B7')
          } else {
            dateDisplay = dateStr
          }
        } catch {
          dateDisplay = dateStr
        }
      }

      allEvents.push({
        id: `ebparks-${activityId}`,
        title,
        category: mapEbparksCategory(title),
        date: dateDisplay,
        dateISO,
        location,
        lat: EBPARKS_LAT,
        lng: EBPARKS_LNG,
        organizer: 'East Bay Regional Parks',
        price: 'Free',
        url,
        source: 'ebparks',
        tags: ['east bay', 'outdoor', 'nature', 'parks', 'family'],
      })
    }

    // If no APM links found, try readability-style markdown parse
    if (!found) {
      const extracted = parseEbparksPage(html)
      for (const ev of extracted) {
        if (!seenIds.has(ev.id)) {
          seenIds.add(ev.id)
          allEvents.push(ev)
        }
      }
    }

    // On incremental sync, stop after first page if we got results
    if (!isInitialSync && allEvents.length > 0) break
  }

  console.log(`[EBParks] ${allEvents.length} family events (${isInitialSync ? 'full' : 'incremental'} sync)`)
  return { events: allEvents }
}

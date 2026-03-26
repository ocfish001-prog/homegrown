/**
 * Contra Costa County iCal integration
 * Source: https://www.contracosta.ca.gov/iCalendar.aspx
 * Platform: CivicEngage (CivicPlus)
 *
 * CONFIRMED LIVE: iCal export at /iCalendar.aspx
 * Categories: Parks & Recreation, Special Events
 *
 * INCREMENTAL SYNC:
 * - iCal doesn't support delta fetching — fetch all, skip past events
 * - Stable ID: UID field in VEVENT (CivicEngage uses "EventID-YYYYMMDD@contracosta.ca.gov")
 * - ETag: use HTTP ETag/Last-Modified for 304 optimization
 */
import type { HomegrownEvent } from '../types'
import type { SyncResult } from '../sync-engine'

// Category 68 = Parks & Recreation, 77 = Alamo Parks and Recreation Events
const ICAL_URL = 'https://www.contracosta.ca.gov/common/modules/iCalendar/iCalendar.aspx?catID=68&feed=calendar'

// Contra Costa county center coordinates
const CC_LAT = 37.9161
const CC_LNG = -121.9552

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseICalDate(val: string): Date | null {
  // DTSTART formats: 20260405T100000, 20260405T100000Z, 20260405
  const clean = val.replace(/TZID=[^:]+:/, '').trim()
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/)
  if (!m) return null
  const [, yr, mo, dy, hr = '0', mn = '0', sc = '0'] = m
  const d = new Date(`${yr}-${mo}-${dy}T${hr.padStart(2,'0')}:${mn.padStart(2,'0')}:${sc.padStart(2,'0')}-08:00`)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
  // Only show time if it's not midnight
  const isAllDay = d.getHours() === 0 && d.getMinutes() === 0
  return isAllDay ? datePart.replace(',', ' ·') : `${datePart.replace(',', ' ·')} · ${timePart}`
}

function unescapeIcal(s: string): string {
  return s.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
}

function extractICalField(vevent: string, field: string): string {
  // Handle folded lines (RFC 5545: continuation lines start with space/tab)
  const unfolded = vevent.replace(/\r?\n[ \t]/g, '')
  const re = new RegExp(`^${field}(?:;[^:]+)?:(.*)$`, 'im')
  const m = unfolded.match(re)
  return m ? unescapeIcal((m[1] ?? '').trim()) : ''
}

function mapCategory(summary: string, description: string, categories: string): string {
  const text = `${summary} ${description} ${categories}`.toLowerCase()
  if (text.includes('hike') || text.includes('trail') || text.includes('walk')) return 'Field Trips'
  if (text.includes('workshop') || text.includes('class') || text.includes('lesson')) return 'Workshops'
  if (text.includes('storytime') || text.includes('story time')) return 'Events'
  if (text.includes('camp')) return 'Camps'
  if (text.includes('nature') || text.includes('outdoor') || text.includes('wildlife')) return 'Field Trips'
  if (text.includes('arts') || text.includes('craft')) return 'Arts'
  if (text.includes('sport') || text.includes('swim') || text.includes('tennis')) return 'Sports'
  return 'Events'
}

function isFamilyRelevant(summary: string, description: string, categories: string): boolean {
  const text = `${summary} ${description} ${categories}`.toLowerCase()
  // Always include Parks & Recreation events
  if (categories.toLowerCase().includes('parks') || categories.toLowerCase().includes('recreation')) return true
  // Family keywords
  const keywords = ['kid', 'child', 'family', 'youth', 'teen', 'junior', 'toddler', 'homeschool',
    'camp', 'storytime', 'story time', 'nature', 'hike', 'outdoor', 'park', 'program']
  return keywords.some(kw => text.includes(kw))
}

export async function fetchContraCostaIcalEvents(
  _lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
      'Accept': 'text/calendar, text/plain',
    }
    if (lastEtag) headers['If-None-Match'] = lastEtag

    const res = await fetch(ICAL_URL, {
      headers,
      next: { revalidate: 3600 * 6 }, // 6 hour cache
      signal: AbortSignal.timeout(12000),
    })

    if (res.status === 304) {
      console.log('[ContraCostaIcal] 304 Not Modified')
      return { events: [] }
    }
    if (!res.ok) {
      console.warn(`[ContraCostaIcal] Returned ${res.status}`)
      return { events: [] }
    }

    const etag = res.headers.get('etag') ?? undefined
    const ical = await res.text()

    // Split into VEVENT blocks
    const vevents = ical.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? []
    const now = new Date()
    const events: HomegrownEvent[] = []

    for (const vevent of vevents) {
      const uid = extractICalField(vevent, 'UID')
      if (!uid) continue

      const summary = extractICalField(vevent, 'SUMMARY')
      if (!summary) continue

      const dtstart = extractICalField(vevent, 'DTSTART')
      const dtend = extractICalField(vevent, 'DTEND')
      const description = stripHtml(extractICalField(vevent, 'DESCRIPTION')).slice(0, 600)
      const location = extractICalField(vevent, 'LOCATION')
      const url = extractICalField(vevent, 'URL')
      const categories = extractICalField(vevent, 'CATEGORIES')

      const startDate = dtstart ? parseICalDate(dtstart) : null
      const endDate = dtend ? parseICalDate(dtend) : null

      // Skip past events
      if (!startDate || startDate < now) continue

      // Family relevance filter
      if (!isFamilyRelevant(summary, description, categories)) continue

      events.push({
        id: `contra-costa-ical-${uid.replace(/[^a-zA-Z0-9]/g, '-')}`,
        title: summary,
        description: description || undefined,
        category: mapCategory(summary, description, categories),
        date: formatDate(startDate),
        dateISO: startDate.toISOString(),
        endDateISO: endDate?.toISOString(),
        location: location || 'Contra Costa County',
        lat: CC_LAT,
        lng: CC_LNG,
        organizer: 'Contra Costa County Parks & Recreation',
        price: 'See site',
        url: url || 'https://www.contracosta.ca.gov/calendar.aspx',
        source: 'contra-costa-ical',
        tags: ['contra costa', 'parks', 'recreation', 'bay area'],
      })
    }

    console.log(`[ContraCostaIcal] ${events.length} upcoming family events`)
    return { events, ...(etag ? { etag } : {}) }
  } catch (err) {
    console.error('[ContraCostaIcal] Error:', err)
    return { events: [] }
  }
}

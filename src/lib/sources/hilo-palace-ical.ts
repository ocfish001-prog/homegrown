/**
 * Hilo Palace Theater iCal integration
 * Source: webcal://hilopalace.com/?post_type=tribe_events&ical=1
 * Platform: The Events Calendar (WordPress plugin)
 *
 * CONFIRMED LIVE: iCal export confirmed working
 * Pull: https:// version of the webcal URL
 *
 * INCREMENTAL SYNC:
 * - iCal doesn't support delta fetching — fetch all, skip past events
 * - Stable ID: UID field in VEVENT
 * - ETag: use HTTP ETag/Last-Modified for 304 optimization
 */
import type { HomegrownEvent } from '../types'
import type { SyncResult } from '../sync-engine'

const ICAL_URL = 'https://hilopalace.com/?post_type=tribe_events&ical=1'

// Hilo Palace Theater coordinates
const PALACE_LAT = 19.7201
const PALACE_LNG = -155.0897

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ').replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function parseICalDate(val: string, tzDefault = 'Pacific/Honolulu'): Date | null {
  const clean = val.replace(/TZID=[^:]+:/, '').trim()
  const m = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?/)
  if (!m) return null
  const [, yr, mo, dy, hr = '0', mn = '0', sc = '0', utc = ''] = m

  if (utc === 'Z') {
    const d = new Date(`${yr}-${mo}-${dy}T${hr.padStart(2,'0')}:${mn.padStart(2,'0')}:${sc.padStart(2,'0')}Z`)
    return isNaN(d.getTime()) ? null : d
  }
  // Hawaii Standard Time is UTC-10 (no DST)
  const offset = tzDefault === 'Pacific/Honolulu' ? '-10:00' : '-08:00'
  const d = new Date(`${yr}-${mo}-${dy}T${hr.padStart(2,'0')}:${mn.padStart(2,'0')}:${sc.padStart(2,'0')}${offset}`)
  return isNaN(d.getTime()) ? null : d
}

function formatDate(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'Pacific/Honolulu',
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'Pacific/Honolulu',
  })
  const isAllDay = d.getUTCHours() === 10 && d.getUTCMinutes() === 0 // midnight HST = 10:00 UTC
  return isAllDay ? datePart.replace(',', ' \u00B7') : `${datePart.replace(',', ' \u00B7')} \u00B7 ${timePart}`
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

function mapCategory(summary: string, description: string): string {
  const text = `${summary} ${description}`.toLowerCase()
  if (text.includes('concert') || text.includes('music') || text.includes('jazz') || text.includes('band')) return 'Music'
  if (text.includes('film') || text.includes('movie') || text.includes('cinema') || text.includes('screen')) return 'Events'
  if (text.includes('dance') || text.includes('ballet') || text.includes('hula')) return 'Arts'
  if (text.includes('theater') || text.includes('theatre') || text.includes('play') || text.includes('performance')) return 'Arts'
  if (text.includes('workshop') || text.includes('class') || text.includes('lesson')) return 'Workshops'
  if (text.includes('festival') || text.includes('fair')) return 'Events'
  return 'Events'
}

function isFamilyRelevant(summary: string, description: string): boolean {
  const text = `${summary} ${description}`.toLowerCase()
  const keywords = [
    'kid', 'child', 'family', 'youth', 'teen', 'junior', 'toddler', 'homeschool',
    'all ages', 'all-ages', 'community', 'cultural', 'heritage', 'hula', 'hawaiian',
    'concert', 'music', 'dance', 'festival', 'performance', 'film', 'movie',
    'free', 'workshop', 'class',
  ]
  // Palace Theater is a family-friendly cultural venue — be inclusive
  return keywords.some(kw => text.includes(kw)) || true // include all palace events
}

export async function fetchHiloPalaceIcalEvents(
  _lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
      'Accept': 'text/calendar, text/plain, */*',
    }
    if (lastEtag) headers['If-None-Match'] = lastEtag

    const res = await fetch(ICAL_URL, {
      headers,
      next: { revalidate: 3600 * 6 }, // 6 hour cache
      signal: AbortSignal.timeout(15000),
    })

    if (res.status === 304) {
      console.log('[HiloPalaceIcal] 304 Not Modified')
      return { events: [] }
    }
    if (!res.ok) {
      console.warn(`[HiloPalaceIcal] Returned ${res.status}`)
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

      const startDate = dtstart ? parseICalDate(dtstart) : null
      const endDate = dtend ? parseICalDate(dtend) : null

      // Skip past events
      if (!startDate || startDate < now) continue

      if (!isFamilyRelevant(summary, description)) continue

      const safeId = uid.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 80)

      events.push({
        id: `hilo-palace-ical-${safeId}`,
        title: summary,
        description: description || undefined,
        category: mapCategory(summary, description),
        date: formatDate(startDate),
        dateISO: startDate.toISOString(),
        endDateISO: endDate?.toISOString(),
        location: location || 'Hilo Palace Theater',
        address: '38 Haili St, Hilo, HI 96720',
        lat: PALACE_LAT,
        lng: PALACE_LNG,
        organizer: 'Hilo Palace Theater',
        price: 'See site',
        url: url || 'https://hilopalace.com',
        source: 'hilo-palace-ical',
        tags: ['hilo', 'palace theater', 'hawaii', 'arts', 'culture'],
      })
    }

    console.log(`[HiloPalaceIcal] ${events.length} upcoming events`)
    return { events, ...(etag ? { etag } : {}) }
  } catch (err) {
    console.error('[HiloPalaceIcal] Error:', err)
    return { events: [] }
  }
}

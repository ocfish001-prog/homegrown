/**
 * National Park Service events integration
 * Source: https://developer.nps.gov/api/v1/events
 *
 * INVESTIGATION FINDINGS (2026-03-26):
 * - DEMO_KEY works, returns 36 events for muwo+pore+goga
 * - Stable ID: `eventid` (numeric string, e.g. "125071")
 * - Events have `datetimecreated` and `datetimeupdated` timestamps
 * - times[] array: { timestart: "03:00 PM", timeend: "04:00 PM" }
 * - Many events are recurring (isrecurring: "true") with recurrencedateend
 * - lat/lng are directly on event objects
 * - sitecode field tells us which park (goga, muwo, pore)
 *
 * INCREMENTAL SYNC:
 * - NPS API doesn't support modified_since filtering
 * - Strategy: fetch all, filter by datetimeupdated > lastSyncedAt
 * - Stable ID: eventid — use for DB upsert deduplication
 * - Expired: skip events where recurrencedateend (or date) < today
 *
 * Env: NPS_API_KEY (fallback: DEMO_KEY — rate limited at 1000/day/IP)
 */
import type { HomegrownEvent } from '../types'
import { isAdultContent } from '../eventbrite'
import type { SyncResult } from '../sync-engine'

const NPS_BASE_URL = 'https://developer.nps.gov/api/v1/events'
const BAY_AREA_PARKS = 'muwo,pore,goga'

const PARK_META: Record<string, { lat: number; lng: number; name: string }> = {
  muwo: { lat: 37.8910, lng: -122.5714, name: 'Muir Woods National Monument' },
  pore: { lat: 38.0580, lng: -122.8069, name: 'Point Reyes National Seashore' },
  goga: { lat: 37.8270, lng: -122.4735, name: 'Golden Gate National Recreation Area' },
}

function getNpsKey(): string {
  return process.env.NPS_API_KEY || 'DEMO_KEY'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNpsTime(ev: any): { dateISO: string | undefined; dateDisplay: string } {
  const dateStr: string = ev.date || ev.datestart || ''
  const timeEntry = ev.times?.[0]
  const timeStr: string = timeEntry?.timestart || ''

  if (!dateStr) return { dateISO: undefined, dateDisplay: 'Date TBD' }

  try {
    // NPS times are in "HH:MM AM/PM" format in park local time
    let iso: string
    if (timeStr) {
      const [timePart, meridiem] = timeStr.split(' ')
      const [hourStr, minStr] = (timePart ?? '').split(':')
      let hour = parseInt(hourStr ?? '0', 10)
      if (meridiem?.toUpperCase() === 'PM' && hour !== 12) hour += 12
      if (meridiem?.toUpperCase() === 'AM' && hour === 12) hour = 0
      const paddedHour = String(hour).padStart(2, '0')
      const paddedMin = String(minStr ?? '00').padStart(2, '0')
      iso = `${dateStr}T${paddedHour}:${paddedMin}:00`
    } else {
      iso = dateStr
    }

    const d = new Date(iso)
    if (isNaN(d.getTime())) return { dateISO: undefined, dateDisplay: dateStr }

    const display = d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      ...(timeStr ? { hour: 'numeric', minute: '2-digit' } : {}),
      timeZone: 'America/Los_Angeles',
    }).replace(',', ' ·')

    return { dateISO: d.toISOString(), dateDisplay: display }
  } catch {
    return { dateISO: undefined, dateDisplay: dateStr }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNpsCategory(ev: any): string {
  const types: string[] = ev.types ?? []
  const title: string = (ev.title ?? '').toLowerCase()
  const combined = `${title} ${types.join(' ')}`.toLowerCase()

  if (combined.includes('junior ranger')) return 'Events'
  if (combined.includes('hike') || combined.includes('walk') || combined.includes('trail')) return 'Field Trips'
  if (combined.includes('talk') || combined.includes('ranger') || combined.includes('campfire')) return 'Events'
  if (combined.includes('workshop') || combined.includes('class')) return 'Workshops'
  if (combined.includes('bird') || combined.includes('wildlife') || combined.includes('nature')) return 'Field Trips'
  if (combined.includes('camp')) return 'Camps'
  return 'Events'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNpsEvent(ev: any): HomegrownEvent | null {
  const eventId: string = ev.eventid || ev.id
  if (!eventId) return null

  const title = typeof ev.title === 'string' ? ev.title.trim() : ''
  if (!title) return null

  const description = stripHtml(ev.description ?? '').slice(0, 600)
  if (isAdultContent(title, description)) return null

  // Check expiry: if recurrencedateend or dateend is in the past, skip
  const endStr: string = ev.recurrencedateend || ev.dateend || ev.datestart || ''
  if (endStr) {
    try {
      const end = new Date(endStr)
      if (!isNaN(end.getTime()) && end < new Date()) return null
    } catch { /* ignore */ }
  }

  const parkCode: string = (ev.sitecode || ev.parkCode || '').toLowerCase().trim()
  const park = PARK_META[parkCode] ?? PARK_META['goga']!

  // Use NPS event lat/lng if available and valid
  const lat = ev.latitude ? parseFloat(ev.latitude) : park.lat
  const lng = ev.longitude ? parseFloat(ev.longitude) : park.lng

  const { dateISO, dateDisplay } = parseNpsTime(ev)

  const url = ev.infourl || ev.registrationurl ||
    `https://www.nps.gov/${parkCode}/planyourvisit/events.htm`

  return {
    id: `nps-${eventId}`,
    title,
    description,
    category: mapNpsCategory(ev),
    date: dateDisplay,
    dateISO,
    location: ev.location || park.name,
    lat: isNaN(lat) ? park.lat : lat,
    lng: isNaN(lng) ? park.lng : lng,
    organizer: `NPS – ${park.name}`,
    price: ev.isfree === 'true' ? 'Free' : 'See site',
    url,
    source: 'nps',
    tags: ['national park', 'outdoor', 'nature', 'ranger', 'bay area', parkCode],
  }
}

export async function fetchNpsEvents(
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  void lastEtag
  const apiKey = getNpsKey()
  const params = new URLSearchParams({
    parkCode: BAY_AREA_PARKS,
    limit: '100',
    api_key: apiKey,
  })

  try {
    const res = await fetch(`${NPS_BASE_URL}?${params}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'HomegrownApp/1.0' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      if (res.status === 429) console.warn('[NPS] Rate limited — DEMO_KEY exhausted. Set NPS_API_KEY env var.')
      else if (res.status === 403) console.warn('[NPS] API key invalid')
      else console.warn(`[NPS] API returned ${res.status}`)
      return { events: [] }
    }

    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawEvents: any[] = data?.data ?? []

    const events: HomegrownEvent[] = []
    let skippedOld = 0

    for (const ev of rawEvents) {
      // Incremental: skip if not updated since last sync
      const updatedAt = ev.datetimeupdated ? new Date(ev.datetimeupdated) : null
      const createdAt = ev.datetimecreated ? new Date(ev.datetimecreated) : null
      const relevantDate = updatedAt ?? createdAt
      if (relevantDate && relevantDate <= lastSyncedAt) { skippedOld++; continue }

      const mapped = mapNpsEvent(ev)
      if (mapped) events.push(mapped)
    }

    console.log(`[NPS] ${events.length} new/updated events (${skippedOld} unchanged since last sync)`)
    return { events }
  } catch (err) {
    console.error('[NPS] Fetch error:', err)
    return { events: [] }
  }
}

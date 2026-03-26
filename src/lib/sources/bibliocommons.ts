/**
 * Bibliocommons library events integration
 * Sources: San Jose Public Library, Oakland Public Library, San Mateo County Library
 *
 * Platform: Bibliocommons React app
 * URL pattern: https://[library].bibliocommons.com/v2/events?audiences=[id]
 *
 * ARCHITECTURE: One parameterized fetcher covers all Bibliocommons libraries.
 *
 * Kid audience IDs (SJPL confirmed):
 *   Children:  5d5f0926be771f2300369397
 *   Pre-Teen:  5d714d6c4464033900bac7c2
 *
 * NOTE: Bibliocommons React app — uses fetch with JSON API behind the scenes.
 * The app loads events via: /api/v2/events?audiences=[id]&locale=en-US
 * We try the JSON API first before falling back to HTML parse.
 */
import type { HomegrownEvent } from '../types'
import type { SyncResult } from '../sync-engine'

export interface BibliocommonsSource {
  name: string
  subdomain: string
  city: string
  lat: number
  lng: number
  source: HomegrownEvent['source']
  organizer: string
}

export const BIBLIOCOMMONS_SOURCES: BibliocommonsSource[] = [
  {
    name: 'San Jose Public Library',
    subdomain: 'sjpl',
    city: 'San Jose, CA',
    lat: 37.3382,
    lng: -121.8863,
    source: 'sjpl-bibliocommons',
    organizer: 'San Jose Public Library',
  },
  {
    name: 'Oakland Public Library',
    subdomain: 'oaklandlibrary',
    city: 'Oakland, CA',
    lat: 37.8044,
    lng: -122.2712,
    source: 'oakland-bibliocommons',
    organizer: 'Oakland Public Library',
  },
  {
    name: 'San Mateo County Library',
    subdomain: 'smcl',
    city: 'San Mateo, CA',
    lat: 37.5630,
    lng: -122.3255,
    source: 'smcl-bibliocommons',
    organizer: 'San Mateo County Library',
  },
]

// Bibliocommons children audience IDs (common across systems)
const AUDIENCE_IDS = [
  '5d5f0926be771f2300369397', // Children
  '5d714d6c4464033900bac7c2', // Pre-Teen
]

function formatDate(d: Date): string {
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
  return `${datePart.replace(',', ' ·')} · ${timePart}`
}

function mapCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()
  if (text.includes('storytime') || text.includes('story time')) return 'Events'
  if (text.includes('steam') || text.includes('stem') || text.includes('science') || text.includes('coding') || text.includes('maker')) return 'Workshops'
  if (text.includes('craft') || text.includes('art')) return 'Arts'
  if (text.includes('music') || text.includes('sing')) return 'Music'
  if (text.includes('homework') || text.includes('tutor') || text.includes('read') || text.includes('literacy')) return 'Workshops'
  return 'Events'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBiblioEvent(ev: any, lib: BibliocommonsSource): HomegrownEvent | null {
  const id: string = ev.id || ev.event_id
  if (!id) return null

  const title: string = ev.title || ev.name || ''
  if (!title) return null

  const description: string = (ev.description || ev.summary || '').slice(0, 600)
  const startStr: string = ev.start_date || ev.startDate || ev.start || ''
  const endStr: string = ev.end_date || ev.endDate || ev.end || ''

  let dateISO: string | undefined
  let dateDisplay = 'Date TBD'

  if (startStr) {
    try {
      const d = new Date(startStr)
      if (!isNaN(d.getTime())) {
        dateISO = d.toISOString()
        dateDisplay = formatDate(d)
        // Skip past events
        if (d < new Date()) return null
      }
    } catch { /* ignore */ }
  }

  const location = ev.branch?.name || ev.location || lib.city
  const url = ev.url || ev.event_url ||
    `https://${lib.subdomain}.bibliocommons.com/v2/events/${id}`

  return {
    id: `${lib.source}-${id}`,
    title,
    description: description || undefined,
    category: mapCategory(title, description),
    date: dateDisplay,
    dateISO,
    endDateISO: endStr ? (() => { try { return new Date(endStr).toISOString() } catch { return undefined } })() : undefined,
    location,
    lat: lib.lat,
    lng: lib.lng,
    organizer: lib.organizer,
    price: 'Free',
    url,
    source: lib.source,
    tags: ['library', 'free', 'kids', 'family', lib.city.toLowerCase().split(',')[0]!, 'bay area'],
  }
}

async function fetchBibliocommonsAPI(lib: BibliocommonsSource): Promise<HomegrownEvent[]> {
  const events: HomegrownEvent[] = []
  const base = `https://${lib.subdomain}.bibliocommons.com`

  for (const audienceId of AUDIENCE_IDS) {
    try {
      // Try the internal JSON API (discovered by browser dev tools inspection)
      const params = new URLSearchParams({
        audiences: audienceId,
        locale: 'en-US',
        size: '50',
      })

      const res = await fetch(`${base}/api/v2/events?${params}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)',
          'X-Requested-With': 'XMLHttpRequest',
        },
        next: { revalidate: 3600 * 4 },
        signal: AbortSignal.timeout(12000),
      })

      if (!res.ok) {
        // Try alternative API path
        const res2 = await fetch(`${base}/v2/events?audiences=${audienceId}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; HomegrownApp/1.0)' },
          next: { revalidate: 3600 * 4 },
          signal: AbortSignal.timeout(8000),
        })
        if (!res2.ok) continue
        const data2 = await res2.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw2: any[] = data2?.entities?.events ? Object.values(data2.entities.events) : (data2?.events ?? data2?.data ?? [])
        for (const ev of raw2) {
          const mapped = mapBiblioEvent(ev, lib)
          if (mapped) events.push(mapped)
        }
        continue
      }

      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawEvents: any[] = data?.entities?.events
        ? Object.values(data.entities.events)
        : (data?.events ?? data?.data ?? [])

      for (const ev of rawEvents) {
        const mapped = mapBiblioEvent(ev, lib)
        if (mapped) events.push(mapped)
      }
    } catch (err) {
      console.warn(`[${lib.name}] API fetch error for audience ${audienceId}:`, err)
    }
  }

  return events
}

export async function fetchBibliocommonsSource(
  lib: BibliocommonsSource,
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  void lastSyncedAt
  void lastEtag
  try {
    const events = await fetchBibliocommonsAPI(lib)
    console.log(`[${lib.name}] ${events.length} upcoming kids/family events`)
    return { events }
  } catch (err) {
    console.error(`[${lib.name}] Error:`, err)
    return { events: [] }
  }
}

// Individual exported functions for API route + cron
export async function fetchSJPLBiblioEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchBibliocommonsSource(BIBLIOCOMMONS_SOURCES[0]!, lastSyncedAt, lastEtag)
}

export async function fetchOaklandLibraryEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchBibliocommonsSource(BIBLIOCOMMONS_SOURCES[1]!, lastSyncedAt, lastEtag)
}

export async function fetchSMCLBiblioEvents(lastSyncedAt: Date, lastEtag: string | null): Promise<SyncResult> {
  return fetchBibliocommonsSource(BIBLIOCOMMONS_SOURCES[2]!, lastSyncedAt, lastEtag)
}

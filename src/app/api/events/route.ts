/**
 * GET /api/events
 *
 * Aggregates real event data from multiple sources.
 * New sources (funcheap, nps, ebparks, bayareakidfun, cahomeschool) use the
 * incremental sync engine — they accept (lastSyncedAt, lastEtag) and return
 * only new/changed events. The sync engine handles DB upsert + state tracking.
 *
 * Query params:
 *   lat, lng, radius (miles), category, q (search), source
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchEventbriteEvents } from '@/lib/eventbrite'
import { fetchSFPLEvents } from '@/lib/sfpl'
import { fetchSFPLEventsImproved } from '@/lib/sources/sfpl-improved'
import { fetchSMCLEvents } from '@/lib/sources/smcl'
import { fetchSFZooEvents } from '@/lib/sources/sfzoo'
import { fetchCalAcademyEvents } from '@/lib/sources/calacademy'
import { fetch4HEvents } from '@/lib/sources/four-h'
import { fetchSFFunEvents } from '@/lib/sources/sffun'
import { fetchFuncheapEvents } from '@/lib/sources/funcheap'
import { fetchNpsEvents } from '@/lib/sources/nps'
import { fetchEastBayParksEvents } from '@/lib/sources/ebparks'
import { fetchBayAreaKidFunEvents } from '@/lib/sources/bayareakidfun'
import { fetchCAHomeschoolEvents } from '@/lib/sources/cahomeschool'
import { runSourceSync, getLastSync } from '@/lib/sync-engine'
import { haversineDistance } from '@/lib/distance'
import type { HomegrownEvent, EventsApiResponse } from '@/lib/types'
import { DEFAULT_LOCATION } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LegacySourceResult = {
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}

const emptyResult = (): Promise<LegacySourceResult> =>
  Promise.resolve({ events: [] as HomegrownEvent[] })

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const lat = parseFloat(searchParams.get('lat') ?? String(DEFAULT_LOCATION.lat))
    const lng = parseFloat(searchParams.get('lng') ?? String(DEFAULT_LOCATION.lng))
    const radius = parseInt(searchParams.get('radius') ?? String(DEFAULT_LOCATION.radius), 10)
    const category = searchParams.get('category') ?? 'All'
    const q = searchParams.get('q') ?? ''
    const sourceFilter = searchParams.get('source') ?? 'all'

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json({ error: 'Invalid location parameters' }, { status: 400 })
    }

    const want = (name: string) => sourceFilter === 'all' || sourceFilter === name

    // ─── Legacy sources (original signature, no incremental sync yet) ───────
    const [
      eventbriteResult,
      sfplResult,
      sfplImprovedResult,
      smclResult,
      sfzooResult,
      calAcademyResult,
      fourHResult,
      sffunResult,
    ] = await Promise.all([
      want('eventbrite') ? fetchEventbriteEvents(lat, lng, radius) : emptyResult(),
      want('sfpl')       ? fetchSFPLEvents()                        : emptyResult(),
      want('sfpl')       ? fetchSFPLEventsImproved()                : emptyResult(),
      want('smcl')       ? fetchSMCLEvents()                        : emptyResult(),
      want('sfzoo')      ? fetchSFZooEvents()                       : emptyResult(),
      want('calacademy') ? fetchCalAcademyEvents()                  : emptyResult(),
      want('4h')         ? fetch4HEvents()                          : emptyResult(),
      want('sffun')      ? fetchSFFunEvents()                       : emptyResult(),
    ])

    // ─── New sources — incremental sync engine ────────────────────────────────
    // Fetch sync state for all new sources in parallel
    const [funcheapSync, npsSync, ebparksSync, bayAreaKidFunSync, caHomeschoolSync] =
      await Promise.all([
        want('funcheap')      ? getLastSync('funcheap')      : null,
        want('nps')           ? getLastSync('nps')           : null,
        want('ebparks')       ? getLastSync('ebparks')       : null,
        want('bayareakidfun') ? getLastSync('bayareakidfun') : null,
        want('cahomeschool')  ? getLastSync('cahomeschool')  : null,
      ])

    const epoch = { lastSyncedAt: new Date('2000-01-01'), lastEtag: null }

    const [funcheapSyncResult, npsSyncResult, ebparksSyncResult, bayAreaKidFunSyncResult, caHomeschoolSyncResult] =
      await Promise.all([
        funcheapSync
          ? runSourceSync('funcheap', (ls, et) => fetchFuncheapEvents(ls, et))
          : { events: [] as HomegrownEvent[], report: null },
        npsSync
          ? runSourceSync('nps', (ls, et) => fetchNpsEvents(ls, et))
          : { events: [] as HomegrownEvent[], report: null },
        ebparksSync
          ? runSourceSync('ebparks', (ls, et) => fetchEastBayParksEvents(ls, et))
          : { events: [] as HomegrownEvent[], report: null },
        bayAreaKidFunSync
          ? runSourceSync('bayareakidfun', (ls, et) => fetchBayAreaKidFunEvents(ls, et))
          : { events: [] as HomegrownEvent[], report: null },
        caHomeschoolSync
          ? runSourceSync('cahomeschool', (ls, et) => fetchCAHomeschoolEvents(ls, et))
          : { events: [] as HomegrownEvent[], report: null },
      ])

    // Suppress unused variable warning
    void epoch

    // Merge SFPL sources, deduplicate by title+date
    const sfplEvents = deduplicateByTitleDate([
      ...sfplResult.events,
      ...sfplImprovedResult.events,
    ])

    // Combine all events
    let allEvents: HomegrownEvent[] = [
      ...eventbriteResult.events,
      ...sfplEvents,
      ...smclResult.events,
      ...sfzooResult.events,
      ...calAcademyResult.events,
      ...fourHResult.events,
      ...sffunResult.events,
      ...funcheapSyncResult.events,
      ...npsSyncResult.events,
      ...ebparksSyncResult.events,
      ...bayAreaKidFunSyncResult.events,
      ...caHomeschoolSyncResult.events,
    ]

    // Attach distance for events with coordinates
    allEvents = allEvents.map((ev) => {
      if (ev.lat != null && ev.lng != null) {
        return { ...ev, distance: haversineDistance(lat, lng, ev.lat, ev.lng) }
      }
      return ev
    })

    // Filter by radius (only for events with coords)
    allEvents = allEvents.filter((ev) =>
      ev.distance == null ? true : ev.distance <= radius
    )

    // Filter by category
    if (category !== 'All') {
      allEvents = allEvents.filter((ev) => ev.category === category)
    }

    // Filter by search query
    if (q.trim()) {
      const lower = q.toLowerCase()
      allEvents = allEvents.filter(
        (ev) =>
          ev.title.toLowerCase().includes(lower) ||
          ev.description?.toLowerCase().includes(lower) ||
          ev.organizer?.toLowerCase().includes(lower) ||
          ev.location.toLowerCase().includes(lower)
      )
    }

    // Sort by date, then by distance
    allEvents.sort((a, b) => {
      const dateA = a.dateISO ? new Date(a.dateISO).getTime() : Infinity
      const dateB = b.dateISO ? new Date(b.dateISO).getTime() : Infinity
      if (dateA !== dateB) return dateA - dateB
      return (a.distance ?? 999) - (b.distance ?? 999)
    })

    // Collect setup messages from legacy sources
    const setupMessages = [
      eventbriteResult, sfplResult, sfplImprovedResult,
      smclResult, sfzooResult, calAcademyResult, fourHResult, sffunResult,
    ]
      .filter((r) => r.requiresSetup && r.setupMessage)
      .map((r) => r.setupMessage!)

    const response: EventsApiResponse = {
      events: allEvents,
      total: allEvents.length,
      source: 'aggregated',
      ...(setupMessages.length > 0 && {
        requiresSetup: true,
        setupMessage: setupMessages.join(' | '),
      }),
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (err) {
    console.error('[/api/events] Unhandled error:', err)
    return NextResponse.json(
      { events: [], total: 0, source: 'error', error: 'Something went wrong loading events' },
      { status: 500 }
    )
  }
}

function deduplicateByTitleDate(events: HomegrownEvent[]): HomegrownEvent[] {
  const seen = new Set<string>()
  return events.filter((ev) => {
    const key = `${ev.title.toLowerCase().trim()}__${ev.dateISO ?? ev.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

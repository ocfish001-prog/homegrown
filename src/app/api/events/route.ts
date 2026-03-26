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
import { fetchSupabaseEvents } from '@/lib/supabase/events'
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
import { fetchContraCostaIcalEvents } from '@/lib/sources/contra-costa-ical'
import { fetchEventbriteSFBayEvents } from '@/lib/sources/eventbrite-sfbay'
import { fetchChabotIcalEvents, fetchLindsayIcalEvents, fetchBADMIcalEvents, fetchCHNIcalEvents } from '@/lib/sources/wordpress-ical'
import { fetchSJPLBiblioEvents, fetchOaklandLibraryEvents, fetchSMCLBiblioEvents } from '@/lib/sources/bibliocommons'
import { fetchHiloPalaceIcalEvents } from '@/lib/sources/hilo-palace-ical'
import { runSourceSync, getLastSync } from '@/lib/sync-engine'
import { haversineDistance } from '@/lib/distance'
import { classifyEventAgeRanges } from '@/lib/age-range'
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
    const ageRangeFilter = searchParams.get('ageRange') ?? 'All'
    const dateFilter = searchParams.get('dateFilter') ?? 'all'
    // Region param: 'hawaii' | 'sfbay' | null (null = no filter)
    const regionParam = searchParams.get('region') ?? null

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return NextResponse.json({ error: 'Invalid location parameters' }, { status: 400 })
    }

    const want = (name: string) => sourceFilter === 'all' || sourceFilter === name
    // SF Bay live sources must not run when region=hawaii (they return events without
    // lat/lng which bypass the radius filter, causing cross-region bleed).
    const isSFBay = regionParam !== 'hawaii'
    const wantSFBay = (name: string) => isSFBay && want(name)

    // ─── Supabase — seeded/curated events ─────────────────────────────────────
    // Hawaii uses source='hawaii-manual' to isolate Hawaii-only events.
    // SF Bay (and all others) use lat/lng radius filtering — no source filter needed,
    // since all sfbay sources (nps, funcheap, ebparks, contra-costa-ical, etc.) are
    // geographically scoped by coordinates anyway.
    const supabaseSourceFilter: string | null =
      regionParam === 'hawaii' ? 'hawaii-manual' : null

    const supabaseResult = want('supabase') || sourceFilter === 'all'
      ? await fetchSupabaseEvents(supabaseSourceFilter)
      : { events: [] as HomegrownEvent[] }

    // ─── Legacy sources (original signature, no incremental sync yet) ───────
    // All legacy sources are SF Bay only — gate with wantSFBay to prevent
    // cross-region bleed when Hawaii is selected.
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
      wantSFBay('eventbrite') ? fetchEventbriteEvents(lat, lng, radius) : emptyResult(),
      wantSFBay('sfpl')       ? fetchSFPLEvents()                        : emptyResult(),
      wantSFBay('sfpl')       ? fetchSFPLEventsImproved()                : emptyResult(),
      wantSFBay('smcl')       ? fetchSMCLEvents()                        : emptyResult(),
      wantSFBay('sfzoo')      ? fetchSFZooEvents()                       : emptyResult(),
      wantSFBay('calacademy') ? fetchCalAcademyEvents()                  : emptyResult(),
      wantSFBay('4h')         ? fetch4HEvents()                          : emptyResult(),
      wantSFBay('sffun')      ? fetchSFFunEvents()                       : emptyResult(),
    ])

    // ─── New sources — incremental sync engine ────────────────────────────────
    // Fetch sync state for all new sources in parallel
    const [
      funcheapSync, npsSync, ebparksSync, bayAreaKidFunSync, caHomeschoolSync,
      contraCostaSync, eventbriteSFBaySync,
      chabotSync, lindsaySync, badmSync, chnSync,
      sjplSync, oaklandLibSync, smclBiblioSync,
      hiloPalaceSync,
    ] = await Promise.all([
      // SF Bay only sources — gated with wantSFBay
      wantSFBay('funcheap')             ? getLastSync('funcheap')             : null,
      wantSFBay('nps')                  ? getLastSync('nps')                  : null,
      wantSFBay('ebparks')              ? getLastSync('ebparks')              : null,
      wantSFBay('bayareakidfun')        ? getLastSync('bayareakidfun')        : null,
      wantSFBay('cahomeschool')         ? getLastSync('cahomeschool')         : null,
      wantSFBay('contra-costa-ical')    ? getLastSync('contra-costa-ical')    : null,
      wantSFBay('eventbrite-sfbay')     ? getLastSync('eventbrite-sfbay')     : null,
      wantSFBay('chabot-ical')          ? getLastSync('chabot-ical')          : null,
      wantSFBay('lindsay-ical')         ? getLastSync('lindsay-ical')         : null,
      wantSFBay('badm-ical')            ? getLastSync('badm-ical')            : null,
      wantSFBay('chn-ical')             ? getLastSync('chn-ical')             : null,
      wantSFBay('sjpl-bibliocommons')   ? getLastSync('sjpl-bibliocommons')   : null,
      wantSFBay('oakland-bibliocommons')? getLastSync('oakland-bibliocommons'): null,
      wantSFBay('smcl-bibliocommons')   ? getLastSync('smcl-bibliocommons')   : null,
      // Hawaii sources — only run when region=hawaii
      (want('hilo-palace-ical') && regionParam === 'hawaii') ? getLastSync('hilo-palace-ical') : null,
    ])

    const empty = { events: [] as HomegrownEvent[], report: null }

    const [
      funcheapSyncResult, npsSyncResult, ebparksSyncResult,
      bayAreaKidFunSyncResult, caHomeschoolSyncResult,
      contraCostaResult, eventbriteSFBayResult,
      chabotResult, lindsayResult, badmResult, chnResult,
      sjplResult2, oaklandLibResult, smclBiblioResult,
      hiloPalaceResult,
    ] = await Promise.all([
      funcheapSync
        ? runSourceSync('funcheap', (ls, et) => fetchFuncheapEvents(ls, et))
        : empty,
      npsSync
        ? runSourceSync('nps', (ls, et) => fetchNpsEvents(ls, et))
        : empty,
      ebparksSync
        ? runSourceSync('ebparks', (ls, et) => fetchEastBayParksEvents(ls, et))
        : empty,
      bayAreaKidFunSync
        ? runSourceSync('bayareakidfun', (ls, et) => fetchBayAreaKidFunEvents(ls, et))
        : empty,
      caHomeschoolSync
        ? runSourceSync('cahomeschool', (ls, et) => fetchCAHomeschoolEvents(ls, et))
        : empty,
      contraCostaSync
        ? runSourceSync('contra-costa-ical', (ls, et) => fetchContraCostaIcalEvents(ls, et))
        : empty,
      eventbriteSFBaySync
        ? runSourceSync('eventbrite-sfbay', (ls, et) => fetchEventbriteSFBayEvents(ls, et))
        : empty,
      chabotSync
        ? runSourceSync('chabot-ical', (ls, et) => fetchChabotIcalEvents(ls, et))
        : empty,
      lindsaySync
        ? runSourceSync('lindsay-ical', (ls, et) => fetchLindsayIcalEvents(ls, et))
        : empty,
      badmSync
        ? runSourceSync('badm-ical', (ls, et) => fetchBADMIcalEvents(ls, et))
        : empty,
      chnSync
        ? runSourceSync('chn-ical', (ls, et) => fetchCHNIcalEvents(ls, et))
        : empty,
      sjplSync
        ? runSourceSync('sjpl-bibliocommons', (ls, et) => fetchSJPLBiblioEvents(ls, et))
        : empty,
      oaklandLibSync
        ? runSourceSync('oakland-bibliocommons', (ls, et) => fetchOaklandLibraryEvents(ls, et))
        : empty,
      smclBiblioSync
        ? runSourceSync('smcl-bibliocommons', (ls, et) => fetchSMCLBiblioEvents(ls, et))
        : empty,
      hiloPalaceSync
        ? runSourceSync('hilo-palace-ical', (ls, et) => fetchHiloPalaceIcalEvents(ls, et))
        : empty,
    ])

    // Merge SFPL sources, deduplicate by title+date
    const sfplEvents = deduplicateByTitleDate([
      ...sfplResult.events,
      ...sfplImprovedResult.events,
    ])

    // Combine all events
    let allEvents: HomegrownEvent[] = [
      ...supabaseResult.events,
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
      ...contraCostaResult.events,
      ...eventbriteSFBayResult.events,
      ...chabotResult.events,
      ...lindsayResult.events,
      ...badmResult.events,
      ...chnResult.events,
      ...sjplResult2.events,
      ...oaklandLibResult.events,
      ...smclBiblioResult.events,
      ...hiloPalaceResult.events,
    ]

    // Classify age ranges for all events
    allEvents = classifyEventAgeRanges(allEvents)

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

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      allEvents = allEvents.filter((ev) => {
        if (!ev.dateISO) return true // keep events without a date
        const d = new Date(ev.dateISO)
        if (dateFilter === 'today') {
          return d.toDateString() === now.toDateString()
        }
        if (dateFilter === 'weekend') {
          // This Friday through Sunday (or next weekend if past Sunday)
          const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
          const daysUntilFri = (5 - dayOfWeek + 7) % 7
          const fri = new Date(now)
          fri.setDate(now.getDate() + daysUntilFri)
          fri.setHours(0, 0, 0, 0)
          const mon = new Date(fri)
          mon.setDate(fri.getDate() + 3)
          return d >= fri && d < mon
        }
        if (dateFilter === 'week') {
          const weekEnd = new Date(now)
          weekEnd.setDate(now.getDate() + 7)
          return d >= now && d <= weekEnd
        }
        if (dateFilter === 'month') {
          const monthEnd = new Date(now)
          monthEnd.setDate(now.getDate() + 30)
          return d >= now && d <= monthEnd
        }
        return true
      })
    }

    // Filter by category
    if (category !== 'All') {
      allEvents = allEvents.filter((ev) => ev.category === category)
    }

    // Filter by age range
    if (ageRangeFilter !== 'All') {
      allEvents = allEvents.filter((ev) =>
        // Keep events that match the filter, or have no age range classified (don't exclude unclassified)
        ev.ageRange === ageRangeFilter || ev.ageRange == null
      )
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
        // No CDN caching — each request fetches fresh from sources.
        // Next.js revalidate is set per-fetch() call in each source.
        'Cache-Control': 'no-store',
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

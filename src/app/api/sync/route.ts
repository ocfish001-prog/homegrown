/**
 * POST /api/sync
 *
 * Daily sync endpoint — fetches all live sources and upserts new/updated events to Supabase.
 * Called by Netlify scheduled functions or external cron (e.g. cron-job.org).
 *
 * Auth: Bearer token via SYNC_SECRET env var (or open if not set, for dev)
 *
 * Usage:
 *   curl -X POST https://homegrown.app/api/sync \
 *     -H "Authorization: Bearer <SYNC_SECRET>"
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { fetchNpsEvents } from '@/lib/sources/nps'
import { fetchFuncheapEvents } from '@/lib/sources/funcheap'
import { fetchEastBayParksEvents } from '@/lib/sources/ebparks'
import { fetchCAHomeschoolEvents } from '@/lib/sources/cahomeschool'
import { fetchBayAreaKidFunEvents } from '@/lib/sources/bayareakidfun'
import { fetchContraCostaIcalEvents } from '@/lib/sources/contra-costa-ical'
import { fetchEventbriteSFBayEvents } from '@/lib/sources/eventbrite-sfbay'
import { fetchChabotIcalEvents, fetchLindsayIcalEvents, fetchBADMIcalEvents, fetchCHNIcalEvents } from '@/lib/sources/wordpress-ical'
import { fetchSJPLBiblioEvents, fetchOaklandLibraryEvents, fetchSMCLBiblioEvents } from '@/lib/sources/bibliocommons'
import { fetchHiloPalaceIcalEvents } from '@/lib/sources/hilo-palace-ical'
import type { HomegrownEvent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Netlify max for sync functions

interface SourceRunner {
  name: string
  fetch: (lastSyncedAt: Date, lastEtag: string | null) => Promise<{ events: HomegrownEvent[]; etag?: string }>
}

const SOURCES: SourceRunner[] = [
  { name: 'nps', fetch: fetchNpsEvents },
  { name: 'funcheap', fetch: fetchFuncheapEvents },
  { name: 'ebparks', fetch: fetchEastBayParksEvents },
  { name: 'cahomeschool', fetch: fetchCAHomeschoolEvents },
  { name: 'bayareakidfun', fetch: fetchBayAreaKidFunEvents },
  { name: 'contra-costa-ical', fetch: fetchContraCostaIcalEvents },
  { name: 'eventbrite-sfbay', fetch: fetchEventbriteSFBayEvents },
  { name: 'chabot-ical', fetch: fetchChabotIcalEvents },
  { name: 'lindsay-ical', fetch: fetchLindsayIcalEvents },
  { name: 'badm-ical', fetch: fetchBADMIcalEvents },
  { name: 'chn-ical', fetch: fetchCHNIcalEvents },
  { name: 'sjpl-bibliocommons', fetch: fetchSJPLBiblioEvents },
  { name: 'oakland-bibliocommons', fetch: fetchOaklandLibraryEvents },
  { name: 'smcl-bibliocommons', fetch: fetchSMCLBiblioEvents },
  // Hawaii sources
  { name: 'hilo-palace-ical', fetch: fetchHiloPalaceIcalEvents },
]

async function upsertEvents(supabase: ReturnType<typeof createServerClient>, events: HomegrownEvent[]): Promise<number> {
  if (!events.length) return 0

  // Get default venue
  const DEFAULT_VENUE_ID = 'venue-sfbay-default'

  const rows = events.map(ev => ({
    id: ev.id,
    externalId: ev.id,
    source: ev.source,
    title: ev.title,
    description: ev.description || null,
    startDate: ev.dateISO || new Date().toISOString(),
    endDate: ev.endDateISO || null,
    isFree: ev.price === 'Free',
    cost: ev.price || null,
    imageUrl: ev.imageUrl || null,
    externalUrl: ev.url || 'https://homegrown.app',
    ageRange: ev.ageRange || 'all_ages',
    relevanceScore: 75,
    isApproved: true,
    venueId: DEFAULT_VENUE_ID,
    updatedAt: new Date().toISOString(),
  }))

  // Upsert in batches of 50
  let upserted = 0
  const BATCH = 50
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('events')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

    if (!error) upserted += batch.length
    else console.error(`[Sync] Upsert error:`, error.message)
  }
  return upserted
}

export async function POST(req: NextRequest) {
  // Auth check
  const syncSecret = process.env.SYNC_SECRET
  if (syncSecret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${syncSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServerClient()
  const epoch = new Date('2000-01-01')
  const results: Record<string, { events: number; status: string }> = {}

  // Ensure default sfbay venue exists
  await supabase.from('venues').upsert({
    id: 'venue-sfbay-default',
    name: 'SF Bay Area',
    city: 'San Francisco',
    state: 'CA',
    lat: 37.7749,
    lng: -122.4194,
  }, { onConflict: 'id', ignoreDuplicates: true })

  for (const source of SOURCES) {
    try {
      const result = await source.fetch(epoch, null)
      const upserted = await upsertEvents(supabase, result.events)
      results[source.name] = { events: upserted, status: 'ok' }
      console.log(`[Sync] ${source.name}: ${upserted} events upserted`)
    } catch (err) {
      results[source.name] = { events: 0, status: String(err) }
      console.error(`[Sync] ${source.name} error:`, err)
    }
  }

  const totalEvents = Object.values(results).reduce((sum, r) => sum + r.events, 0)

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    totalEvents,
    sources: results,
  })
}

// Allow GET for healthcheck (no auth required)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Sync endpoint ready. POST with Authorization: Bearer <SYNC_SECRET> to run.',
    sources: SOURCES.map(s => s.name),
  })
}

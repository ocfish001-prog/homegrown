/**
 * GET /api/events/[id]
 * Fetch a single event by ID
 * ID format: "eb-{eventbrite_id}" | "supabase-{uuid}" | any id (falls through to Supabase)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import type { HomegrownEvent, AgeRange } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} · ${timePart}`
}

function mapAgeRange(raw: string | null | undefined): AgeRange | undefined {
  if (!raw) return undefined
  const valid: AgeRange[] = ['young_kids', 'older_kids', 'all_ages', 'family']
  return valid.includes(raw as AgeRange) ? (raw as AgeRange) : undefined
}

async function fetchEventbriteById(id: string): Promise<HomegrownEvent | null> {
  const apiKey = process.env.EVENTBRITE_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/${id}/?expand=venue,organizer,ticket_availability`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return null
    const eb = await res.json()
    const { mapEventbriteEvent } = await import('@/lib/eventbrite')
    return mapEventbriteEvent(eb)
  } catch {
    return null
  }
}

async function fetchSupabaseById(id: string): Promise<HomegrownEvent | null> {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, source, title, description,
        startDate, endDate,
        isFree, cost, imageUrl, externalUrl,
        ageRange, isApproved,
        venues (id, name, address, city, lat, lng)
      `)
      .eq('id', id)
      .single()

    if (error || !data) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any
    const rawVenues = row.venues
    const venue = Array.isArray(rawVenues) ? (rawVenues[0] ?? null) : (rawVenues ?? null)

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      category: 'Events',
      date: formatDate(row.startDate),
      dateISO: row.startDate,
      endDateISO: row.endDate ?? undefined,
      location: venue?.name ?? venue?.city ?? 'Hawaii',
      address: venue?.address ?? undefined,
      lat: venue?.lat ? Number(venue.lat) : undefined,
      lng: venue?.lng ? Number(venue.lng) : undefined,
      organizer: undefined,
      imageUrl: row.imageUrl ?? undefined,
      price: row.isFree ? 'Free' : (row.cost ?? undefined),
      url: row.externalUrl,
      source: (row.source as HomegrownEvent['source']) ?? 'manual',
      ageRange: mapAgeRange(row.ageRange),
    }
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    // Try Eventbrite first for eb- prefixed IDs
    if (id.startsWith('eb-')) {
      const ebId = id.replace('eb-', '')
      const event = await fetchEventbriteById(ebId)
      if (event) return NextResponse.json(event)
    }

    // Try Supabase for all IDs (works for hawaii-manual, supabase-*, etc.)
    const supabaseEvent = await fetchSupabaseById(id)
    if (supabaseEvent) return NextResponse.json(supabaseEvent)

    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  } catch (err) {
    console.error('[/api/events/[id]] Error:', err)
    return NextResponse.json({ error: 'Could not load event' }, { status: 500 })
  }
}

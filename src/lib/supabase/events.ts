/**
 * Fetch events from Supabase — server-side only.
 * Returns events in HomegrownEvent format.
 * Uses service role key so it works even before RLS is fully configured.
 */
import { createServerClient } from './client'
import type { HomegrownEvent, AgeRange } from '../types'

interface SupabaseVenue {
  id: string
  name: string
  address: string | null
  city: string | null
  lat: number | null
  lng: number | null
}

/** Shape of an events row in Supabase */
interface SupabaseEventRow {
  id: string
  source: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  isFree: boolean
  cost: string | null
  imageUrl: string | null
  externalUrl: string
  ageRange: string | null
  isApproved: boolean
  // Supabase returns joined tables as arrays
  venues: SupabaseVenue[] | SupabaseVenue | null
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function mapAgeRange(raw: string | null): AgeRange | undefined {
  if (!raw) return undefined
  const valid: AgeRange[] = ['young_kids', 'older_kids', 'all_ages', 'family']
  return valid.includes(raw as AgeRange) ? (raw as AgeRange) : undefined
}

export async function fetchSupabaseEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
}> {
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
      .eq('isApproved', true)
      .gte('startDate', new Date().toISOString())
      .order('startDate', { ascending: true })
      .limit(100)

    if (error) {
      console.error('[Supabase] fetch events error:', error.message)
      return { events: [], error: error.message }
    }

    const rows = (data ?? []) as unknown as SupabaseEventRow[]

    const events: HomegrownEvent[] = rows.map((row) => {
      // venues can be array or single object depending on join type
      const rawVenues = row.venues
      const venue: SupabaseVenue | null = Array.isArray(rawVenues)
        ? (rawVenues[0] ?? null)
        : (rawVenues ?? null)
      return {
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        category: 'Events', // default category; categories table join TBD
        date: formatDate(row.startDate),
        dateISO: row.startDate,
        endDateISO: row.endDate ?? undefined,
        location: venue?.name ?? venue?.city ?? 'Bay Area, CA',
        address: venue?.address ?? undefined,
        lat: venue?.lat ? Number(venue.lat) : undefined,
        lng: venue?.lng ? Number(venue.lng) : undefined,
        organizer: undefined,
        imageUrl: row.imageUrl ?? undefined,
        price: row.isFree ? 'Free' : (row.cost ?? undefined),
        url: row.externalUrl,
        source: 'manual',
        ageRange: mapAgeRange(row.ageRange),
      }
    })

    return { events }
  } catch (err) {
    console.error('[Supabase] unexpected error:', err)
    return { events: [], error: String(err) }
  }
}

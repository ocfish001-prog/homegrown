/**
 * Core event types for Homegrown Phase 2
 * All real data — no fake/placeholder events
 */

/**
 * Age range classification for events.
 * Used to filter and tag events by suitability.
 *
 * - young_kids: ages 0–7 (storytime, sensory play, petting zoos)
 * - older_kids: ages 8–14 (STEM, hiking, teen programs)
 * - all_ages: explicitly suitable for all ages
 * - family: family-oriented, may require adult supervision or older kids
 */
export type AgeRange = 'young_kids' | 'older_kids' | 'all_ages' | 'family'

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  young_kids: 'Young Kids (0–7)',
  older_kids: 'Older Kids (8–14)',
  all_ages: 'All Ages',
  family: 'Family',
}

export interface HomegrownEvent {
  id: string
  title: string
  description?: string
  category: string
  date: string // Human-readable: "Sat Apr 5 · 10:00 AM"
  dateISO?: string // ISO 8601 for calendar/sorting
  endDateISO?: string
  location: string
  address?: string
  lat?: number
  lng?: number
  distance?: number // miles from user
  organizer?: string
  imageUrl?: string
  price?: string // e.g. "Free", "$15", "$10–$25"
  url?: string // Link to original event
  source: 'eventbrite' | 'sfpl' | 'smcl' | 'sfzoo' | 'calacademy' | '4h' | 'sffun' | 'meetup' | 'manual' | 'hawaii-manual' | 'funcheap' | 'nps' | 'ebparks' | 'bayareakidfun' | 'cahomeschool' | 'contra-costa-ical' | 'eventbrite-sfbay' | 'chabot-ical' | 'lindsay-ical' | 'badm-ical' | 'chn-ical' | 'sjpl-bibliocommons' | 'oakland-bibliocommons' | 'smcl-bibliocommons' | 'hilo-palace-ical'
  isSaved?: boolean
  tags?: string[]
  ageRange?: AgeRange
}

export interface EventsApiResponse {
  events: HomegrownEvent[]
  total: number
  source: string
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}

export interface LocationState {
  lat: number
  lng: number
  label: string
  radius: number // miles
}

export const DEFAULT_LOCATION: LocationState = {
  lat: 19.8968,
  lng: -155.5828,
  label: 'Big Island, Hawaii',
  radius: 25,
}

export const RADIUS_OPTIONS = [5, 10, 25, 50] as const
export type RadiusOption = typeof RADIUS_OPTIONS[number]

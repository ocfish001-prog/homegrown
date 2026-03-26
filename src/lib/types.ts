/**
 * Core event types for Homegrown Phase 2
 * All real data — no fake/placeholder events
 */

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
  source: 'eventbrite' | 'sfpl' | 'smcl' | 'sfzoo' | 'calacademy' | '4h' | 'sffun' | 'meetup' | 'manual' | 'funcheap' | 'nps' | 'ebparks' | 'bayareakidfun' | 'cahomeschool'
  isSaved?: boolean
  tags?: string[]
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
  lat: 37.7749,
  lng: -122.4194,
  label: 'SF Bay Area',
  radius: 25,
}

export const RADIUS_OPTIONS = [5, 10, 25, 50] as const
export type RadiusOption = typeof RADIUS_OPTIONS[number]

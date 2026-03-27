/**
 * SF Public Library events integration
 * Attempts to use SFPL's public events feed
 * Falls back to empty state with CTA
 */
import type { HomegrownEvent } from './types'

// SFPL library coordinates (main branch)
const SFPL_MAIN_LAT = 37.7786
const SFPL_MAIN_LNG = -122.4158

interface SFPLEvent {
  id?: string
  title?: string
  name?: string
  description?: string
  body?: string
  start?: string
  start_date?: string
  end?: string
  location?: string
  branch?: string
  category?: string
  audience?: string
  url?: string
  image?: string
}

function parseSFPLDate(dateStr?: string): string {
  if (!dateStr) return 'Date TBD'
  try {
    const d = new Date(dateStr)
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
    }
    return d.toLocaleDateString('en-US', opts).replace(',', ' \u00B7')
  } catch {
    return dateStr
  }
}

function mapSFPLCategory(cat?: string, audience?: string): string {
  if (!cat && !audience) return 'Classes'
  const text = `${cat ?? ''} ${audience ?? ''}`.toLowerCase()
  if (text.includes('children') || text.includes('kids') || text.includes('teen')) return 'Classes'
  if (text.includes('story') || text.includes('read')) return 'Workshops'
  if (text.includes('craft') || text.includes('art')) return 'Arts'
  if (text.includes('family')) return 'Events'
  return 'Events'
}

function mapSFPLEvent(ev: SFPLEvent, index: number): HomegrownEvent {
  const title = ev.title ?? ev.name ?? 'Library Event'
  const dateStr = ev.start ?? ev.start_date
  return {
    id: `sfpl-${ev.id ?? index}`,
    title,
    description: ev.description ?? ev.body,
    category: mapSFPLCategory(ev.category, ev.audience),
    date: parseSFPLDate(dateStr),
    dateISO: dateStr,
    endDateISO: ev.end,
    location: ev.location ?? ev.branch ?? 'SF Public Library',
    lat: SFPL_MAIN_LAT,
    lng: SFPL_MAIN_LNG,
    organizer: 'San Francisco Public Library',
    imageUrl: ev.image,
    price: 'Free',
    url: ev.url ?? 'https://sfpl.org/events',
    source: 'sfpl',
  }
}

export async function fetchSFPLEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  // Try SFPL's public Drupal JSON API
  // SFPL uses a Drupal-based site; the events endpoint may vary
  const endpoints = [
    'https://sfpl.org/events?_format=json',
    'https://sfpl.org/api/events',
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 }, // 1 hour cache
        signal: AbortSignal.timeout(5000), // 5s timeout
      })

      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? ''
        if (contentType.includes('json')) {
          const data = await res.json()
          const rawEvents: SFPLEvent[] = Array.isArray(data) ? data : data.events ?? []
          if (rawEvents.length > 0) {
            return { events: rawEvents.slice(0, 30).map(mapSFPLEvent) }
          }
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  // SFPL API not accessible — return empty state with CTA
  return {
    events: [],
    requiresSetup: true,
    setupMessage:
      'SF Public Library events are coming soon. Visit sfpl.org/events to browse directly.',
  }
}

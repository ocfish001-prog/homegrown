/**
 * GET /api/events/[id]
 * Fetch a single event by ID
 * ID format: "eb-{eventbrite_id}" or "sfpl-{sfpl_id}"
 */
import { NextRequest, NextResponse } from 'next/server'
import type { HomegrownEvent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    if (id.startsWith('eb-')) {
      const ebId = id.replace('eb-', '')
      const event = await fetchEventbriteById(ebId)
      if (event) {
        return NextResponse.json(event)
      }
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // For other sources, fall back to the events list
    // (in a full implementation this would query a DB)
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  } catch (err) {
    console.error('[/api/events/[id]] Error:', err)
    return NextResponse.json({ error: 'Could not load event' }, { status: 500 })
  }
}

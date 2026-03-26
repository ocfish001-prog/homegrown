/**
 * GET /api/calendar?id=...
 * Returns an .ics file for a given event
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateIcs } from '@/lib/ics'
import type { HomegrownEvent } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // Accept event data as JSON in query param (for simple GET-downloadable link)
  const eventJson = searchParams.get('event')
  if (!eventJson) {
    return NextResponse.json({ error: 'Missing event parameter' }, { status: 400 })
  }

  try {
    const event: HomegrownEvent = JSON.parse(decodeURIComponent(eventJson))
    const ics = generateIcs(event)
    const filename = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('[/api/calendar] Error generating ICS:', err)
    return NextResponse.json({ error: 'Could not generate calendar file' }, { status: 500 })
  }
}

/**
 * ICS calendar file generator for event saving
 */
import type { HomegrownEvent } from './types'

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatIcsDate(isoString: string): string {
  // Convert ISO string to ICS format: 20260405T100000Z
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

export function generateIcs(event: HomegrownEvent): string {
  const now = formatIcsDate(new Date().toISOString())
  const start = event.dateISO ? formatIcsDate(event.dateISO) : now
  // Default to 2 hours if no end time
  const end = event.endDateISO
    ? formatIcsDate(event.endDateISO)
    : formatIcsDate(
        new Date(
          new Date(event.dateISO ?? Date.now()).getTime() + 2 * 60 * 60 * 1000
        ).toISOString()
      )

  const uid = `homegrown-${event.id}-${Date.now()}@homegrown.app`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Homegrown//Homegrown App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcs(event.description.slice(0, 500))}` : '',
    event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
    event.url ? `URL:${event.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  return lines
}

export function getGoogleCalendarUrl(event: HomegrownEvent): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const params = new URLSearchParams({
    text: event.title,
    dates: event.dateISO
      ? `${formatIcsDate(event.dateISO)}/${formatIcsDate(
          event.endDateISO ??
            new Date(
              new Date(event.dateISO).getTime() + 2 * 60 * 60 * 1000
            ).toISOString()
        )}`
      : '',
    details: event.description ?? '',
    location: event.location ?? '',
  })
  return `${base}&${params.toString()}`
}

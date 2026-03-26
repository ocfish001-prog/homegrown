/**
 * SFFun.org events integration
 * Source: https://sffun.org/
 *
 * Research findings:
 * - sffun.org appears to be a community-maintained site for SF family/kids events
 * - The site is unreachable via server-side fetch (returns no content / connection refused)
 * - No public API, RSS feed, or iCal export found
 * - Site may be behind Cloudflare or similar bot protection
 * - DuckDuckGo searches for "sffun.org RSS" return no relevant results
 *
 * Status: STUB — no public data feed available
 * TODO: Revisit if sffun.org publishes an RSS/API or if a contact can be made
 *       to request data partnership.
 *
 * Alternative sources for SF family events we've integrated:
 * - SF Zoo (live API ✅)
 * - SF Public Library (stub — BiblioCommons blocks server fetch)
 * - San Mateo County Libraries (HTML scrape)
 * - Cal Academy (JSON-LD attempt)
 * - 4-H UC California (HTML scrape)
 * - Eventbrite family filter ✅
 */
import type { HomegrownEvent } from '../types'

export async function fetchSFFunEvents(): Promise<{
  events: HomegrownEvent[]
  error?: string
  requiresSetup?: boolean
  setupMessage?: string
}> {
  // SFFun.org does not have a public data feed accessible server-side.
  // We return an empty state rather than fabricate events.
  // The site can be visited directly at https://sffun.org for curated SF family content.
  return {
    events: [] as HomegrownEvent[],
    requiresSetup: true,
    setupMessage:
      'SFFun.org events are coming soon. Visit sffun.org for curated family-friendly events in San Francisco.',
  }
}

/**
 * Bay Area Kid Fun — STUB
 * Source: https://www.bayareakidfun.com/
 *
 * INVESTIGATION FINDINGS (2026-03-26):
 * - RSS feed at /feed/ exists and returns 200 BUT contains venue/location pages
 *   (e.g. "San Francisco Zoo" published 2015) — NOT upcoming events
 * - The site is a venue directory + blog, not an events calendar
 * - No events RSS, no API, no iCal found
 * - Manual event listings on the site are not structured/scrapeable
 *
 * STATUS: Stub — no usable event data feed exists
 * TODO: Consider outreach to bayareakidfun.com for a data partnership
 *       or remove from sources entirely in Phase 3
 */
import type { HomegrownEvent } from '../types'
import type { SyncResult } from '../sync-engine'

export async function fetchBayAreaKidFunEvents(
  lastSyncedAt: Date,
  lastEtag: string | null
): Promise<SyncResult> {
  void lastEtag
  void lastSyncedAt
  // bayareakidfun.com RSS contains venue directory pages from 2015, not events.
  // Returning empty is correct — no fake data.
  console.log('[BayAreaKidFun] Stub — no events feed available (RSS is venue directory, not events)')
  return {
    events: [] as HomegrownEvent[],
    isStub: true,
  }
}

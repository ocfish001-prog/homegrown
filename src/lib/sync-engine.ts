/**
 * Homegrown Incremental Sync Engine
 *
 * Architecture:
 *   - Each new source fetcher accepts (lastSyncedAt, lastEtag) for incremental fetching
 *   - Sources use these to only return new/changed events since last run
 *   - DB persistence (SourceSync table) is opt-in via the cron job (Phase 3)
 *   - The API route uses in-memory epoch for now — each request fetches fresh
 *
 * Phase 3 cron will:
 *   1. Read lastSyncedAt from DB (source_syncs table)
 *   2. Call fetcher with that timestamp → only gets new events
 *   3. Upsert new events to DB events table
 *   4. Update source_syncs.lastSyncedAt
 *   → Runs in seconds instead of re-fetching everything
 *
 * Stable ID strategy per source:
 *   funcheap     → URL slug ("sf-zoo-free-admission-day-59")
 *   nps          → "nps-{eventid}"
 *   ebparks      → "ebparks-{activityId}" from APM URL
 *   cahomeschool → "cahomeschool-{tribeId}"
 *   bayareakidfun → STUB (no events feed)
 */
import type { HomegrownEvent } from './types'

export interface SyncResult {
  events: HomegrownEvent[]
  error?: string
  /** If true, source has no data feed — skip gracefully */
  isStub?: boolean
  /** ETag for conditional RSS/HTTP fetching */
  etag?: string
}

export interface SyncReport {
  source: string
  inserted: number
  updated: number
  skipped: number
  expired: number
  error?: string
  durationMs: number
}

/**
 * Get the last sync state for a source.
 * Currently returns epoch — DB persistence comes in Phase 3 cron.
 * When the cron is implemented, this reads from source_syncs table.
 */
export async function getLastSync(source: string): Promise<{ lastSyncedAt: Date; lastEtag: string | null }> {
  // Phase 3: replace with DB read from source_syncs
  // For now: always return epoch to fetch all upcoming events
  void source
  return { lastSyncedAt: new Date('2000-01-01T00:00:00Z'), lastEtag: null }
}

/**
 * Run a source sync and return events.
 * Gracefully handles errors — always returns something.
 */
export async function runSourceSync(
  sourceName: string,
  fetcher: (lastSyncedAt: Date, lastEtag: string | null) => Promise<SyncResult>
): Promise<{ events: HomegrownEvent[]; report: SyncReport }> {
  const t0 = Date.now()
  const { lastSyncedAt, lastEtag } = await getLastSync(sourceName)

  let result: SyncResult
  try {
    result = await fetcher(lastSyncedAt, lastEtag)
  } catch (err) {
    console.error(`[SyncEngine] Fetcher error for ${sourceName}:`, err)
    return {
      events: [],
      report: {
        source: sourceName,
        inserted: 0, updated: 0, skipped: 0, expired: 0,
        error: String(err),
        durationMs: Date.now() - t0,
      },
    }
  }

  if (result.isStub) {
    return {
      events: [],
      report: { source: sourceName, inserted: 0, updated: 0, skipped: 0, expired: 0, durationMs: Date.now() - t0 },
    }
  }

  return {
    events: result.events,
    report: {
      source: sourceName,
      inserted: result.events.length,
      updated: 0, skipped: 0, expired: 0,
      durationMs: Date.now() - t0,
    },
  }
}

/**
 * Deduplicate events by stable ID within a single response.
 * DB-level dedup is handled by (externalId, source) unique constraint in Phase 3.
 */
export function deduplicateEvents(events: HomegrownEvent[]): HomegrownEvent[] {
  const seen = new Set<string>()
  return events.filter(ev => {
    if (seen.has(ev.id)) return false
    seen.add(ev.id)
    return true
  })
}

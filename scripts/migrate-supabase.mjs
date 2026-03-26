/**
 * Homegrown Supabase Migration Script
 * Runs the full schema against Supabase via the REST SQL endpoint.
 *
 * Usage:
 *   node scripts/migrate-supabase.mjs
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment or .env.local
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load env vars from .env.local if not already set
function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // ignore
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Full schema SQL — matches prisma/schema.prisma
const SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- venues
CREATE TABLE IF NOT EXISTS venues (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name       TEXT NOT NULL,
  address    TEXT,
  city       TEXT,
  state      TEXT,
  zip        TEXT,
  lat        DECIMAL(10, 7),
  lng        DECIMAL(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- events
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  external_id     TEXT,
  source          TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ,
  is_free         BOOLEAN NOT NULL DEFAULT FALSE,
  cost            TEXT,
  image_url       TEXT,
  external_url    TEXT NOT NULL,
  relevance_score INT NOT NULL DEFAULT 0,
  is_approved     BOOLEAN NOT NULL DEFAULT TRUE,
  age_range       TEXT CHECK (age_range IN ('young_kids', 'older_kids', 'all_ages', 'family')),
  venue_id        TEXT REFERENCES venues(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (external_id, source)
);

CREATE INDEX IF NOT EXISTS events_start_date_idx ON events (start_date);
CREATE INDEX IF NOT EXISTS events_source_idx ON events (source);
CREATE INDEX IF NOT EXISTS events_age_range_idx ON events (age_range);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT
);

-- event_categories (join table)
CREATE TABLE IF NOT EXISTS event_categories (
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  PRIMARY KEY (event_id, category_id)
);

-- organizers
CREATE TABLE IF NOT EXISTS organizers (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  description TEXT,
  is_secular  BOOLEAN NOT NULL DEFAULT FALSE,
  age_range   TEXT,
  contact_url TEXT,
  lat         DECIMAL(10, 7),
  lng         DECIMAL(10, 7),
  city        TEXT,
  state       TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- vendor_listings
CREATE TABLE IF NOT EXISTS vendor_listings (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  website_url   TEXT,
  contact_email TEXT,
  lat           DECIMAL(10, 7),
  lng           DECIMAL(10, 7),
  city          TEXT,
  state         TEXT,
  is_promoted   BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- saved_events
CREATE TABLE IF NOT EXISTS saved_events (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id   TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, session_id)
);

-- source_syncs
CREATE TABLE IF NOT EXISTS source_syncs (
  source           TEXT PRIMARY KEY,
  last_synced_at   TIMESTAMPTZ NOT NULL,
  last_sync_count  INT NOT NULL DEFAULT 0,
  last_etag        TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at via trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS source_syncs_updated_at ON source_syncs;
CREATE TRIGGER source_syncs_updated_at
  BEFORE UPDATE ON source_syncs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`

async function runMigration() {
  console.log('🌱 Running Homegrown Supabase migration...')
  console.log(`   URL: ${SUPABASE_URL}`)

  // Split on statement boundaries and run each
  const statements = SCHEMA_SQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let ok = 0
  let failed = 0

  for (const stmt of statements) {
    const preview = stmt.slice(0, 60).replace(/\s+/g, ' ')
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' }).single()
      if (error) {
        // Try direct REST approach
        throw error
      }
      ok++
      console.log(`  ✅ ${preview}...`)
    } catch (err) {
      // supabase.rpc exec_sql may not exist — fall through to raw approach
      failed++
      console.log(`  ⚠️  ${preview} — ${err?.message || err}`)
    }
  }

  console.log(`\nDone: ${ok} OK, ${failed} failed/skipped`)
  console.log('\nNow trying bulk SQL via pg REST endpoint...')

  // Try the Supabase pg REST endpoint with full SQL
  const pgUrl = `${SUPABASE_URL.replace('https://', 'https://db.')}/pg/query`
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ sql: SCHEMA_SQL }),
    })
    const text = await res.text()
    console.log(`pg REST → ${res.status}: ${text.slice(0, 200)}`)
  } catch (err) {
    console.log('pg REST failed:', err?.message)
  }

  // Final check — list tables
  console.log('\n📊 Checking tables...')
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .limit(20)

  if (error) {
    console.log('Table check (expected if RLS blocks info_schema):', error.message)
  } else {
    console.log('Tables found:', data?.map(r => r.table_name).join(', '))
  }
}

runMigration().catch(console.error)

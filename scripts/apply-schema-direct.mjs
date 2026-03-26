/**
 * Apply schema directly using node-postgres (pg)
 * Bypasses Prisma and uses raw SQL via the pooler
 */
import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg

// Load .env.local
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
  } catch (e) {
    console.error('Could not load .env.local:', e.message)
  }
}

loadEnv()

const DATABASE_URL = process.env.DATABASE_URL
console.log('Connecting to:', DATABASE_URL?.replace(/:[^@]+@/, ':***@'))

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

const SEED_SQL = `
-- Seed placeholder events (SF Bay Area family events)
INSERT INTO venues (id, name, address, city, state, zip, lat, lng) VALUES
  ('venue-001', 'Golden Gate Park', 'Golden Gate Park', 'San Francisco', 'CA', '94117', 37.7694, -122.4862),
  ('venue-002', 'Children''s Creativity Museum', '221 4th St', 'San Francisco', 'CA', '94103', 37.7791, -122.3991),
  ('venue-003', 'Oakland Museum of California', '1000 Oak St', 'Oakland', 'CA', '94607', 37.7985, -122.2656),
  ('venue-004', 'Chabot Space & Science Center', '10000 Skyline Blvd', 'Oakland', 'CA', '94619', 37.8133, -122.1808),
  ('venue-005', 'San Jose Children''s Discovery Museum', '180 Woz Way', 'San Jose', 'CA', '95110', 37.3326, -121.8903)
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, external_id, source, title, description, start_date, end_date, is_free, cost, image_url, external_url, relevance_score, is_approved, age_range, venue_id) VALUES
  ('evt-001', 'seed-001', 'homegrown', 'SF Farmers Market Family Day', 'Join us every Saturday for fresh produce, live music, and kid-friendly activities at the Ferry Building.', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '4 hours', true, null, 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800', 'https://www.cuesa.org', 90, true, 'all_ages', 'venue-001'),
  ('evt-002', 'seed-002', 'homegrown', 'Toddler Story Time at SFPL', 'Interactive story time with songs, finger plays, and short stories for children ages 0–3 and their caregivers.', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour', true, null, 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800', 'https://sfpl.org', 95, true, 'young_kids', null),
  ('evt-003', 'seed-003', 'homegrown', 'Lego Robotics Workshop', 'Kids ages 8–14 build and program their own LEGO robots. No experience needed! Space is limited.', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '3 hours', false, '$25', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://childrenscreativity.org', 88, true, 'older_kids', 'venue-002'),
  ('evt-004', 'seed-004', 'homegrown', 'Weekend Science Lab', 'Hands-on science experiments for curious minds. Explore chemistry, physics, and biology in a fun environment.', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '2 hours', false, '$15', 'https://images.unsplash.com/photo-1532094349884-543559c70d0d?w=800', 'https://www.omca.org', 92, true, 'older_kids', 'venue-003'),
  ('evt-005', 'seed-005', 'homegrown', 'Family Stargazing Night', 'Explore the night sky with expert astronomers. Telescopes provided. Great for all ages!', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '3 hours', false, '$12', 'https://images.unsplash.com/photo-1519066629447-befce1e05576?w=800', 'https://chabotspace.org', 94, true, 'family', 'venue-004'),
  ('evt-006', 'seed-006', 'homegrown', 'Little Explorers Nature Walk', 'Guided nature walk designed for young children (ages 2–6). Learn about local plants and animals.', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', true, null, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', 'https://www.ebparks.org', 87, true, 'young_kids', null),
  ('evt-007', 'seed-007', 'homegrown', 'Family Art Workshop', 'Create collaborative art projects with your family. All materials provided. Drop-in welcome.', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days' + INTERVAL '2 hours', false, '$10', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800', 'https://sjkids.org', 86, true, 'family', 'venue-005'),
  ('evt-008', 'seed-008', 'homegrown', 'Bay Area Kite Festival', 'Annual kite flying festival with competitions, demonstrations, and kite making workshops for kids.', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '6 hours', true, null, 'https://images.unsplash.com/photo-1556717257-e44e52f5d17c?w=800', 'https://www.baykitefestival.com', 93, true, 'all_ages', 'venue-001'),
  ('evt-009', 'seed-009', 'homegrown', 'Junior Chef Cooking Class', 'Kids ages 6–12 learn to cook simple, healthy meals. Each child goes home with their own recipe booklet.', NOW() + INTERVAL '8 days', NOW() + INTERVAL '8 days' + INTERVAL '2 hours', false, '$30', 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800', 'https://www.kidscooking.com', 89, true, 'older_kids', null),
  ('evt-010', 'seed-010', 'homegrown', 'Splash Pad & Picnic Day', 'Cool off at the Hayward splash pad. Bring your own lunch and enjoy family fun in the sun!', NOW() + INTERVAL '9 days', NOW() + INTERVAL '9 days' + INTERVAL '5 hours', true, null, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'https://www.hayward-ca.gov', 85, true, 'young_kids', null)
ON CONFLICT (external_id, source) DO NOTHING;
`

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  
  try {
    console.log('Connecting...')
    await client.connect()
    console.log('✅ Connected!')
    
    console.log('\n📐 Applying schema...')
    await client.query(SCHEMA_SQL)
    console.log('✅ Schema applied!')
    
    console.log('\n🌱 Seeding placeholder events...')
    await client.query(SEED_SQL)
    console.log('✅ Seed data inserted!')
    
    // Verify
    const result = await client.query('SELECT COUNT(*) FROM events')
    console.log(`\n✅ Events in DB: ${result.rows[0].count}`)
    
    const sample = await client.query('SELECT id, title, age_range FROM events LIMIT 3')
    console.log('\nSample events:')
    for (const row of sample.rows) {
      console.log(`  - [${row.age_range}] ${row.title}`)
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

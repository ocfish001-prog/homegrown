/**
 * Apply RLS policies to live Supabase via pg connection.
 * Uses the DATABASE_URL (direct connection) from .env.local
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Apply via Supabase Management API / pg REST
const DATABASE_URL = 'postgresql://postgres.wbzxfwlgldrobubcssoa:eiewH8KXItbe5GLC@aws-0-us-west-1.pooler.supabase.com:5432/postgres';

import pg from 'pg';
const { Client } = pg;

const RLS_SQL = `
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "source_syncs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_select" ON "events";
CREATE POLICY "events_public_select" ON "events" FOR SELECT USING (true);

DROP POLICY IF EXISTS "venues_public_select" ON "venues";
CREATE POLICY "venues_public_select" ON "venues" FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_public_select" ON "categories";
CREATE POLICY "categories_public_select" ON "categories" FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_categories_public_select" ON "event_categories";
CREATE POLICY "event_categories_public_select" ON "event_categories" FOR SELECT USING (true);

DROP POLICY IF EXISTS "organizers_public_select" ON "organizers";
CREATE POLICY "organizers_public_select" ON "organizers" FOR SELECT USING ("isApproved" = true);

DROP POLICY IF EXISTS "vendor_listings_public_select" ON "vendor_listings";
CREATE POLICY "vendor_listings_public_select" ON "vendor_listings" FOR SELECT USING ("isApproved" = true);

DROP POLICY IF EXISTS "saved_events_session_select" ON "saved_events";
DROP POLICY IF EXISTS "saved_events_session_insert" ON "saved_events";
DROP POLICY IF EXISTS "saved_events_session_delete" ON "saved_events";
CREATE POLICY "saved_events_session_select" ON "saved_events" FOR SELECT USING (true);
CREATE POLICY "saved_events_session_insert" ON "saved_events" FOR INSERT WITH CHECK (true);
CREATE POLICY "saved_events_session_delete" ON "saved_events" FOR DELETE USING (true);
`;

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to Supabase pg');
  try {
    await client.query(RLS_SQL);
    console.log('✅ RLS policies applied successfully');
  } catch (err) {
    console.error('❌ RLS error:', err.message);
  } finally {
    await client.end();
  }
}

run().catch(console.error);

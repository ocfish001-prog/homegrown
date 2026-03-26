/**
 * Apply RLS policies via Supabase REST API using the pg query endpoint
 */
const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4';

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

const RLS_STATEMENTS = [
  `ALTER TABLE "events" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "event_categories" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "organizers" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "vendor_listings" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "saved_events" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "source_syncs" ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "events_public_select" ON "events"`,
  `CREATE POLICY "events_public_select" ON "events" FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "venues_public_select" ON "venues"`,
  `CREATE POLICY "venues_public_select" ON "venues" FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "categories_public_select" ON "categories"`,
  `CREATE POLICY "categories_public_select" ON "categories" FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "event_categories_public_select" ON "event_categories"`,
  `CREATE POLICY "event_categories_public_select" ON "event_categories" FOR SELECT USING (true)`,
  `DROP POLICY IF EXISTS "organizers_public_select" ON "organizers"`,
  `CREATE POLICY "organizers_public_select" ON "organizers" FOR SELECT USING ("isApproved" = true)`,
  `DROP POLICY IF EXISTS "vendor_listings_public_select" ON "vendor_listings"`,
  `CREATE POLICY "vendor_listings_public_select" ON "vendor_listings" FOR SELECT USING ("isApproved" = true)`,
  `DROP POLICY IF EXISTS "saved_events_session_select" ON "saved_events"`,
  `DROP POLICY IF EXISTS "saved_events_session_insert" ON "saved_events"`,
  `DROP POLICY IF EXISTS "saved_events_session_delete" ON "saved_events"`,
  `CREATE POLICY "saved_events_session_select" ON "saved_events" FOR SELECT USING (true)`,
  `CREATE POLICY "saved_events_session_insert" ON "saved_events" FOR INSERT WITH CHECK (true)`,
  `CREATE POLICY "saved_events_session_delete" ON "saved_events" FOR DELETE USING (true)`,
];

async function execSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function run() {
  console.log(`Project: ${projectRef}`);
  for (const stmt of RLS_STATEMENTS) {
    const preview = stmt.slice(0, 70);
    const { status, text } = await execSQL(stmt);
    if (status >= 200 && status < 300) {
      console.log(`✅ ${preview}`);
    } else {
      console.log(`⚠️  ${preview}\n   → ${status}: ${text.slice(0, 100)}`);
    }
  }
  console.log('\nDone.');
}

run().catch(console.error);

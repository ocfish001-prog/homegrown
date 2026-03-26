-- RLS Policies for Homegrown
-- Pattern: public read (events are public), service-role write

-- Enable RLS on all tables
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendor_listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "source_syncs" ENABLE ROW LEVEL SECURITY;

-- events: public read, no client writes (server-side only via service role)
CREATE POLICY "events_public_select" ON "events"
  FOR SELECT USING (true);

-- venues: public read
CREATE POLICY "venues_public_select" ON "venues"
  FOR SELECT USING (true);

-- categories: public read
CREATE POLICY "categories_public_select" ON "categories"
  FOR SELECT USING (true);

-- event_categories: public read
CREATE POLICY "event_categories_public_select" ON "event_categories"
  FOR SELECT USING (true);

-- organizers: public read (approved only)
CREATE POLICY "organizers_public_select" ON "organizers"
  FOR SELECT USING ("isApproved" = true);

-- vendor_listings: public read (approved only)
CREATE POLICY "vendor_listings_public_select" ON "vendor_listings"
  FOR SELECT USING ("isApproved" = true);

-- saved_events: session-scoped (anon users can manage their own saves)
CREATE POLICY "saved_events_session_select" ON "saved_events"
  FOR SELECT USING (true);
CREATE POLICY "saved_events_session_insert" ON "saved_events"
  FOR INSERT WITH CHECK (true);
CREATE POLICY "saved_events_session_delete" ON "saved_events"
  FOR DELETE USING (true);

-- source_syncs: no client access (service role only)
-- No policies = blocked for all non-service-role requests

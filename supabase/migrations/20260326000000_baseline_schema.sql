-- Baseline migration — reflects schema applied via Supabase SQL Editor on 2026-03-26
-- All tables use camelCase columns (Prisma-generated schema)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- venues
CREATE TABLE IF NOT EXISTS "venues" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"       TEXT NOT NULL,
  "address"    TEXT,
  "city"       TEXT,
  "state"      TEXT,
  "zip"        TEXT,
  "lat"        DECIMAL(10, 7),
  "lng"        DECIMAL(10, 7),
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- events
CREATE TABLE IF NOT EXISTS "events" (
  "id"             TEXT PRIMARY KEY,
  "externalId"     TEXT,
  "source"         TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "startDate"      TIMESTAMPTZ NOT NULL,
  "endDate"        TIMESTAMPTZ,
  "isFree"         BOOLEAN NOT NULL DEFAULT FALSE,
  "cost"           TEXT,
  "imageUrl"       TEXT,
  "externalUrl"    TEXT NOT NULL,
  "relevanceScore" INT NOT NULL DEFAULT 0,
  "isApproved"     BOOLEAN NOT NULL DEFAULT TRUE,
  "ageRange"       TEXT CHECK ("ageRange" IN ('young_kids', 'older_kids', 'all_ages', 'family')),
  "venueId"        TEXT REFERENCES "venues"("id") ON DELETE SET NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("externalId", "source")
);

CREATE INDEX IF NOT EXISTS "events_startDate_idx" ON "events" ("startDate");
CREATE INDEX IF NOT EXISTS "events_source_idx" ON "events" ("source");
CREATE INDEX IF NOT EXISTS "events_ageRange_idx" ON "events" ("ageRange");

-- categories
CREATE TABLE IF NOT EXISTS "categories" (
  "id"   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "icon" TEXT
);

-- event_categories (join table)
CREATE TABLE IF NOT EXISTS "event_categories" (
  "eventId"    TEXT NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "categoryId" TEXT NOT NULL REFERENCES "categories"("id"),
  PRIMARY KEY ("eventId", "categoryId")
);

-- organizers
CREATE TABLE IF NOT EXISTS "organizers" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "isSecular"   BOOLEAN NOT NULL DEFAULT FALSE,
  "ageRange"    TEXT,
  "contactUrl"  TEXT,
  "lat"         DECIMAL(10, 7),
  "lng"         DECIMAL(10, 7),
  "city"        TEXT,
  "state"       TEXT,
  "isApproved"  BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- vendor_listings
CREATE TABLE IF NOT EXISTS "vendor_listings" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "category"     TEXT,
  "websiteUrl"   TEXT,
  "contactEmail" TEXT,
  "lat"          DECIMAL(10, 7),
  "lng"          DECIMAL(10, 7),
  "city"         TEXT,
  "state"        TEXT,
  "isPromoted"   BOOLEAN NOT NULL DEFAULT FALSE,
  "isApproved"   BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- saved_events
CREATE TABLE IF NOT EXISTS "saved_events" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId"   TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("eventId", "sessionId")
);

-- source_syncs
CREATE TABLE IF NOT EXISTS "source_syncs" (
  "source"        TEXT PRIMARY KEY,
  "lastSyncedAt"  TIMESTAMPTZ NOT NULL,
  "lastSyncCount" INT NOT NULL DEFAULT 0,
  "lastEtag"      TEXT,
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

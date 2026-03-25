# Homegrown 🌱 — Project Kickoff Plan
**Phase 0: Planning**
**Authored by:** Santiago, Lead Software Architect & Engineering Director
**Date:** 2026-03-25
**Status:** Awaiting Big Poppa ✅ before Phase 1

---

## Project Identity

**Project Name:** Homegrown 🌱

**One-Line Description:** One place for homeschool families to discover local enrichment — events, co-ops, nature activities, and community, all filtered and relevant.

**Start Date:** 2026-03-25

**Target Launch Date:** TBD (Phase 5 completion — estimate 8–12 weeks from Phase 1 start)

---

## Problem & Users

**Target Users:**
Progressive and secular homeschool parents, aged 28–45, managing 1–4 school-age children. They prioritize enrichment, experiential learning, and community connection over formal curriculum. They are active, values-driven, and digitally savvy but deeply frustrated by the fragmentation of local information. They do NOT want Facebook Groups.

**Core Problem Being Solved:**
No single platform aggregates local enrichment opportunities — events, co-ops, nature programs, library activities, vendor classes — filtered through a homeschool lens. Parents currently spend hours across 6–10 sources (Eventbrite, Meetup, library websites, Facebook Groups, state park calendars, word-of-mouth) just to find what's happening locally this week. This is broken. Homegrown fixes it.

**Success Metrics:**
- MVP: 50+ events visible in a test city on launch day (seed + aggregated)
- User engagement: 30%+ return visit rate within 30 days of launch
- Vendor onboarding: 10+ vendor listings in first market within 60 days
- Performance: Lighthouse mobile 90+ on all pages before launch

---

## Tech Stack Decision

| Layer | Tool | Rationale |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript | SSR/SSG critical for SEO — events need to be indexable; App Router enables streaming + RSC for fast initial loads; TypeScript strict mode enforced |
| **Styling** | Tailwind CSS + shadcn/ui | Mobile-first by default, earthy palette via CSS vars, shadcn gives us accessible components we can skin; no design system debt from day 1 |
| **Backend/API** | Next.js API Routes + Hono for aggregation workers | API routes for simple CRUD; Hono as a lightweight worker for event aggregation jobs (separate concern) |
| **Database** | PostgreSQL via Supabase + Prisma ORM | Prisma = type-safe, prevents injection, clean migrations; Supabase = hosted Postgres with real-time (future), generous free tier, built-in storage for images |
| **Auth** | None in v1 | Out of scope for MVP — no user accounts |
| **Deploy** | Vercel (frontend/API) + Supabase (DB) | Supabase free tier is generous; Vercel = zero-config Next.js, auto HTTPS, edge network; both have free tiers adequate for MVP |
| **Testing** | Vitest + Testing Library + Playwright | As per Santiago Standards — unit/integration with Vitest, E2E with Playwright |
| **CI/CD** | GitHub Actions | Standard pipeline per standards: type-check → lint → test → Lighthouse audit |
| **PWA** | vite-plugin-pwa → next-pwa | Service worker, offline fallback, installable — per mobile-first standards |
| **Forms** | React Hook Form + Zod | Vendor listing forms; Zod = runtime validation matching TypeScript types |
| **State/Data** | TanStack Query | Server state management for event feeds, filtering, location queries |
| **Maps** | Mapbox GL JS or Leaflet + OpenStreetMap | Location-based radius filtering visualization — Mapbox for polish, Leaflet as free fallback |
| **Event Aggregation** | Custom workers + official APIs | Eventbrite API, Meetup API, library RSS/iCal feeds, state park feeds |

**Stack Rationale Summary:**
Next.js over pure Vite/React because SEO matters enormously for event discovery — Google needs to index these events. Supabase/Postgres over MongoDB because event data is structured and relational (events → venues → categories → tags). The Vercel + Supabase combo means zero DevOps in Phase 1, letting us move fast. Everything aligns with the Santiago Standards recommended stack.

**Alternatives Considered and Rejected:**
- **Remix** — rejected because Next.js has stronger ecosystem for data fetching patterns we need and team familiarity is higher
- **PlanetScale (MySQL)** — rejected because Supabase Postgres gives us more flexibility and a friendlier free tier
- **Firebase/Firestore** — rejected because relational data (events → categories → venues → co-ops) doesn't fit a document model well
- **SvelteKit** — rejected because shadcn/ui ecosystem is React-only and we want accessible components fast
- **Self-hosted Railway** — valid alternative to Vercel but Vercel's DX for Next.js is unbeatable for speed to MVP

---

## Architecture Overview

### System Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER / PWA                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (Vercel)                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │  Event Feed  │  │  Co-op Dir   │  │  Vendors   │ │  │
│  │  │  (SSG+ISR)   │  │  (SSR)       │  │  (SSR)     │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │  │
│  │         │                 │                 │         │  │
│  │  ┌──────▼─────────────────▼─────────────────▼──────┐ │  │
│  │  │              Next.js API Routes                  │ │  │
│  │  │   /api/events  /api/coops  /api/vendors          │ │  │
│  │  └──────────────────────┬────────────────────────── ┘ │  │
│  └─────────────────────────┼────────────────────────────  ┘  │
└────────────────────────────┼────────────────────────────────-─┘
                             │
              ┌──────────────▼──────────────┐
              │     Supabase (PostgreSQL)    │
              │  events | coops | vendors    │
              │  categories | venues | tags  │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │    Event Aggregation Layer   │
              │  (Scheduled Workers / Cron)  │
              │  ┌──────────┐ ┌──────────┐  │
              │  │Eventbrite│ │  Meetup  │  │
              │  │  Scraper │ │  Scraper │  │
              │  └──────────┘ └──────────┘  │
              │  ┌──────────┐ ┌──────────┐  │
              │  │ Library  │ │ StatePark│  │
              │  │  Feeds   │ │  Feeds   │  │
              │  └──────────┘ └──────────┘  │
              └─────────────────────────────┘
```

### Data Flow

1. **Event Discovery Flow:**
   - User opens app → browser geolocation or manual city entry
   - Frontend calls `/api/events?lat=X&lng=Y&radius=25&categories=nature,arts`
   - API queries Postgres: events within radius, filtered by category, sorted by date
   - Returns paginated JSON → TanStack Query cache → rendered as cards
   - ISR (Incremental Static Regeneration) for popular city pages (60min revalidation)

2. **Event Aggregation Flow (background):**
   - Scheduled cron job (Vercel Cron or GitHub Actions) runs every 4–6 hours
   - Workers fetch from Eventbrite API, Meetup API, library RSS/iCal feeds
   - Each event normalized to internal schema → keyword/category classifier runs
   - Homeschool relevance score applied (keyword matching: "family", "kids", "youth", "homeschool", "nature", "maker", etc.)
   - Upsert into Postgres (dedup by external_id + source)

3. **Vendor Listing Flow:**
   - Vendor fills form → POST `/api/vendors` → validation via Zod → stored in DB
   - Basic listings: free, visible immediately after manual review
   - Promoted listings: flagged for future payment integration (Phase 3+)

4. **Calendar Integration Flow:**
   - User taps "Add to Calendar" on event card
   - Frontend generates `.ics` file client-side (no auth needed)
   - Downloads directly to device / opens in calendar app

### Key API Contracts

```typescript
// GET /api/events
// Query: lat, lng, radius (miles), categories (csv), page, limit
// Response:
{
  events: Event[],
  total: number,
  page: number,
  hasMore: boolean
}

// Event object:
{
  id: string,
  title: string,
  description: string,
  startDate: string (ISO 8601),
  endDate: string | null,
  venue: { name: string, address: string, lat: number, lng: number },
  categories: string[],
  imageUrl: string | null,
  externalUrl: string,
  source: "eventbrite" | "meetup" | "library" | "statepark" | "manual",
  isFree: boolean,
  cost: string | null,
  isHomeschoolFiltered: boolean,
  relevanceScore: number
}

// GET /api/coops
// Query: lat, lng, radius, secular (bool), ageRange, page
// Response:
{
  coops: Coop[],
  total: number,
  page: number
}

// GET /api/vendors
// Query: lat, lng, radius, category, page
// Response: { vendors: Vendor[], total, page }

// POST /api/vendors
// Body: VendorSubmission (validated via Zod)
// Response: { id: string, status: "pending_review" }
```

### Database Schema Outline

```sql
-- EVENTS
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id  TEXT,           -- source system ID (dedup key)
  source       TEXT NOT NULL,  -- eventbrite | meetup | library | manual
  title        TEXT NOT NULL,
  description  TEXT,
  start_date   TIMESTAMPTZ NOT NULL,
  end_date     TIMESTAMPTZ,
  is_free      BOOLEAN DEFAULT false,
  cost         TEXT,           -- "$5" / "Free" / "Suggested donation"
  image_url    TEXT,
  external_url TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 0,   -- 0-100, homeschool filter
  is_approved  BOOLEAN DEFAULT true,   -- manual override flag
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  venue_id     UUID REFERENCES venues(id),
  UNIQUE(external_id, source)
);

-- VENUES
CREATE TABLE venues (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     TEXT NOT NULL,
  address  TEXT,
  city     TEXT,
  state    TEXT,
  zip      TEXT,
  lat      DECIMAL(10, 7),
  lng      DECIMAL(10, 7),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CATEGORIES (enum-like, seeded)
CREATE TABLE categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,  -- nature-outdoors, arts, stem-maker, etc.
  name TEXT NOT NULL,
  icon TEXT                   -- emoji or icon name
);

-- EVENT_CATEGORIES (join)
CREATE TABLE event_categories (
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  PRIMARY KEY (event_id, category_id)
);

-- COOPS
CREATE TABLE coops (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_secular  BOOLEAN DEFAULT false,
  age_range   TEXT,           -- "5-12", "all ages", etc.
  contact_url TEXT,
  lat         DECIMAL(10, 7),
  lng         DECIMAL(10, 7),
  city        TEXT,
  state       TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- VENDORS
CREATE TABLE vendors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  website_url  TEXT,
  contact_email TEXT,
  lat          DECIMAL(10, 7),
  lng          DECIMAL(10, 7),
  city         TEXT,
  state        TEXT,
  is_promoted  BOOLEAN DEFAULT false,
  is_approved  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- INDEXES (performance for geospatial + date queries)
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_venues_location ON venues USING GIST(point(lng, lat));
-- Note: PostGIS extension for proper geospatial queries
```

---

## File/Folder Structure

```
homegrown/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Home / event feed
│   │   ├── layout.tsx            # Root layout (PWA meta, fonts)
│   │   ├── events/
│   │   │   └── [id]/page.tsx     # Event detail page
│   │   ├── coops/
│   │   │   └── page.tsx          # Co-op directory
│   │   ├── vendors/
│   │   │   ├── page.tsx          # Vendor listings
│   │   │   └── submit/page.tsx   # Vendor submission form
│   │   └── api/
│   │       ├── events/route.ts
│   │       ├── coops/route.ts
│   │       └── vendors/route.ts
│   ├── components/
│   │   ├── EventCard.tsx         # Primary event display card
│   │   ├── EventFeed.tsx         # Infinite scroll feed
│   │   ├── CategoryFilter.tsx    # Filter chips/pills
│   │   ├── LocationSearch.tsx    # City/radius input
│   │   ├── CoopCard.tsx
│   │   ├── VendorCard.tsx
│   │   ├── AddToCalendarButton.tsx
│   │   ├── MapView.tsx           # Optional map toggle
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/
│   │   ├── useEvents.ts          # TanStack Query wrapper
│   │   ├── useCoops.ts
│   │   ├── useVendors.ts
│   │   └── useGeolocation.ts
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── geo.ts                # Haversine / PostGIS helpers
│   │   ├── ics.ts                # .ics calendar file generator
│   │   ├── classifier.ts         # Homeschool relevance scorer
│   │   └── aggregators/
│   │       ├── eventbrite.ts
│   │       ├── meetup.ts
│   │       ├── library.ts
│   │       └── statepark.ts
│   ├── types/
│   │   ├── event.ts
│   │   ├── coop.ts
│   │   ├── vendor.ts
│   │   └── api.ts
│   └── styles/
│       └── globals.css           # Tailwind base + CSS vars (earthy palette)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # PWA icons
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── PROJECT.md
└── README.md
```

### Component Tree (UI)

```
App (layout.tsx)
├── Header
│   ├── Logo
│   ├── LocationSearch (city + radius)
│   └── Nav (Events | Co-ops | Vendors)
├── Page: Home / Event Feed
│   ├── CategoryFilter (chips: All | Nature | Arts | STEM | Social | Sports | Library | Vendors)
│   ├── EventFeed (infinite scroll via TanStack Query)
│   │   └── EventCard × N
│   │       ├── EventImage (WebP, lazy)
│   │       ├── CategoryBadge
│   │       ├── EventTitle
│   │       ├── EventMeta (date, venue, free/paid)
│   │       └── AddToCalendarButton
│   └── MapToggle → MapView (Leaflet, lazy-loaded)
├── Page: Event Detail (/events/[id])
│   ├── EventHero (image, title, date)
│   ├── EventDescription
│   ├── VenueMap (mini map)
│   └── AddToCalendarButton (prominent)
├── Page: Co-op Directory
│   ├── FilterBar (secular toggle, age range)
│   └── CoopList
│       └── CoopCard × N
├── Page: Vendor Listings
│   ├── VendorGrid
│   │   └── VendorCard × N
│   └── SubmitVendorCTA → /vendors/submit
└── Page: Vendor Submission (/vendors/submit)
    └── VendorForm (React Hook Form + Zod)
```

---

## Phase Plan

### Phase 0: Planning ✅ → 🔄 In Progress
- [x] Read all standards and templates
- [x] Create project directory and PROJECT.md
- [x] Write kickoff plan (this document)
- [ ] Post to #dev-projects
- [ ] Await Big Poppa ✅

**Acceptance Criteria:**
- [ ] Big Poppa has reviewed and approved this plan

---

### Phase 1: Foundation
**Goal:** Working repo, CI/CD pipeline, database, empty Next.js shell. Zero features, full infrastructure.

**Deliverables:**
- [ ] Next.js 14 project scaffolded with TypeScript strict mode
- [ ] Tailwind CSS + shadcn/ui configured with earthy palette (CSS vars: `--color-sage`, `--color-mauve`, `--color-stone`, etc.)
- [ ] Prisma schema created + migrations run against Supabase dev DB
- [ ] All 5 tables: events, venues, categories, event_categories, coops, vendors
- [ ] PostGIS extension enabled in Supabase for geospatial queries
- [ ] next-pwa installed + manifest.json with icons
- [ ] GitHub Actions CI pipeline: type-check → lint → Vitest → Playwright smoke → Lighthouse
- [ ] `.env.example` with all required vars documented
- [ ] Vercel project created + staging auto-deploy from main
- [ ] Seed script: 10 sample events in 1 test city
- [ ] README: setup instructions, env vars, how to run tests, deploy steps

**Acceptance Criteria:**
- [ ] `npm run build` succeeds with zero TypeScript errors
- [ ] All CI checks green on first real PR
- [ ] Staging URL live on Vercel
- [ ] Lighthouse mobile: Performance 90+, Accessibility 95+, PWA baseline green (empty shell)
- [ ] Seed data visible via Prisma Studio

**Test Coverage Expected:**
- [ ] Unit: Prisma schema validation helpers
- [ ] Integration: DB connection + basic query
- [ ] E2E: Page loads without crash (smoke test)

**Specialists to spawn:**
- Full-Stack Engineer (scaffold + Prisma + CI setup)
- DevOps Engineer (GitHub Actions pipeline, Vercel config)

---

### Phase 2: Core Features
**Goal:** All MVP features working end-to-end. Real events visible. Calendar add works. Vendor form works.

**Deliverables:**
- [ ] Event feed page with location-radius filtering and category filtering
- [ ] Geolocation API integration (browser geolocation + manual city fallback)
- [ ] Event detail page (`/events/[id]`)
- [ ] Add-to-Calendar button (generates `.ics` download, client-side)
- [ ] Co-op directory with secular filter + basic listing
- [ ] Vendor listings page
- [ ] Vendor submission form (React Hook Form + Zod, posts to `/api/vendors`)
- [ ] All 3 API routes: `/api/events`, `/api/coops`, `/api/vendors`
- [ ] Homeschool relevance classifier (keyword-based scoring)
- [ ] Eventbrite aggregator worker (fetches + normalizes + upserts)
- [ ] Library RSS/iCal aggregator worker
- [ ] Aggregation cron job (Vercel Cron, every 6 hours)
- [ ] TanStack Query integration for all data fetching
- [ ] Infinite scroll on event feed
- [ ] ISR on event detail pages (60min revalidation)

**Acceptance Criteria:**
- [ ] User can enter a city + radius and see real events from Eventbrite filtered to family/homeschool relevance
- [ ] User can filter by at least 3 categories
- [ ] User can tap "Add to Calendar" and `.ics` file downloads correctly on iOS Safari and Android Chrome
- [ ] User can submit a vendor listing (form validates, submits, shows confirmation)
- [ ] Co-op directory shows at least 5 seed co-ops with secular filter working
- [ ] All API routes return correct data with proper error handling

**Test Coverage Expected:**
- [ ] Unit: classifier.ts (relevance scorer), geo.ts helpers, ics.ts generator
- [ ] Integration: all 3 API routes (happy path + error cases), aggregator workers
- [ ] E2E: event feed → filter → click event → add to calendar flow; vendor submission flow

**Specialists to spawn:**
- Frontend Engineer (EventCard, EventFeed, CategoryFilter, all page components)
- Backend Engineer (API routes, aggregation workers, cron setup)
- Full-Stack Engineer (wires data layer to UI)

---

### Phase 3: Secondary Features
**Goal:** Meetup + state park aggregators, map view, deeper filtering, co-op submission form.

**Deliverables:**
- [ ] Meetup.com aggregator worker
- [ ] State park events feed aggregator (RSS or scraper)
- [ ] Map view toggle on event feed (Leaflet + OpenStreetMap)
- [ ] Co-op submission form (for families to add their co-op)
- [ ] "Promoted" vendor badge display (no payment yet — manual flag in DB)
- [ ] SEO: OpenGraph meta tags per event detail page, structured data (Schema.org Event)
- [ ] Sitemap generation for indexable event/city pages
- [ ] Share button on event cards (Web Share API, fallback copy link)
- [ ] Date range picker for event filtering

**Acceptance Criteria:**
- [ ] Meetup events appear in feed for test city
- [ ] Map view loads without crashing, shows event pins
- [ ] Co-op submission form validates and saves to DB
- [ ] Event detail pages have correct OG tags (verified with OG debugger)
- [ ] Share button works on iOS and Android

**Test Coverage Expected:**
- [ ] Unit: Meetup normalizer, state park feed parser
- [ ] Integration: Meetup + state park aggregators end-to-end
- [ ] E2E: map view toggle, share flow, co-op submission

**Specialists to spawn:**
- Backend Engineer (Meetup/state park aggregators, SEO routes)
- Frontend Engineer (map view, date range picker, share button)

---

### Phase 4: Polish
**Goal:** Mobile UX perfection, Lighthouse scores green, design review against AllTrails/Meetup feel.

**Deliverables:**
- [ ] Full UX design review against earthy palette + photo-first card spec
- [ ] All Lighthouse mobile scores: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 90+, PWA green
- [ ] All touch targets ≥ 44×44px verified across all pages
- [ ] Slow 3G test passed (≤ 3s usable on slow network)
- [ ] JS bundle under 200KB gzipped (verify with bundle visualizer)
- [ ] All images WebP format, lazy loaded below fold, responsive srcset
- [ ] Screen reader / keyboard nav audit (WCAG 2.1 AA)
- [ ] Error states: empty feed (no events near you), no results after filter, network error
- [ ] Loading skeletons on event cards (no layout shift)
- [ ] Font: max 2 families, preloaded, `font-display: swap`
- [ ] Install PWA prompt (timed, non-intrusive)

**Acceptance Criteria:**
- [ ] Lighthouse mobile: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 90+
- [ ] JS bundle < 200KB gzipped
- [ ] CLS < 0.1, LCP < 2.5s, INP < 200ms
- [ ] Passes keyboard navigation audit (all flows reachable without mouse)
- [ ] Tested on real iOS Safari + Android Chrome

**Specialists to spawn:**
- UX Designer (design review, earthy palette refinement, card layout polish)
- Accessibility Engineer (full WCAG 2.1 AA audit)
- Performance Engineer (bundle analysis, Lighthouse optimization)
- Mobile Engineer (PWA, real device testing)

---

### Phase 5: Deploy & Verify
**Goal:** Production launch. Real city. Smoke tested. Monitoring in place.

**Deliverables:**
- [ ] Production Vercel deployment
- [ ] Production Supabase project (separate from dev)
- [ ] Environment variables migrated to production secrets
- [ ] Production cron jobs active (Vercel Cron)
- [ ] Real event data seeded for launch city
- [ ] Smoke test: all critical flows on production URL
- [ ] Basic monitoring: Vercel Analytics, Supabase query monitoring
- [ ] Error tracking: Sentry (free tier)
- [ ] README final pass

**Acceptance Criteria:**
- [ ] All critical user flows verified on production URL (not staging)
- [ ] No critical bugs open
- [ ] Events visible in launch city within 24h of cron run
- [ ] Monitoring dashboards accessible
- [ ] PM (Steve) sign-off

**Specialists to spawn:**
- DevOps Engineer (production deploy, env migration, Sentry setup)
- QA Engineer (production smoke test checklist)
- Security Engineer (pre-launch OWASP checklist, secrets scan)

---

## Full Initial TODO List

### Phase 0 — Planning
- [x] Read SANTIAGO_STANDARDS.md
- [x] Read PRODUCT_WORKFLOW.md
- [x] Read kickoff template
- [x] Read role-library.md
- [x] Create project directory
- [x] Create PROJECT.md
- [x] Write KICKOFF.md (this document)
- [ ] Post Phase 0 plan to #dev-projects
- [ ] Await Big Poppa ✅

### Phase 1 — Foundation
- [ ] Init Next.js 14 project with TypeScript strict mode
- [ ] Configure Tailwind CSS + earthy CSS custom properties
- [ ] Install + configure shadcn/ui
- [ ] Define earthy design tokens (sage, mauve, stone, warm-gray)
- [ ] Create Supabase project (dev environment)
- [ ] Enable PostGIS extension in Supabase
- [ ] Write Prisma schema (all 6 tables)
- [ ] Run initial Prisma migration
- [ ] Configure Prisma client singleton (`lib/db.ts`)
- [ ] Install next-pwa + create manifest.json with icons
- [ ] Create `.env.example` with all required vars
- [ ] Set up GitHub repository
- [ ] Write GitHub Actions CI pipeline (type-check → lint → vitest → playwright → lighthouse)
- [ ] Configure Vercel project + auto-deploy from main
- [ ] Connect Supabase DB to Vercel env
- [ ] Write seed script (10 sample events, 1 city)
- [ ] Configure Vitest
- [ ] Configure Playwright (with iPhone 13 + Pixel 5 presets)
- [ ] Configure ESLint + Prettier + lint-staged + Husky
- [ ] Write README (setup, env vars, tests, deploy)
- [ ] Smoke E2E test: homepage loads without crash

### Phase 2 — Core Features
- [ ] Build `useGeolocation` hook (browser API + manual fallback)
- [ ] Build `LocationSearch` component
- [ ] Build `CategoryFilter` component (filter chips)
- [ ] Build `EventCard` component (photo-first, mobile-first)
- [ ] Build `EventFeed` component (infinite scroll + TanStack Query)
- [ ] Build Event Feed page (home, `/`)
- [ ] Build Event Detail page (`/events/[id]`)
- [ ] Build `AddToCalendarButton` component + `lib/ics.ts` generator
- [ ] Build `/api/events` route (lat/lng/radius/category filter, pagination)
- [ ] Build geospatial query helper (`lib/geo.ts`) using PostGIS or Haversine
- [ ] Build `useEvents` TanStack Query hook
- [ ] Build `classifier.ts` — homeschool relevance keyword scorer
- [ ] Build `aggregators/eventbrite.ts` — fetch, normalize, upsert
- [ ] Build `aggregators/library.ts` — RSS/iCal fetch, normalize, upsert
- [ ] Set up Vercel Cron job (every 6 hours, runs aggregators)
- [ ] Build Co-op Directory page (`/coops`)
- [ ] Build `CoopCard` component
- [ ] Build `/api/coops` route (lat/lng/radius/secular filter)
- [ ] Build `useCoops` TanStack Query hook
- [ ] Build Vendor Listings page (`/vendors`)
- [ ] Build `VendorCard` component
- [ ] Build `/api/vendors` GET route
- [ ] Build Vendor Submission page (`/vendors/submit`)
- [ ] Build `VendorForm` component (React Hook Form + Zod)
- [ ] Build `/api/vendors` POST route (validation + DB insert)
- [ ] Write unit tests: classifier, geo helpers, ics generator
- [ ] Write integration tests: all 3 API routes
- [ ] Write E2E: event feed → filter → event detail → add to calendar
- [ ] Write E2E: vendor submission flow

### Phase 3 — Secondary Features
- [ ] Build `aggregators/meetup.ts`
- [ ] Build `aggregators/statepark.ts`
- [ ] Build `MapView` component (Leaflet, dynamically imported)
- [ ] Build map toggle button on event feed
- [ ] Build Co-op Submission form (`/coops/submit`)
- [ ] Add promoted vendor badge to VendorCard
- [ ] Add OG meta tags to event detail pages
- [ ] Add Schema.org Event structured data to event detail pages
- [ ] Build sitemap route (`/sitemap.xml`)
- [ ] Build `ShareButton` component (Web Share API + copy fallback)
- [ ] Add date range picker to event feed filters
- [ ] Write integration tests: Meetup + state park aggregators
- [ ] Write E2E: map view, share button, co-op submission

### Phase 4 — Polish
- [ ] Full UX design review (palette, typography, card layout)
- [ ] Run Lighthouse mobile audit on all pages — achieve 90/95/95/90
- [ ] Verify all touch targets ≥ 44×44px
- [ ] Run bundle visualizer — achieve <200KB gzipped
- [ ] Convert all images to WebP + add lazy loading + srcset
- [ ] Add loading skeleton components for EventCard
- [ ] Design + build empty state UIs (no events, no results, network error)
- [ ] Run WCAG 2.1 AA audit (axe-core + manual keyboard nav)
- [ ] Test on real iOS Safari + Android Chrome
- [ ] Test on Slow 3G throttle in DevTools
- [ ] Optimize fonts (max 2, preload, font-display swap)
- [ ] Add PWA install prompt (deferred, non-intrusive)
- [ ] Final Lighthouse audit — all scores locked in

### Phase 5 — Deploy & Verify
- [ ] Create production Supabase project
- [ ] Create production Vercel deployment
- [ ] Migrate all env vars to production secrets
- [ ] Activate production Vercel Cron
- [ ] Seed production DB with launch city real events
- [ ] Run smoke test checklist on production URL
- [ ] Set up Sentry error tracking (free tier)
- [ ] Verify Vercel Analytics active
- [ ] Final README pass
- [ ] Steve (PM) sign-off

---

## Known Risks & Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Eventbrite API rate limits / pricing | Medium | High | Check free tier limits early; implement aggressive caching; fallback to cached data if limit hit |
| Meetup.com API access (they've restricted public API) | High | High | Investigate during Phase 1; have RSS/web scrape fallback plan ready |
| Homeschool relevance classifier is too noisy (unrelated events) | Medium | Medium | Tune keyword list aggressively before launch; add manual override flag in DB |
| Geolocation permission denied by user | Medium | Medium | Graceful fallback: manual city search as default; geolocation is bonus, not required |
| PostGIS extension not available on Supabase free tier | Low | Medium | Confirm in Phase 1; Haversine formula as pure-SQL fallback (slower but no extension needed) |
| No real event data for launch city at go-live | Medium | High | Seed 20–30 manually curated events for launch city before Phase 5; build manual event entry admin route |
| .ics calendar format compatibility across iOS/Android | Low | Medium | Test early in Phase 2 on real devices; well-established spec with broad support |
| Vendor spam / low-quality submissions | Medium | Low | `is_approved = false` by default; manual review step before listing goes live |
| Bundle size creep from Leaflet + shadcn/ui | Medium | Medium | Dynamic import Leaflet; monitor with bundle visualizer; tree-shake shadcn carefully |
| Vercel Cron limitations (free tier: 1/day max) | High | High | Evaluate early; GitHub Actions scheduled workflow as free alternative for aggregation cron |

### Open Questions (Need Answers Before or During Phase 1)

- [ ] **Eventbrite API:** What is the free tier limit? Do we need to apply for partner access?
- [ ] **Meetup API:** Is the GraphQL API still publicly accessible? What are the current access restrictions?
- [ ] **Library data:** Is there a national library events API / aggregator (e.g., BiblioCommons)? Or do we target specific city library systems?
- [ ] **State park data:** What format do state park systems publish events in? RSS? iCal? Scrape only?
- [ ] **Vercel Cron tiers:** Free tier allows 1 invocation/day. Is Vercel Pro (paid) in scope, or do we use GitHub Actions?
- [ ] **Hosting budget:** Any monthly spend cap we should design around?
- [ ] **Launch city:** Which city are we targeting for MVP launch? Defines seed data + API quota usage.
- [ ] **Manual event entry:** Do we need an admin UI to manually add events, or is a seed script enough for MVP?
- [ ] **Co-op data:** Where does initial co-op data come from? Manual seed? A known directory?
- [ ] **Domain:** Is homegrown.app / homegrown.community / etc. available and acquired?

---

## First Specialists to Spawn (Phase 1)

Phase 1 is infrastructure. The right team:

1. **Full-Stack Engineer** (primary) — scaffold Next.js, configure Prisma, wire up DB, write seed script, basic page shells
2. **DevOps / Platform Engineer** — GitHub Actions CI pipeline, Vercel project setup, environment configuration

These two can run in parallel. Full-Stack owns the app code; DevOps owns the pipeline + deploy config.

**Phase 1 does NOT need:** Frontend Engineer (no real UI yet), Backend Engineer (API routes come in Phase 2), UX Designer (no UI to design yet).

---

## Design Palette Reference

For Phase 1 Tailwind setup — earthy, warm, AllTrails-adjacent:

```css
/* CSS Custom Properties for earthy Homegrown palette */
:root {
  --color-sage:        #7D9B76;   /* muted green — primary brand */
  --color-sage-light:  #A8C4A2;
  --color-mauve:       #9B7D8A;   /* muted purple-pink — accent */
  --color-stone:       #8C8070;   /* warm gray-brown — text */
  --color-cream:       #F5F0E8;   /* warm white — backgrounds */
  --color-bark:        #4A3728;   /* deep brown — headings */
  --color-sky:         #7BA3C0;   /* muted blue — links, info */
  --color-moss:        #5C7A56;   /* dark sage — hover states */
}
```

Typography: **Instrument Serif** (headings, warmth) + **Inter** (body, legibility) — 2 families max, both on Google Fonts.

---

## Sign-Off

- [x] Santiago reviewed and approved this plan
- [ ] Posted to #dev-projects
- [ ] Big Poppa acknowledged — ready to proceed to Phase 1

---

*Santiago Standards v1.0 — Homegrown Phase 0 Kickoff | 2026-03-25*

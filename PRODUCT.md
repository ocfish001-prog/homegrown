# Homegrown — Product Overview

**Last updated:** 2026-03-26

## What It Is
Homegrown is a **multi-region** homeschool enrichment & community events discovery platform. Families use it to find local enrichment activities, events, classes, and community — filtered by age range, category, and date.

## Launch Regions

### Region 1 — SF Bay Area
- Status: Active (default region in current build)
- Research: \workspace-researcher/homegrown-event-sources.md\
- Key sources: sf.funcheap.com RSS, NPS API, East Bay Regional Parks, Eventbrite, bayareakidfun.com
- Homeschool community: Large, active, multiple Facebook groups + Meetup groups

### Region 2 — Hawaii Big Island
- Status: In progress (events being seeded)
- Research: \workspace-researcher/homegrown-hawaii-exhaustive.md\
- Key sources: Hilo Palace Theater iCal (confirmed live), BigIslandNow (API dead — scraper needed), Volcano Art Center, Imiloa, Donkey Mill
- Key insight: No family events aggregator exists on Big Island — this IS the product opportunity
- Merrie Monarch Festival week (~April 7-12) = 10+ family events in one week

## Product Vision
One app, multiple regions. Users see events for their local area. Region detection via location or manual picker. Each region has its own event sources, organizers, and community.

## Architecture Notes
- Multi-region from the start — location picker in UI (already built)
- Events table has \source\ + \enueId\ — region can be inferred from venue location or added as explicit field
- Consider adding \egion\ field to events table in next schema update

## Active Build
- Live: https://homegrown-phase1-app.netlify.app
- Stack: Next.js, Supabase, Netlify
- Phase: 1.5 (UI/UX redesign + Supabase connect)
- Parker status: SHIP WITH NOTES (blockers resolved, re-check in progress)

## Event Source Integration Philosophy

**Default assumption: browser required.**

Most event sources will NOT have clean APIs. Expect:
- Facebook groups — no API, members-only, requires browser + login
- JS-rendered calendars (Squarespace, custom sites) — require headless browser
- WordPress sites — REST API may be disabled or throttled
- iCal feeds — best case, but rare
- RSS feeds — useful for article-style content, not structured events

**Ingestion tier priority:**
1. ✅ iCal feeds (structured, no auth, poll-friendly) — e.g. Hilo Palace Theater
2. ✅ Public REST APIs (free, documented) — e.g. NPS API, Eventbrite API
3. ⚙️ RSS feeds (parse + classify) — e.g. sf.funcheap.com
4. 🌐 Headless browser scraping (Playwright/Puppeteer) — most sources will require this
5. 🤝 Data partnerships — for high-value sources that block scraping (BigIslandNow, Facebook groups)
6. 📝 Community submissions — users + organizers submit their own events

**Build scrapers with browser-first mindset.** Don't spend time trying to find a hidden API — if the data is on a page, scrape the page.

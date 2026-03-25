# Homegrown 🌱
> Local enrichment and community discovery for homeschool families

**Start Date:** 2026-03-25
**Current Phase:** Phase 1 ✅ Complete — awaiting Big Poppa ✅ for Phase 2

---

## Phase Status

| Phase | Name | Status |
|---|---|---|
| **Phase 0** | Planning | ✅ Complete |
| **Phase 1** | Foundation | ✅ Complete |
| **Phase 2** | Core Features | 🔒 Pending Big Poppa ✅ |
| **Phase 3** | Secondary Features | 🔒 Pending |
| **Phase 4** | Polish | 🔒 Pending |
| **Phase 5** | Deploy & Verify | 🔒 Pending |

---

## Phase 1 Summary (2026-03-25)

**GitHub Repo:** https://github.com/ocfish001-prog/homegrown
**Build:** ✅ Clean | **Bundle:** 87.4 kB (limit: 200 kB) | **Tests:** 2/2 ✅

### Delivered
- Next.js 14 + TypeScript strict mode
- Tailwind v3 + earthy palette (sage #7D9B76, cream #F5F0E8, bark #4A3728, mauve #9B7D8A)
- shadcn/ui configured
- Prisma schema: 7 tables (events, venues, categories, event_categories, organizers, vendor_listings, saved_events)
- PWA manifest + next-pwa
- Mobile-first layout shell (Header + Footer + skip-to-content)
- Honest empty state home page (no fake data)
- Vitest + Playwright configured
- GitHub Actions CI pipeline (typecheck → lint → test → e2e → Lighthouse CI)
- Security headers (vercel.json), .env removed from git

### Review Results
- QA: ✅ PASS (all 15 criteria met)
- Security: ✅ PASS WITH NOTES (.env fixed; pre-Phase-2 hardening: CSP header, next-pwa vuln)
- PM: ✅ APPROVED WITH NOTES (activate Instrument Serif on h1s; add contribution CTA to empty states)

---

## Phase 2 Prerequisites

- [ ] Supabase project created (dev environment)
- [ ] PostGIS extension enabled in Supabase
- [ ] `DATABASE_URL` + `DIRECT_URL` set in `.env.local`
- [ ] Run `npm run db:migrate` against dev DB
- [ ] Vercel project imported from GitHub
- [ ] GitHub secrets: `DATABASE_URL`, `DIRECT_URL`

---

## Open Questions

- Which event APIs have free tiers adequate for MVP? (Eventbrite, Meetup, library systems)
- Vercel Cron free tier: 1/day limit — GitHub Actions scheduler as alternative?
- Budget for paid API tiers?
- Domain acquired? (homegrown.app / homegrown.community)

---

## Done Items

- 2026-03-25: Phase 0 initiated, standards reviewed, project created
- 2026-03-25: Phase 1 complete — foundation scaffold, CI/CD, GitHub repo live

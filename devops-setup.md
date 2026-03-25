# DevOps Setup Guide — Homegrown

## Prerequisites
- Node.js 20+
- GitHub CLI (`gh`) authenticated
- Vercel CLI (optional for local deploy testing)

## GitHub Repository Setup
1. The repo should already be created at: https://github.com/ocfish001-prog/homegrown
2. If not, run: `gh repo create homegrown --public --description "Local enrichment and community discovery for homeschool families"`
3. Add repository secrets in GitHub Settings → Secrets:
   - `DATABASE_URL` — Supabase connection string (pooled)
   - `DIRECT_URL` — Supabase direct connection string
   - `LHCI_GITHUB_APP_TOKEN` — optional: Lighthouse CI GitHub App token

## Vercel Deployment Setup
1. Go to https://vercel.com/new
2. Import the GitHub repo: `ocfish001-prog/homegrown`
3. Framework: Next.js (auto-detected)
4. Add environment variables:
   - `DATABASE_URL` — Supabase connection string
   - `DIRECT_URL` — Supabase direct connection string
   - `NEXT_PUBLIC_DEFAULT_LAT=37.7749`
   - `NEXT_PUBLIC_DEFAULT_LNG=-122.4194`
   - `NEXT_PUBLIC_DEFAULT_RADIUS=50`
5. Deploy

## Supabase Setup
1. Create project at https://supabase.com
2. Enable PostGIS extension: Database → Extensions → postgis → Enable
3. Get connection strings from Settings → Database
4. Run migrations: `npm run db:migrate`
5. Verify with Prisma Studio: `npm run db:studio`

## CI/CD Pipeline
The pipeline runs on every push to main/develop and every PR:
1. TypeScript check → lint → unit tests → E2E tests → Lighthouse CI
2. All checks must pass before merge
3. Vercel auto-deploys on merge to main

## Environment Variables Reference
See `.env.example` for all required variables.

## Lighthouse Thresholds
- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 90
- SEO: ≥ 90

## Local Development Quick Start
```bash
npm install
cp .env.example .env.local
# Fill in DATABASE_URL and DIRECT_URL from Supabase
npm run db:migrate
npm run dev
```

## Branch Strategy
- `main` — production (auto-deploys to Vercel)
- `develop` — staging / integration branch
- Feature branches: `feat/feature-name`
- Bug fix branches: `fix/bug-description`

## Secrets Needed in GitHub Actions
| Secret | Description | Required |
|--------|-------------|----------|
| `DATABASE_URL` | Supabase pooled connection string | For E2E/build with real DB |
| `DIRECT_URL` | Supabase direct connection string | For migrations |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub App token | Optional |

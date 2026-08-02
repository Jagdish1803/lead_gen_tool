# Pitching Tool

Find local businesses → audit their web presence → write a personalized pitch →
send it over WhatsApp → track everything in one dashboard.

See [CONCEPT.md](./CONCEPT.md) for the full concept, decisions, and phased plan.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui**
- **Supabase** (Postgres) for data
- **SerpApi** for Google Maps results (Phase 1)
- **Baileys** for WhatsApp sending (Phase 4)
- AI writer — provider TBD (Phase 3)

## Status

- **Phase 0 — Foundation** ✅ app scaffold, UI shell, Postgres wiring, DB schema.
- **Phase 1 — Finder** ✅ SerpApi Google Maps search → dedupe → DB → live dashboard.

Next up: **Phase 2 — Auditor** (check each website: exists? speed, mobile, issues).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

### Environment

Copy `.env.local.example` → `.env.local` and fill in as you reach each phase:

| Var | Needed for | Where to get it |
|-----|-----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | data | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side writes | Supabase → Settings → API |
| `SERPAPI_KEY` | Phase 1 (Finder) | https://serpapi.com/manage-api-key |

### Database

Once your Supabase project exists, run [`supabase/schema.sql`](./supabase/schema.sql)
in the Supabase SQL editor to create the tables.

## Project layout

```
src/
  app/               # routes (dashboard, leads, searches, settings)
  components/        # UI (app-shell, forms) + components/ui (shadcn)
  lib/
    supabase/        # client.ts (browser) · server.ts (SSR) · admin.ts (service-role)
    types.ts         # domain types mirroring the schema
supabase/schema.sql  # database schema
```

# Fundle migration: Vercel+Render+Neon → $0 static + Supabase

This document is the cutover checklist for moving Fundle off the always-on
FastAPI/Render backend (the free-tier cold-start culprit) and Neon Postgres to a
**$0, zero-cold-start** setup:

- **GitHub Actions** builds the daily puzzle and writes it to **Supabase**.
- The **Next.js app on Vercel** is fully static; gameplay runs in the browser
  via a TypeScript port of the old backend logic (`apps/web/lib/engine.ts`).
- **Supabase** (free) stores the daily puzzle and community stats.
- **Render** and **Neon** are decommissioned.

## Architecture

```
GitHub Actions (cron 23:05 UTC ≈ 00:05–01:05 Amsterdam, + manual dispatch)
  → scripts/build_daily_puzzle.py  (pyfunda → obfuscated answer + payload)
  → UPSERT daily_puzzles in Supabase   (service_role key, idempotent)

Supabase (free Postgres + PostgREST)
  · daily_puzzles  — anon read; built only by the Action
  · puzzle_stats   — anon read; incremented via record_result() RPC

Next.js static on Vercel (no backend, no cold start)
  · fetch today's puzzle row (anon key)
  · local engine scores guesses / unlocks hints+photos → same PuzzleState as before
  · game state in localStorage; result + community stats via Supabase
```

The answer ships in the puzzle row but **obfuscated** (reversible, see
`apps/api/app/obfuscate.py` / `apps/web/lib/engine.ts`) — not encryption, just
enough that it isn't readable in the network tab. Acceptable for a casual game.

---

## Accounts & one-time setup

### 1. Supabase (new account if you don't have one) — free

1. Create an account at https://supabase.com and a **new project** (any region;
   pick EU for Dutch users). Free tier is ample: 500 MB Postgres.
2. In the project's **SQL editor**, run the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates `daily_puzzles`, `puzzle_stats`, RLS policies, and the
   `record_result` RPC.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → used as both `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe in the browser)
   - **`service_role` secret key** → `SUPABASE_SERVICE_ROLE_KEY` (secret — Action only)

> The daily Action writing a row keeps the project active, so the free-tier
> 7-day inactivity pause never triggers.

### 2. GitHub repository (existing) — Actions secrets & variables

In **Settings → Secrets and variables → Actions**:

- **Secrets**
  - `SUPABASE_URL` = your project URL
  - `SUPABASE_SERVICE_ROLE_KEY` = service_role key
- **Variables**
  - `PRICE_BUCKETS` = `150000:400000:0.20;400000:600000:0.30;600000:900000:0.30;900000:1400000:0.15;1400000::0.05`
    (or your preferred distribution)

The [`build-puzzle`](.github/workflows/build-puzzle.yml) workflow runs daily and
can be triggered manually (`Run workflow`) with an optional `date` and `force`.

### 3. Vercel (existing project) — environment variables

In the Vercel project **Settings → Environment Variables** (Production + Preview):

- `NEXT_PUBLIC_SUPABASE_URL` = your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key

Remove the old `NEXT_PUBLIC_API_URL`. Redeploy.

### 4. Local dev (optional)

Copy `fundle.config.env.example` → `fundle.config.env` and fill in the four
Supabase values + `PRICE_BUCKETS`. `npm run setup` / `npm run dev` syncs them to
`apps/api/.env` and `apps/web/.env.local`.

---

## Cutover steps

1. **Seed a puzzle.** Run the `build-puzzle` Action via *Run workflow* (or
   locally: `uv run --project apps/api python scripts/build_daily_puzzle.py`).
   Confirm a row appears in `daily_puzzles` with a non-plaintext `answer_token`.
2. **Deploy the frontend** to Vercel with the new env vars.
3. **Smoke test** the live site: puzzle loads, guesses score, hints/photos
   unlock, win/loss reveals the price + Funda link, community stats appear.
4. **Decommission** once verified:
   - Delete / suspend the **Render** API service (and any Render cron job).
   - Delete the **Neon** project.
   - (Optional) Remove the retained FastAPI server files
     (`apps/api/app/main.py`, `routes/`, `database.py`, `models.py`,
     `schemas.py`). They're kept only so `apps/api/tests/test_game.py` and the
     parity-fixture generator can run against the original logic; the production
     path doesn't use them.

## Rollback

The old FastAPI server code is still present until you delete it in step 4. To
roll back before deleting, repoint `NEXT_PUBLIC_API_URL` and revert
`apps/web/lib/api.ts` (git). After decommissioning Render/Neon, rollback means
redeploying those services.

## What changed in the repo

- **Added:** `supabase/migrations/0001_init.sql`, `.github/workflows/build-puzzle.yml`,
  `apps/api/app/obfuscate.py`, `apps/web/lib/{engine,supabase,gameStore}.ts`,
  `apps/web/components/CommunityStats.tsx`, parity fixtures + tests.
- **Changed:** `scripts/build_daily_puzzle.py` (publishes to Supabase),
  `apps/web/lib/api.ts` (local engine), `Game.tsx`, `ResultCard.tsx`,
  `scripts/{sync_config.py,dev.js}`, env examples, CI.
- **Unchanged:** the gameplay UX and the `PuzzleState` contract the UI consumes.

# Supabase setup

## Schema

[`schema.sql`](./schema.sql) is the full database schema (tables, RLS, the
`record_result` function). Run it once in the **Supabase SQL editor** on a fresh
project.

## Migrations

[`migrations/`](./migrations) holds incremental changes applied on top of the
schema. Run each file's contents in the SQL editor (or via the Supabase CLI) in
order.

### `0001_daily_puzzle_cron.sql` — daily puzzle trigger

Fires the **Build daily puzzle** GitHub Actions workflow at Amsterdam midnight
using `pg_cron` + `pg_net`, instead of relying on GitHub's own cron (which is
best-effort and often 15+ minutes late). One-time setup:

1. **Create a GitHub token** that can start the workflow.
   - GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate.
   - Repository access: only `tristan-deep/Fundle`.
   - Permissions: **Actions → Read and write**.
   - Copy the token (starts with `github_pat_…`).
   - _(A classic token with the `workflow` scope works too.)_

2. **Store the token in Supabase Vault.** In the SQL editor:
   ```sql
   select vault.create_secret('github_pat_xxx', 'github_pat_build_puzzle');
   ```
   (Or: Dashboard → Project Settings → Vault → New secret, name
   `github_pat_build_puzzle`.)

3. **Apply the migration** — paste the contents of
   `migrations/0001_daily_puzzle_cron.sql` into the SQL editor and run it. This
   enables the extensions, creates `trigger_daily_puzzle_build()`, and schedules
   two cron jobs (22:01 UTC for CEST, 23:01 UTC for CET — Amsterdam midnight in
   both seasons).

4. **Verify.**
   ```sql
   -- scheduled jobs exist
   select jobname, schedule, active from cron.job;

   -- fire it manually once and watch for a workflow run on GitHub
   select public.trigger_daily_puzzle_build();

   -- inspect recent cron runs / HTTP responses
   select * from cron.job_run_details order by start_time desc limit 5;
   select * from net._http_response order by created desc limit 5;
   ```
   A `201` from the GitHub API means the dispatch was accepted.

### `0002_fix_puzzle_number_epoch.sql` — realign puzzle numbering

One-time backfill: `puzzle_number` was originally computed from a hardcoded
`2026-01-01` epoch, so it drifted into looking like "day of the year" instead
of a Wordle-style count since Fundle's actual launch. Run this once in the SQL
editor to recompute every existing row's `puzzle_number` from the earliest
`puzzle_date` already in the table — the real day 1. The builder now derives
new puzzle numbers the same way (see `scripts/build_daily_puzzle.py`), so this
migration just realigns history with that logic; nothing further to configure.

### Notes

- If you fork to a different repo, update the `url` in
  `trigger_daily_puzzle_build()` and the `ref` (default branch) if it isn't
  `main`.
- The GitHub Actions workflow keeps a single daily **safety-net** cron
  (`5 6 * * *`) in case this trigger ever fails; the build script is idempotent,
  so it's a no-op on normal days.
- To change times: `select cron.unschedule('daily-puzzle-build-cest');` then
  re-run the relevant `cron.schedule(...)`.

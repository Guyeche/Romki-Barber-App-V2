# Database migrations

SQL for the Supabase (Postgres) database, in the order it must be run.

**These are not applied automatically.** Supabase's client keys can't run DDL, so there is no
tooling that executes these — every file here was pasted by hand into the
**Supabase Dashboard → SQL Editor** and run there. The same goes for anything added later.

## Status

All migrations below are **applied to the live/production database.** There is only one
database — production — so anything run here affects real customer bookings immediately.

| # | File | What it does | Applied |
|---|------|--------------|---------|
| 1 | `schema.sql` | Baseline: `appointments` + `blocked_days` tables, RLS. Declares `UNIQUE (date, time)` on appointments. | ✅ 2026-01-10 |
| 2 | `schedule_migration.sql` | `work_schedule` table (per-weekday opening hours) + RLS + seed rows. | ✅ 2026-01-14 |
| 3 | `settings_migration.sql` | `app_settings` key/value table + RLS; seeds `booking_window_days = 14`. | ✅ 2026-01-14 |
| 4 | `blocks_migration.sql` | `schedule_blocks` table (recurring + one-off breaks) + indexes + RLS. | ✅ 2026-07-06 |
| 5 | `appointments_unique_constraint_migration.sql` | Adds the `UNIQUE (date, time)` constraint that `schema.sql` declared but the live DB never actually had. | ✅ 2026-07-14 |

### Why #5 exists

`schema.sql` has always *declared* `UNIQUE (date, time)`, but the constraint was missing from the
real database — so double-submits created duplicate rows for one slot, which in turn made
cancellation look broken (cancel one row, the copies remain). The duplicates were cleaned up and
the constraint was finally added on 2026-07-14. It is what makes the `23505` (unique-violation)
handler in `app/actions.ts` → `bookAppointment` reachable.

On a **fresh** database, `schema.sql` creates the constraint on its own and #5 will fail as
redundant — that is expected. #5 exists only to repair the existing production DB.

## Adding a new migration

1. Add a `*.sql` file here. Lead with a comment explaining *why*, not just what.
2. Make it re-runnable where you reasonably can (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
3. Run it yourself in the Supabase SQL Editor.
4. Add a row to the table above so the next person knows it's already applied.

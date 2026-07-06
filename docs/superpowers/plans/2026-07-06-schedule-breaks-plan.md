# Schedule Breaks & Time Blocks — Implementation Plan

**Spec:** [docs/superpowers/specs/2026-07-06-schedule-breaks-design.md](../specs/2026-07-06-schedule-breaks-design.md)
**Branch:** feature/new-ui-design
**Stack reminder:** Next.js 14 (App Router), Supabase (no ORM, direct JS client), next-intl,
Tailwind (dark/gold theme tokens: `ink`, `coal`, `cream`, `gold`, `line`, `smoke`).

Slots are a fixed **20 minutes**. Block overlap test for a slot starting at `slotStart`:
`slotStart < block.end AND slotStart + 20min > block.start` (half-open `[start, end)`).

---

## Phase 0 — Database migration

**New file:** `blocks_migration.sql` (mirror the style of `schedule_migration.sql`).

```sql
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_of_week INT,                      -- 0..6, set for RECURRING
  date        DATE,                     -- YYYY-MM-DD, set for ONE-OFF
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT blocks_one_kind CHECK (
    (day_of_week IS NOT NULL AND date IS NULL) OR
    (day_of_week IS NULL AND date IS NOT NULL)
  ),
  CONSTRAINT blocks_valid_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dow  ON schedule_blocks (day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_date ON schedule_blocks (date);
```

Match RLS pattern of the existing tables (public read if `blocked_days`/`work_schedule`
are readable via anon; writes via service role). Confirm by reading
`schedule_migration.sql` / `schema.sql` before running.

**Verify:** run the migration in Supabase; insert a recurring row and a one-off row by
hand; confirm the two CHECK constraints reject (a) both keys set and (b) `end <= start`.

---

## Phase 1 — Shared block logic (pure, testable)

**New file:** `lib/blocks.ts`

```ts
export interface ScheduleBlock {
  day_of_week: number | null;
  date: string | null;        // 'YYYY-MM-DD'
  start_time: string;         // 'HH:MM' or 'HH:MM:SS'
  end_time: string;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// A 20-min slot starting at slotStart ('HH:MM') is blocked if it overlaps any block.
export function isSlotBlocked(slotStart: string, blocks: ScheduleBlock[], slotLen = 20) {
  const s = toMin(slotStart);
  const e = s + slotLen;
  return blocks.some(b => s < toMin(b.end_time) && e > toMin(b.start_time));
}

// Blocks that apply to a given date (weekday recurring + exact one-off).
export function blocksForDate(all: ScheduleBlock[], dateStr: string, weekday: number) {
  return all.filter(b =>
    (b.day_of_week === weekday) || (b.date === dateStr)
  );
}
```

Both the client picker and the server booking action import from here so the overlap rule
lives in exactly one place.

**Verify:** temporary Node/ts scratch test (or inline reasoning) — 13:00–14:00 block kills
13:00/13:20/13:40, leaves 12:40 and 14:00.

---

## Phase 2 — API layer

### 2a. Extend `app/api/schedule/route.ts`
- **GET:** also fetch `schedule_blocks` and return them: `{ schedule, bookingWindow, blocks }`.
  Return all rows (client filters per date). Cheap; table is tiny.
- **POST:** accept an optional `recurringBreaks` array (rows with `day_of_week`, `start_time`,
  `end_time`, `reason?`). Persist by **delete-all recurring + reinsert** (rows where
  `day_of_week IS NOT NULL`), mirroring how the hours upsert is a full replace. Do NOT touch
  one-off (`date`-set) rows.

### 2b. New `app/api/blocks/route.ts` (one-off blocks)
- **GET `?from=YYYY-MM-DD`:** list one-off blocks (`date IS NOT NULL`) on/after `from`
  (default today), ordered by `date, start_time`.
- **POST:** create one one-off block `{ date, start_time, end_time, reason? }`. Validate
  `end > start` server-side. Uses the service-role server client (`lib/server/supabase.ts`).
- **DELETE `?id=`:** delete one one-off block by id.

Guard both writable routes behind the `admin_session` cookie check (same pattern as
`admin/page.tsx` / `schedule/page.tsx`).

**Verify:** curl/Thunder each verb; confirm cookie guard rejects unauthenticated writes.

---

## Phase 3 — Booking enforcement (the real lock)

**Edit `app/actions.ts`, `bookAppointment()`**, immediately after the `blocked_days` check
(after line 153, before the insert at 155):

```ts
// 1b. Reject if the requested time falls inside a schedule block.
const weekday = new Date(date + 'T00:00:00').getDay();
const { data: blocks, error: blocksError } = await supabase
  .from('schedule_blocks')
  .select('day_of_week, date, start_time, end_time')
  .or(`day_of_week.eq.${weekday},date.eq.${date}`);

if (blocksError) throw new Error('Database error while checking schedule blocks.');

if (blocks && isSlotBlocked(time.substring(0,5), blocks)) {
  return { message: messages.timeUnavailable };
}
```

- Import `isSlotBlocked` from `lib/blocks`.
- Add `timeUnavailable` to the fallback `messages` object (lines 98–108) and to both i18n
  files (Phase 6).

**Verify:** create a one-off block for a test date+time, then attempt to book that exact
time via the real booking form → must return `timeUnavailable`. Book an adjacent free slot →
succeeds.

---

## Phase 4 — Customer picker subtracts blocks

**Edit `components/DateTimePicker.tsx`:**
- Read `blocks` from the `/api/schedule` GET response (already fetched at lines 49–83); store
  in state `const [blocks, setBlocks] = useState<ScheduleBlock[]>([])`.
- In `generateTimeSlots()` (lines 139–191), after building raw `slots` and before/with the
  past-time filter, drop blocked slots:

```ts
const dayStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1)
  .padStart(2,'0')}-${String(selectedDay.getDate()).padStart(2,'0')}`;
const dayBlocks = blocksForDate(blocks, dayStr, selectedDay.getDay());
const unblocked = slots.filter(s => !isSlotBlocked(s, dayBlocks));
```

Apply the existing past-time filter to `unblocked` instead of `slots`. Import helpers from
`lib/blocks`.

**Verify (preview tools):** set a recurring lunch 13:00–14:00; open the booking page; confirm
13:00/13:20/13:40 are gone and 14:00 is present. Add a one-off block on one date; confirm it
only affects that date.

---

## Phase 5 — Admin UI

### 5a. Recurring break — `app/[locale]/admin/schedule/ScheduleForm.tsx`
- Accept a new prop `initialBreaks: ScheduleBlock[]`; page (`schedule/page.tsx`) fetches
  recurring rows (`day_of_week IS NOT NULL`) and passes them in.
- Local state `breaks` keyed by `day_of_week` (one break per day, v1). For each active day row,
  render an optional **break Start / End** pair reusing `timeOptions` and the existing select
  styling. A day with no break start/end selected = no row saved.
- Add an **"Apply lunch to all active days"** control (a start/end pair + button) that fills
  every active day's break with the chosen range.
- `handleSave` sends `{ schedule, bookingWindow, recurringBreaks }` to `/api/schedule` POST.
- Validate break is inside that day's open hours before enabling save (guard rail; optional
  soft warning otherwise).

### 5b. One-off blocks — new page `app/[locale]/admin/time-off/`
- `page.tsx`: server component, `admin_session` guard (copy from `schedule/page.tsx`), fetch
  one-off blocks via server client, render `<TimeOffForm>`.
- `TimeOffForm.tsx`: client component.
  - Add form: **Date** (native date input, min = today), **Start / End** (`timeOptions`
    selects), **Reason** (text, optional) → POST `/api/blocks`, then `router.refresh()`.
  - List upcoming one-off blocks (date, time range, reason) each with a **Delete** →
    DELETE `/api/blocks?id=`.
  - Overlap note: after choosing date+range, fetch `/api/appointments?date=` and if any booked
    time falls in the window, show *"⚠ N booking(s) already exist in this window — they will be
    kept."* (informational only).
- Add a nav link to Time Off in the admin header (`admin/page.tsx`, next to the Schedule link)
  and on the schedule page header for symmetry.

### 5c. Quick "block from now" — `components/AdminDashboard.tsx` (+ small sheet component)
- Add a prominent **"Block time now"** button near the top of the dashboard.
- Opens a small sheet/modal (reuse the existing modal/portal pattern already in the codebase —
  see the My Bookings portal from commit 6044864) with presets **20 min · 1 hour · Rest of
  today** + optional reason.
- On confirm: compute `start` = next 20-min boundary from local now; `end` = start+20m / +60m,
  or the day's `work_schedule.end_time` for "Rest of today"; POST `/api/blocks` with today's
  date; `router.refresh()`.
- Same overlap note as 5b before confirming.

**Verify (preview tools):** exercise each of the three flows end-to-end; after each, reload the
customer booking page and confirm the affected slots disappear.

---

## Phase 6 — i18n

Add to **both** `messages/en.json` and `messages/he.json`:
- `booking.timeUnavailable` — EN "That time is no longer available. Please pick another." /
  HE equivalent.
- `admin.schedule.break`, `admin.schedule.breakStart`, `admin.schedule.breakEnd`,
  `admin.schedule.applyBreakAll`, `admin.schedule.noBreak`.
- `admin.timeOff.*` — `title`, `date`, `start`, `end`, `reason`, `add`, `delete`, `empty`,
  `overlapWarning` (with `{count}`).
- `admin.blockNow.*` — `button`, `title`, `preset20`, `preset1h`, `presetRestOfDay`, `reason`,
  `confirm`, `cancel`.

Keep Hebrew RTL consistent with existing admin strings.

**Verify:** switch locale to `he`; confirm all new UI is translated and RTL-correct.

---

## Phase 7 — Full manual regression

1. Recurring lunch on Sun–Thu, none on Fri → Fri shows full slots, others have the hole.
2. One-off block on a specific date → only that date affected; recurring still applies.
3. "Block time now → 1 hour" twice at different times same day → two holes, both enforced.
4. Booking attempt on a blocked slot via the real form → `timeUnavailable`; adjacent slot ok.
5. Existing appointment inside a newly-created break → appointment remains visible in admin;
   customer can't newly book that window.
6. Stale-page test: load booking page, create a block, then submit the now-blocked slot →
   server rejects.

---

## File change summary

| File | Change |
|---|---|
| `blocks_migration.sql` | **new** — `schedule_blocks` table |
| `lib/blocks.ts` | **new** — overlap helpers |
| `app/api/schedule/route.ts` | GET returns `blocks`; POST persists `recurringBreaks` |
| `app/api/blocks/route.ts` | **new** — one-off block CRUD (GET/POST/DELETE) |
| `app/actions.ts` | booking rejects blocked times |
| `components/DateTimePicker.tsx` | subtract blocks from generated slots |
| `app/[locale]/admin/schedule/ScheduleForm.tsx` | per-day recurring break inputs + apply-all |
| `app/[locale]/admin/schedule/page.tsx` | fetch + pass recurring breaks |
| `app/[locale]/admin/time-off/page.tsx` | **new** — one-off blocks page |
| `app/[locale]/admin/time-off/TimeOffForm.tsx` | **new** — add/list/delete one-off blocks |
| `components/AdminDashboard.tsx` | "Block time now" button + sheet |
| `app/[locale]/admin/page.tsx` | nav link to Time Off |
| `messages/en.json`, `messages/he.json` | new keys |

## Suggested commit breakpoints
1. Phase 0–1 (migration + `lib/blocks.ts`).
2. Phase 2–3 (API + booking enforcement) — backend lock complete.
3. Phase 4 (customer picker).
4. Phase 5a, 5b, 5c (admin UI, can be separate commits).
5. Phase 6 (i18n) — or fold each key set into its feature commit.

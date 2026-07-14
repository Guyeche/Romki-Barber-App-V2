# WhatsApp Weekly Broadcast — Implementation Plan

**Spec:** [docs/superpowers/specs/2026-07-14-whatsapp-weekly-broadcast-design.md](../specs/2026-07-14-whatsapp-weekly-broadcast-design.md)
**Branch:** main
**Stack reminder:** Next.js 14 (App Router), Supabase (no ORM, direct JS client), next-intl,
Tailwind (dark/gold theme tokens), Resend for email, deployed on Vercel.

Key existing patterns to mirror:
- Migrations are root-level `.sql` files the user pastes into the Supabase SQL Editor.
- Admin API routes check the `admin_session` cookie (see `app/api/blocks/route.ts`).
- Server-side Supabase service client: `lib/server/supabase.ts`.
- Settings live in `app_settings` key/value rows (see `app/api/schedule/route.ts`).
- Booking is created by `bookAppointment()` in `app/actions.ts` (the `/api/book` route
  is a legacy path that still works — hook both).

---

## Phase 0 — Database migration

**New file:** `whatsapp_broadcast_migration.sql` (root, style of `blocks_migration.sql`).

```sql
CREATE TABLE IF NOT EXISTS customers (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone      TEXT NOT NULL UNIQUE,          -- E.164, e.g. +972523885779
  name       TEXT,
  source     TEXT NOT NULL DEFAULT 'manual', -- 'import' | 'booking' | 'manual'
  opted_out  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_runs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at  TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  total       INT,
  sent        INT,
  failed      INT,
  status      TEXT NOT NULL,                -- 'success' | 'partial' | 'failed' | 'skipped'
  details     JSONB
);

ALTER TABLE customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_runs ENABLE ROW LEVEL SECURITY;
-- No anon policies: both tables are service-role only (all access goes through
-- admin/server routes using SUPABASE_SERVICE_KEY, which bypasses RLS).
```

Seed settings (same migration):

```sql
INSERT INTO app_settings (key, value) VALUES
  ('broadcast_enabled', 'false'),
  ('broadcast_template_name', 'weekly_booking_reminder')
ON CONFLICT (key) DO NOTHING;
```

**Verify:** run in Supabase SQL Editor (user pastes it); insert a test customer row;
confirm anon client cannot select from `customers`.

---

## Phase 1 — Shared pure logic

### 1a. `lib/phone.ts` (new)

```ts
// normalizeIsraeliPhone('052-388 5779') -> '+972523885779'
// Returns null for input that isn't a plausible mobile number.
export function normalizeIsraeliPhone(raw: string): string | null;
```

Rules: strip spaces/dashes/parentheses; `05X…` (10 digits) → `+9725X…`;
`9725…`/`+9725…` accepted; any other already-international `+<digits>` (8–15 digits)
passed through unchanged; everything else → `null`.

### 1b. `lib/whatsapp.ts` (new)

```ts
export function isStopMessage(text: string): boolean; // 'הסר' | 'stop' | 'unsubscribe', trim+lowercase
export async function sendTemplate(phone: string, templateName: string): Promise<void>; // throws on non-2xx
export async function sendText(phone: string, body: string): Promise<void>;             // opt-out confirmation
```

`sendTemplate` POSTs to
`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages` with
`{ messaging_product:'whatsapp', to, type:'template', template:{ name, language:{ code:'he' } } }`,
`Authorization: Bearer ${WHATSAPP_TOKEN}`. Include Meta's error message in thrown errors
(that's what lands in `broadcast_runs.details`).

**Verify:** unit-style scratch test for `normalizeIsraeliPhone` (formats, junk, foreign
numbers) and `isStopMessage` (Hebrew, casing, surrounding whitespace).

---

## Phase 2 — Broadcast route

**New file:** `app/api/broadcast/route.ts`

### GET (cron + dry run)
1. Require `Authorization: Bearer ${process.env.CRON_SECRET}` → else 401.
2. Read `broadcast_enabled` + `broadcast_template_name` from `app_settings`.
   Disabled → insert `broadcast_runs` row `{status:'skipped', details:{reason:'disabled'}}`, return.
3. Double-send guard: any run with `status IN ('success','partial')` and
   `started_at > now() - 12h` → insert `skipped` run `{reason:'recent-run'}`, return.
   (Dry/skipped/failed runs do NOT block.)
4. Fetch `customers` where `opted_out = false`, ordered by `id`.
5. `?dryRun=1` → insert run `{status:'skipped', total:N, details:{dryRun:true}}`, return
   the would-be recipient count. No Meta calls, no email.
6. Insert run row (`status:'failed'` placeholder), then loop: `sendTemplate()` per
   customer, collecting `{phone, error}` failures; continue on individual failures.
7. Update run: `finished_at`, `total`, `sent`, `failed`, status
   (`success` all sent / `partial` some / `failed` none), `details.errors`.
8. Summary email via `lib/resend.ts` to `BARBER_ADMIN_EMAIL`:
   subject "תפוצת וואטסאפ שבועית" with counts; include per-number errors when not `success`.
   Email failure must not fail the route (try/catch + console.error).

### POST (admin test-send)
- `admin_session` cookie guard (copy from `app/api/blocks/route.ts`).
- Body `{ phone }` → normalize → `sendTemplate()` → return ok/error.
- No `broadcast_runs` row.

**Verify:** local curl with/without the bearer token; `?dryRun=1` returns count and logs a
run; toggle `broadcast_enabled` off → `skipped`. (Real sends verified in Phase 7 rollout.)

---

## Phase 3 — Opt-out webhook

**New file:** `app/api/whatsapp/webhook/route.ts`

- **GET:** Meta verification — if `hub.mode=subscribe` and
  `hub.verify_token === WHATSAPP_WEBHOOK_VERIFY_TOKEN`, respond with `hub.challenge`
  (plain text 200); else 403.
- **POST:** parse Meta's change payload; for each inbound text message
  (`entry[].changes[].value.messages[]`, `type==='text'`):
  - `isStopMessage(text.body)` → normalize `from` (arrives as digits like `9725…`,
    prefix `+`) → `UPDATE customers SET opted_out=true WHERE phone=…`; then best-effort
    `sendText(from, 'הוסרת מרשימת התפוצה')` (allowed: inside the 24h service window).
  - Anything else → ignore.
  - Always return 200 quickly (Meta retries non-200s aggressively).

**Verify:** curl the GET handshake with right/wrong tokens; POST a captured sample Meta
payload with "הסר" → row flips to opted-out; POST junk body → still 200.

---

## Phase 4 — Customers admin API

**New file:** `app/api/customers/route.ts` — all verbs behind the `admin_session` guard,
service-role client.

- **GET:** all customers ordered `created_at desc`, plus last 10 `broadcast_runs`.
- **POST:** two shapes:
  - `{ name?, phone }` — single add (`source:'manual'`). 400 if normalize fails.
  - `{ import: string }` — bulk textarea payload. Per line: `phone` or `name, phone`
    (also tolerate `phone, name` by testing which half normalizes). Normalize, dedupe
    within the batch, `upsert … onConflict:'phone', ignoreDuplicates:true` with
    `source:'import'`. Return `{ added, skipped, invalid: string[] }`.
- **PATCH:** `{ id, opted_out }` — manual opt-out/in toggle.
- **DELETE:** `?id=` — remove a customer.

**Verify:** curl each verb; bulk-import a messy paste (dupes, bad lines, mixed formats)
and check the added/skipped/invalid counts and stored `+972…` values.

---

## Phase 5 — Booking hook

**New helper:** `lib/customers.ts` — `upsertCustomerFromBooking(name, phone)`:
normalize; on `null` do nothing; else upsert into `customers` with
`onConflict:'phone', ignoreDuplicates:true` and `source:'booking'` (never touches
`opted_out` or overwrites an existing row), then — only if the row existed with an empty
`name` — fill the name. Wrap fully in try/catch: a customers failure must never break a
booking.

Call it after the successful appointment insert in **both**:
- `app/actions.ts` `bookAppointment()` (the live path), and
- `app/api/book/route.ts` (legacy path).

**Verify:** make a booking through the real form → row appears with `source:'booking'`;
book again with the same phone → no duplicate, `opted_out` untouched.

---

## Phase 6 — Admin UI

### 6a. Page — `app/[locale]/admin/broadcast/page.tsx` (new)
Server component; `admin_session` guard + structure copied from
`app/[locale]/admin/schedule/page.tsx`. Fetch customers, last runs, and the two
settings server-side; render `<BroadcastManager …/>`.

### 6b. `app/[locale]/admin/broadcast/BroadcastManager.tsx` (new, client)
Sections top to bottom (Hebrew, RTL, existing dark/gold styling):
1. **Status card** — enabled toggle (POSTs `app_settings` via a small `PUT` on
   `/api/customers` or reuse the schedule settings pattern), next send time
   ("מוצ״ש ~20:30"), template name + read-only preview text, note that wording is edited
   in Meta Business Manager.
2. **Test send** — phone input + button → `POST /api/broadcast`.
3. **Bulk import** — textarea + button → `POST /api/customers {import}` → result
   summary (added/skipped/invalid with the invalid lines listed).
4. **Customer table** — name, phone, source badge, opted-out badge; per-row opt-out
   toggle (PATCH) and delete (DELETE) with confirm.
5. **Run history** — last runs: date, status chip, sent/failed; expandable error list.

### 6c. Nav link
Add a "תפוצה" link in the admin header of `app/[locale]/admin/page.tsx` next to the
Schedule/Time-Off links.

**Verify (preview tools):** exercise toggle, import, single add, opt-out flip, delete,
test-send (against dryRun/mocked env locally), run-history rendering; check RTL and
mobile width.

---

## Phase 7 — Cron, env, onboarding docs

### 7a. `vercel.json` (new at root — project currently has none)
```json
{ "crons": [{ "path": "/api/broadcast", "schedule": "30 17 * * 6" }] }
```
(= Saturday 20:30 Israel in summer / 19:30 in winter; Vercel sends the `CRON_SECRET`
bearer automatically once the env var exists.)

### 7b. `WHATSAPP_SETUP.md` (new, style of `VERCEL_SETUP.md`)
Step-by-step Meta onboarding per the spec: business portfolio → WABA → dedicated
number (SIM/virtual, receives one verification SMS) → business verification → Hebrew
template creation + approval → system user + permanent token → webhook URL/verify
token configuration → Vercel env vars (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `CRON_SECRET`). Include the 250-recipients/day
new-number note and the rollout order.

### 7c. Update `VERCEL_SETUP.md`
Add the four new env vars to the mandatory table (marked "WhatsApp broadcast only").

**Verify:** after deploy, Vercel dashboard shows the cron; manual
`curl -H "Authorization: Bearer $CRON_SECRET" …/api/broadcast?dryRun=1` on prod works.

---

## Phase 8 — i18n

Add to **both** `messages/en.json` and `messages/he.json` under `admin.broadcast.*`:
`title`, `enabled`, `disabled`, `nextSend`, `template`, `templateNote`, `testSend`,
`testPhone`, `import`, `importPlaceholder`, `importResult` (with `{added}/{skipped}/{invalid}`),
`customers`, `name`, `phone`, `source`, `optedOut`, `optOut`, `optIn`, `delete`,
`confirmDelete`, `runs`, `runStatus.success|partial|failed|skipped`, `sent`, `failedCount`,
plus the nav label. Hebrew is the primary UI; keep EN parity.

**Verify:** switch locales; no missing-key warnings; RTL correct.

---

## Phase 9 — Rollout & regression (manual, with the user)

1. User pastes `whatsapp_broadcast_migration.sql` into Supabase SQL Editor.
2. User completes `WHATSAPP_SETUP.md` (Meta side) and adds env vars to Vercel; deploy.
3. Import the real list via the admin page; spot-check normalization.
4. Test-send to the barber's own number → message arrives from the new business number.
5. Reply "הסר" from that phone → row flips to opted-out, confirmation received; flip back.
6. `dryRun=1` on prod → count matches list minus opted-out.
7. Enable the toggle; observe the first Saturday run; confirm the summary email and
   `broadcast_runs` row; confirm the 12h guard by re-curling the route right after
   (→ `skipped`).

---

## File change summary

| File | Change |
|---|---|
| `whatsapp_broadcast_migration.sql` | **new** — `customers`, `broadcast_runs`, seed settings |
| `lib/phone.ts` | **new** — Israeli phone normalization |
| `lib/whatsapp.ts` | **new** — Meta Cloud API client + stop-word matcher |
| `lib/customers.ts` | **new** — booking→customers upsert helper |
| `app/api/broadcast/route.ts` | **new** — weekly send (GET cron/dryRun) + test-send (POST) |
| `app/api/whatsapp/webhook/route.ts` | **new** — Meta webhook: verify + opt-out |
| `app/api/customers/route.ts` | **new** — admin CRUD + bulk import |
| `app/actions.ts` | call `upsertCustomerFromBooking` after successful booking |
| `app/api/book/route.ts` | same hook on the legacy path |
| `app/[locale]/admin/broadcast/page.tsx` | **new** — admin page (guarded) |
| `app/[locale]/admin/broadcast/BroadcastManager.tsx` | **new** — client UI |
| `app/[locale]/admin/page.tsx` | nav link |
| `vercel.json` | **new** — weekly cron |
| `WHATSAPP_SETUP.md` | **new** — Meta onboarding guide |
| `VERCEL_SETUP.md` | document new env vars |
| `messages/en.json`, `messages/he.json` | `admin.broadcast.*` keys |

## Suggested commit breakpoints
1. Phase 0–1 (migration + pure libs).
2. Phase 2–3 (broadcast route + webhook) — backend complete.
3. Phase 4–5 (customers API + booking hook).
4. Phase 6 (admin UI) + Phase 8 (i18n).
5. Phase 7 (cron + docs).

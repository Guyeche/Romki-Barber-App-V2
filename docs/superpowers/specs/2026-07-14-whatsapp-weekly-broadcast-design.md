# WhatsApp Weekly Broadcast — Design

**Date:** 2026-07-14
**Branch:** main
**Status:** Approved, ready for implementation plan

## Problem

Every week the barber manually sends the same promotional message ("book your slot"
style) to his customer list over WhatsApp, using a broadcast list kept inside his
personal WhatsApp app. He wants this to happen automatically, every week at a set
time, with no manual step.

Constraints established during brainstorming:

- The list is **50–256 customers** and today lives only in his WhatsApp broadcast list.
- The message is the **same fixed text every week** (no weekly editing needed).
- The barber **chats 1-on-1 with customers daily** from his personal number; that
  number must keep working normally in the WhatsApp app on his phone.
- A **WhatsApp Business number is acceptable** as the sender — it does not have to be
  his personal number.
- Default send time: **Saturday evening (after Shabbat), ~20:30 Israel time.**
- List upkeep going forward: **one-time import** of existing numbers, then
  **auto-add** every customer who books through the app, plus manual add/remove.

## Approach (chosen)

**Official Meta WhatsApp Cloud API on a new dedicated business number, triggered by
Vercel Cron, implemented entirely inside the existing Next.js + Supabase codebase.**

Weekly flow: Vercel Cron (Saturday evening) → secured Next.js API route → read
customer list from Supabase → send an approved template message to each number via
Meta's Graph API → log results → email the barber a summary via the existing Resend
integration.

Rejected alternatives:

- **Unofficial gateways that puppet his personal account** (Green API, whatsapp-web.js,
  etc.): the only way to send from his exact personal number, but they violate
  WhatsApp's ToS and risk getting the number banned — unacceptable for a number he
  uses daily. Ruled out once a business number was deemed acceptable.
- **Twilio (BSP wrapper over the same Meta platform):** friendlier onboarding but adds
  a per-message markup and a second paid account for no architectural benefit.
- **Supabase pg_cron + Edge Function:** precise scheduling, but introduces a new
  runtime (Deno Edge Functions) and splits code/secrets across two platforms. Vercel
  Cron's up-to-an-hour timing drift on the Hobby plan is acceptable for a weekly
  marketing blast.

### Key platform constraint

Business-initiated marketing messages on the official API **must use a pre-approved
message template**. The message text therefore lives in Meta Business Manager, not in
our database. Since the text is fixed, this is a one-time approval. To change the
wording later, the barber edits the template in Meta's dashboard (re-approval usually
minutes to a day); the app references the template only by name. The admin page shows
a read-only preview — it is not a free-text editor.

## Data model

Two new tables, delivered as a root-level migration file
(`whatsapp_broadcast_migration.sql`) that the user pastes into the Supabase SQL
Editor, matching the project's existing migration workflow.

```
customers                       -- the broadcast list
├─ id          BIGINT        PK, auto-generated
├─ phone       TEXT          NOT NULL UNIQUE   -- normalized E.164: +9725XXXXXXXX
├─ name        TEXT          NULL
├─ source      TEXT          NOT NULL default 'manual'  -- 'import' | 'booking' | 'manual'
├─ opted_out   BOOLEAN       NOT NULL default false
└─ created_at  TIMESTAMPTZ   default now()

broadcast_runs                  -- one row per weekly run (history + diagnostics)
├─ id           BIGINT       PK, auto-generated
├─ started_at   TIMESTAMPTZ  default now()
├─ finished_at  TIMESTAMPTZ  NULL
├─ total        INT          NULL   -- recipients attempted
├─ sent         INT          NULL
├─ failed       INT          NULL
├─ status       TEXT         NOT NULL  -- 'success' | 'partial' | 'failed' | 'skipped'
└─ details      JSONB        NULL   -- per-number errors, skip reason, etc.
```

RLS follows the existing pattern: service-role access from server routes; no anon
access to either table.

Settings stored in the existing `app_settings` key/value table:

- `broadcast_enabled` — `'true'`/`'false'`, master switch (default `'false'` until rollout).
- `broadcast_template_name` — the approved Meta template's name.

New environment variables (added to Vercel alongside the existing ones):

- `WHATSAPP_TOKEN` — permanent system-user access token.
- `WHATSAPP_PHONE_NUMBER_ID` — the Cloud API phone-number id of the dedicated number.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — shared secret for Meta's webhook verification handshake.
- `CRON_SECRET` — Vercel-provided; authenticates cron calls to the broadcast route.

## Components

### 1. Broadcast route — `app/api/broadcast/route.ts`

Called by Vercel Cron (`vercel.json` entry: `30 17 * * 6` UTC → 20:30 Israel summer /
19:30 winter; both safely after Shabbat). Also callable manually for tests.

Logic, in order:

1. Reject unless the request carries `Authorization: Bearer ${CRON_SECRET}`.
2. If `broadcast_enabled` is `'false'` → record a `skipped` run and exit.
3. If a run with status `success` or `partial` started within the last 12 hours →
   record `skipped` (double-send guard). Dry runs and `skipped`/`failed` runs do not
   block, so a dry run or a fixed failure never prevents the real send.
4. Fetch all `customers` where `opted_out = false`.
5. Insert a `broadcast_runs` row; loop the list calling Meta's Cloud API
   (`POST graph.facebook.com/v21.0/{phone-number-id}/messages`, type `template`,
   Hebrew locale). Per-number failures are recorded and the loop continues.
6. Update the run row with counts and final status
   (`success` = all sent, `partial` = some failed, `failed` = none sent / fatal error
   such as expired token or paused template).
7. Send the barber a summary email via `lib/resend.ts` ("Broadcast: 212 sent, 3
   failed"), including error details on `partial`/`failed` so nothing fails silently.

Supports `?dryRun=1`: performs every step except the Meta calls and the summary email;
records a run with status `skipped` and `details.dryRun = true`.

Test-send support: `POST` with a single phone number (admin-authenticated, same auth
as other admin API routes) sends the real template to just that number and does not
create a `broadcast_runs` row.

### 2. Opt-out webhook — `app/api/whatsapp/webhook/route.ts`

Required by Meta policy, and practically important: recipients who cannot opt out
press "block", which lowers the number's quality rating until Meta throttles it.

- `GET` — Meta's verification handshake (echo `hub.challenge` when
  `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).
- `POST` — inbound message events. If the text matches a stop word
  (`הסר`, `stop`, `unsubscribe`, case/whitespace-insensitive) → set
  `opted_out = true` for that phone and reply with a one-line confirmation (allowed
  free-form, since it is within the 24-hour customer-service window opened by their
  message). All other inbound messages are acknowledged with HTTP 200 and ignored.

### 3. Admin "Broadcast" page

New tab in the existing admin area, Hebrew UI like the rest, backed by a new admin
API route (`app/api/customers/route.ts`) following the existing admin-route pattern.

- Master on/off toggle + display of the next scheduled send.
- Customer table: name, phone, source, opted-out badge; manual add and remove;
  manual opt-out/opt-in toggle.
- **Bulk import textarea** (the one-time migration): paste numbers one per line, or
  `name, phone` CSV lines. The app normalizes Israeli formats
  (`052-388-5779` → `+972523885779`), dedupes against existing rows, inserts with
  `source = 'import'`, and reports added/skipped/invalid counts.
- Run history table from `broadcast_runs`: date, sent/failed counts, status, and
  expandable per-number errors.
- Read-only preview of the template text + a note that editing happens in Meta
  Business Manager.
- **"Send test to this number"** button (uses the test-send API described above).

### 4. Booking hook

In the existing booking flow (`app/api/book/route.ts`), after a successful booking:
upsert the customer's normalized phone into `customers` with `source = 'booking'`
and the booking's customer name (name is filled only when the row is new or its name
is empty). The upsert never modifies an existing row's `opted_out` value — someone who opted out
stays opted out even if they book again.

### 5. Phone normalization utility — `lib/phone.ts`

Single shared function used by import, booking hook, and webhook matching:
`0523885779` / `052-388-5779` / `+972 52-388-5779` → `+972523885779`. Rejects
strings that don't yield a plausible Israeli mobile number (`+9725XXXXXXXX`);
non-Israeli numbers already in international format are passed through as-is.

## Error handling summary

| Failure | Behavior |
| --- | --- |
| Expired/invalid token, template paused or rejected | Run marked `failed`; details in run row + summary email |
| Individual number invalid / not on WhatsApp | Logged in `details`, loop continues; run marked `partial` |
| Cron fires twice / manual + cron overlap | 12-hour guard → second run recorded as `skipped` |
| Broadcast disabled | Run recorded as `skipped` (visible in history, so "why didn't it send?" is answerable) |
| Webhook receives non-text or unrecognized message | 200 OK, ignored |

## Meta onboarding (one-time, manual)

Documented step-by-step in a new `WHATSAPP_SETUP.md` (same spirit as
`VERCEL_SETUP.md`):

1. Create a Meta Business portfolio and a WhatsApp Business account.
2. Acquire a **new dedicated number** (cheap SIM or virtual number that can receive
   one verification SMS) — the barber's personal number is untouched.
3. Register the number with Cloud API and complete business verification.
4. Create the Hebrew marketing template with the fixed weekly text (including a
   booking link) and submit for approval.
5. Create a system user and generate a permanent access token.
6. Configure the webhook URL + verify token in the Meta app dashboard.
7. Add the env vars to Vercel.

Expect 1–3 days of waiting on Meta approvals, all before the feature goes live.
Note: a brand-new number starts with a **250 unique recipients / 24h** messaging
limit — sufficient for the current list (≤256; at worst a handful of customers roll
to the next day's run once, and in practice the limit rises automatically to 1,000+
after a few quality sends).

## Costs

- Meta marketing-conversation rate for Israel: roughly $0.02–0.04 per message →
  ~$4–8/week for ~200 customers. No platform middleman fees.
- Vercel Cron: free (Hobby plan allows this; send time may drift up to ~1 hour —
  acceptable for a weekly blast; the Pro plan is precise if it ever matters).

## Testing

- Unit tests: phone normalization (formats, junk input) and stop-word matching.
- `?dryRun=1` on the broadcast route: full pipeline without Meta calls.
- Admin test-send button: real template to the barber's own number before go-live.
- Rollout sequence: run migration → Meta onboarding → import list → test-send →
  enable toggle → observe first real Saturday run (summary email confirms).

## Out of scope (YAGNI)

- Per-customer personalization or dynamic content (open slots, names) in the message.
- Multiple schedules or multiple message templates.
- Two-way conversation handling beyond opt-out (replies land in the WhatsApp
  Business app on whatever device is logged into the new number, if the barber
  chooses to install it — not this app's concern).
- Delivery-status (read receipt) tracking via webhooks.

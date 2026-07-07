-- Restore the double-booking guard on `appointments`.
--
-- WHY: schema.sql declares `UNIQUE (date, time)` on appointments ("Prevent double
-- booking"), but the live database was missing it. Without it, nothing stopped two
-- rows for the same slot, so double-submits created 2-4 identical appointments.
-- That made cancellation look broken: cancelling one row left the duplicates behind,
-- for both customers and the barber. The booking code in app/actions.ts already
-- handles the resulting unique-violation (Postgres error 23505 -> "time slot booked"),
-- so this constraint simply re-activates protection the code already expects.
--
-- PREREQUISITE: existing duplicate rows were removed first (kept the earliest booking
-- per slot). This migration will FAIL if any (date, time) still has more than one row.
--
-- Run this in the Supabase Dashboard -> SQL Editor.

ALTER TABLE appointments
  ADD CONSTRAINT appointments_date_time_unique UNIQUE (date, time);

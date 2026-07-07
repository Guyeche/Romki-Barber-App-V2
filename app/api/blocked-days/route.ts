import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../lib/server/supabase';

// Whole-day blocks (vacations / days off). Each blocked day is a row in
// `blocked_days` (date + optional reason). Booking enforcement already respects
// this table in app/actions.ts and the customer DateTimePicker.
// A "vacation" is simply a contiguous range of blocked days sharing a reason.

function isAdmin(): boolean {
  const session = cookies().get('admin_session');
  return session?.value === 'true';
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

// Build the inclusive list of 'YYYY-MM-DD' dates from `from` to `to` (UTC, no TZ drift).
function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// GET /api/blocked-days?from=YYYY-MM-DD  -> upcoming blocked days on/after `from` (default today)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('blocked_days')
    .select('id, date, reason')
    .gte('date', from)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching blocked days:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ days: data ?? [] });
}

// POST /api/blocked-days  { from, to, reason? }  -> block every day in the range
export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { from, to, reason } = await request.json();

    if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return NextResponse.json({ error: 'Missing or invalid from/to date' }, { status: 400 });
    }
    if (to < from) {
      return NextResponse.json({ error: 'to must be on or after from' }, { status: 400 });
    }

    const dates = datesInRange(from, to);
    if (dates.length > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: `Range too large (max ${MAX_RANGE_DAYS} days)` }, { status: 400 });
    }

    const rows = dates.map((date) => ({ date, reason: reason || null }));

    // Upsert so overlapping/duplicate days don't error (date is UNIQUE).
    const { data, error } = await supabase
      .from('blocked_days')
      .upsert(rows, { onConflict: 'date' })
      .select('id, date, reason');

    if (error) {
      console.error('Error creating blocked days:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Informational: how many existing appointments fall inside the vacation.
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .gte('date', from)
      .lte('date', to);

    return NextResponse.json({ days: data ?? [], existingBookings: count ?? 0 });
  } catch (e) {
    console.error('Server error creating blocked days:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/blocked-days?ids=1,2,3  -> remove those blocked days (a whole vacation range)
export async function DELETE(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  if (!idsParam) {
    return NextResponse.json({ error: 'Missing ids' }, { status: 400 });
  }
  const ids = idsParam
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n));
  if (ids.length === 0) {
    return NextResponse.json({ error: 'No valid ids' }, { status: 400 });
  }

  const { error } = await supabase.from('blocked_days').delete().in('id', ids);

  if (error) {
    console.error('Error deleting blocked days:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '../../../lib/server/supabase';

// One-off schedule blocks (rows where `date` is set). Recurring breaks are managed
// via /api/schedule. Writes require the admin_session cookie.

function isAdmin(): boolean {
  const session = cookies().get('admin_session');
  return session?.value === 'true';
}

// GET /api/blocks?from=YYYY-MM-DD  -> upcoming one-off blocks on/after `from` (default today)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('schedule_blocks')
    .select('id, date, start_time, end_time, reason')
    .not('date', 'is', null)
    .gte('date', from)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching one-off blocks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: data ?? [] });
}

// POST /api/blocks  { date, start_time, end_time, reason? }  -> create one one-off block
export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { date, start_time, end_time, reason } = await request.json();

    if (!date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing date/start_time/end_time' }, { status: 400 });
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('schedule_blocks')
      .insert([{ day_of_week: null, date, start_time, end_time, reason: reason ?? null }])
      .select('id, date, start_time, end_time, reason')
      .single();

    if (error) {
      console.error('Error creating one-off block:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ block: data });
  } catch (e) {
    console.error('Server error creating block:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/blocks?id=123  -> remove one one-off block
export async function DELETE(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Guard: only delete one-off rows, never recurring breaks.
  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', id)
    .not('date', 'is', null);

  if (error) {
    console.error('Error deleting one-off block:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

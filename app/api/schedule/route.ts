import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/server/supabase';

export async function GET() {
  // Fetch Schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('work_schedule')
    .select('*')
    .order('day_of_week', { ascending: true });

  if (scheduleError) {
    console.error('Error fetching schedule:', scheduleError);
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }

  // Fetch Settings
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_window_days')
    .single();

  const bookingWindow = settings?.value ? parseInt(settings.value) : 14;

  // Fetch all schedule blocks (recurring + one-off). The client filters per date.
  const { data: blocks, error: blocksError } = await supabase
    .from('schedule_blocks')
    .select('day_of_week, date, start_time, end_time, reason');

  if (blocksError) {
    console.error('Error fetching schedule blocks:', blocksError);
  }

  return NextResponse.json({ schedule, bookingWindow, blocks: blocks ?? [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schedule, bookingWindow, recurringBreaks } = body;

    if (schedule && Array.isArray(schedule)) {
        // Exclude 'id' because it's GENERATED ALWAYS and cannot be manually updated/inserted
        // We upsert based on 'day_of_week' which is unique
        const sanitizedSchedule = schedule.map(({ id, ...rest }: any) => rest);

        const { error: scheduleError } = await supabase
            .from('work_schedule')
            .upsert(sanitizedSchedule, { onConflict: 'day_of_week' });

        if (scheduleError) {
            console.error('Error updating schedule:', scheduleError);
            return NextResponse.json({ error: scheduleError.message }, { status: 500 });
        }
    }

    if (bookingWindow) {
        const { error: settingsError } = await supabase
            .from('app_settings')
            .upsert({ key: 'booking_window_days', value: bookingWindow.toString() });

        if (settingsError) {
             console.error('Error updating settings:', settingsError);
             return NextResponse.json({ error: settingsError.message }, { status: 500 });
        }
    }

    // Recurring breaks are saved as a full replace of the recurring set (rows where
    // day_of_week IS NOT NULL). One-off blocks (date IS NOT NULL) are never touched here.
    if (recurringBreaks && Array.isArray(recurringBreaks)) {
        const { error: deleteError } = await supabase
            .from('schedule_blocks')
            .delete()
            .not('day_of_week', 'is', null);

        if (deleteError) {
            console.error('Error clearing recurring breaks:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        // Only insert well-formed rows (both times present, end > start).
        const rows = recurringBreaks
            .filter((b: any) =>
                b && b.day_of_week != null && b.start_time && b.end_time &&
                b.start_time < b.end_time
            )
            .map((b: any) => ({
                day_of_week: b.day_of_week,
                date: null,
                start_time: b.start_time,
                end_time: b.end_time,
                reason: b.reason ?? null,
            }));

        if (rows.length > 0) {
            const { error: insertError } = await supabase
                .from('schedule_blocks')
                .insert(rows);

            if (insertError) {
                console.error('Error inserting recurring breaks:', insertError);
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
      console.error('Server error updating schedule:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

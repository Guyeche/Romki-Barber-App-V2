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

  return NextResponse.json({ schedule, bookingWindow });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { schedule, bookingWindow } = body;

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

    return NextResponse.json({ success: true });
  } catch (error) {
      console.error('Server error updating schedule:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

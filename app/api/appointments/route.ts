import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/server/supabase'; // Use the secure server client

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('time')
      .eq('date', date);

    if (error) {
      console.error('Error fetching appointments:', error);
      throw new Error('Failed to fetch appointments.');
    }

    // The data returned is an array of objects, e.g., [{ time: '10:00:00' }, { time: '11:30:00' }]
    // We just need the time values in a simple array, formatted as HH:MM.
    const bookedTimes = data.map(appointment => appointment.time.substring(0, 5));

    return NextResponse.json(bookedTimes);

  } catch (error) {
    console.error('Error in /api/appointments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

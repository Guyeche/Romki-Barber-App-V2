
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { customer_name, phone, email, date, time } = await request.json();

    // --- Start: Debugging Double-Booking ---
    console.log('Checking for existing booking with:', { date, time });
    const { data: existingAppointment, error: existingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', date)
      .eq('time', time)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is not an error in this case.
      console.error('Error checking for existing booking:', existingError);
    }
    console.log('Found existing appointment:', existingAppointment);
    // --- End: Debugging Double-Booking ---

    if (existingAppointment) {
      console.log('Booking conflict found. Aborting.');
      return NextResponse.json({ error: 'This time slot is already booked.' }, { status: 409 });
    }

    // Insert the new appointment
    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert([{ customer_name, phone, email, date, time, status: 'pending' }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting appointment:', insertError);
      return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 });
    }

    // --- Start: Robust Email Sending ---
    try {
      // Send email notification to the barber
      if (process.env.BARBER_ADMIN_EMAIL) {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: process.env.BARBER_ADMIN_EMAIL,
          subject: 'New Booking Confirmation',
          html: `
            <h1>New Booking</h1>
            <p><strong>Name:</strong> ${customer_name}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
          `,
        });
      }

      // Send confirmation email to the customer
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Your Appointment is Confirmed!',
        html: `
          <h1>Appointment Confirmed</h1>
          <p>Hello ${customer_name}, your appointment is confirmed for ${date} at ${time}.</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send emails:', emailError);
      // Do not block the booking confirmation even if emails fail.
    }
    // --- End: Robust Email Sending ---

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error) {
    console.error('Error in booking API:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

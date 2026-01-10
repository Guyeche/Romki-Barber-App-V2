'use server'

import { z } from 'zod'
import { supabase } from '../lib/server/supabase'
import { resend } from '../lib/resend'
import { getCustomerConfirmationHTML, getAdminNotificationHTML } from '../lib/email/templates';
import { createCalendarEvent } from '../lib/google/calendar';

// Define the shape of the form state
interface AppointmentFormState {
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    service?: string[];
    date?: string[];
    time?: string[];
  };
}

const schema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  service: z.string(),
  date: z.string().min(1, { message: 'Date is required' }),
  time: z.string().min(1, { message: 'Time is required' }),
})

// Helper to format date to DD/MM/YYYY
const formatIsraeliDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export async function bookAppointment(prevState: AppointmentFormState | undefined, formData: FormData): Promise<AppointmentFormState> {
  const validatedFields = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    service: formData.get('service'),
    date: formData.get('date'),
    time: formData.get('time'),
  })

  if (!validatedFields.success) {
    return {
      message: 'Validation failed. Please check your input.',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, date, time, service } = validatedFields.data;
  const adminEmail = process.env.BARBER_ADMIN_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
      console.error('CRITICAL: RESEND_FROM_EMAIL environment variable is not set.');
      return { message: 'Server configuration error. Could not send emails.' };
  }

  let newAppointmentId: number | null = null;

  try {
    // 1. Check if the day is blocked
    const { data: blockedDay, error: blockedDayError } = await supabase
      .from('blocked_days')
      .select('id')
      .eq('date', date)
      .single();

    if (blockedDayError && blockedDayError.code !== 'PGRST116') { // PGRST116: no rows found
      throw new Error('Database error while checking for blocked days.');
    }

    if (blockedDay) {
      return { message: 'This day is unavailable for booking. Please choose another date.' };
    }

    // 2. Try to insert the new appointment.
    // The UNIQUE constraint on (date, time) will prevent double bookings.
    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert([{
        customer_name: name, 
        email: email,
        date: date,
        time: time,
        // service: service, // Assuming service maps to a duration later
        status: 'confirmed' // Or 'pending' if you have a confirmation step
      }])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return { message: 'This time slot is already booked. Please choose another time.' };
      }
      console.error('Supabase insert error:', insertError);
      throw new Error('Failed to create the appointment in the database.');
    }
    
    newAppointmentId = newAppointment.id;

    // 3. Send emails
    try {
      if (adminEmail) {
        await resend.emails.send({
          from: fromEmail,
          to: adminEmail,
          subject: 'New Booking Notification',
          html: getAdminNotificationHTML(newAppointment),
        });
      }

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Your Appointment is Confirmed!',
        html: getCustomerConfirmationHTML(newAppointment),
      });

    } catch (emailError) {
      console.error('Critical error: Emails failed to send after booking was created:', emailError);
      // Re-throw to trigger the rollback in the outer catch block
      throw new Error('Failed to send confirmation emails.');
    }

    // 4. Create calendar event
    try {
      await createCalendarEvent(newAppointment);
    } catch (calendarError) {
        console.error('Failed to create Google Calendar event:', calendarError);
        // Re-throw to trigger the rollback in the outer catch block
        throw new Error('Failed to create calendar event.');
    }

    return { message: `Success! Your appointment is confirmed for ${formatIsraeliDate(date)} at ${time}.` };

  } catch (error) {
    // If any step after the insert fails, we need to roll back the booking.
    if (newAppointmentId) {
      console.log(`Attempting to roll back booking with ID: ${newAppointmentId}`);
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', newAppointmentId);

      if (deleteError) {
        console.error('CRITICAL: FAILED TO ROLL BACK BOOKING. MANUAL INTERVENTION REQUIRED.', deleteError);
        return { message: 'A critical server error occurred and we could not fully save your booking. Please contact us directly.' };
      }
    }
    
    console.error('An unexpected error occurred in bookAppointment:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
    return { message: `An error occurred: ${errorMessage} Please try again.` };
  }
}

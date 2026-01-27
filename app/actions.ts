'use server'

import { z } from 'zod'
import { supabase } from '../lib/server/supabase'
import { resend } from '../lib/resend'
import { getCustomerConfirmationHTML, getAdminNotificationHTML } from '../lib/email/templates';
import { createCalendarEvent, deleteCalendarEvent } from '../lib/google/calendar';
import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { formatIsraeliDate } from '../lib/date-utils'

// --- INTERFACES & SCHEMAS ---

interface AppointmentFormState {
  message: string;
  success?: boolean;
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

// --- ADMIN ACTIONS (Login, Logout, Cancel) ---
import { processCancellation } from '../lib/appointments'

// 1. LOGIN ACTION
export async function login(prevState: any, formData: FormData) {
  const password = (formData.get('password') as string || '');

  // LOAD CREDENTIALS FROM .ENV
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Basic check to ensure env vars are set
  if (!adminPassword) {
    console.error('Missing Admin Password in .env file');
    return { message: 'Server configuration error' };
  }

  // Compare input against .env values
  if (password === adminPassword) {
    
    // Set a cookie to remember the user is logged in
    (await cookies()).set('admin_session', 'true', { 
      httpOnly: true, 
      path: '/' 
    })
    
    return { success: true, message: 'Success' }
  } else {
    return { message: 'Invalid password' }
  }
}

// 2. LOGOUT ACTION
export async function logout() {
  const locale = await getLocale();
  (await cookies()).delete('admin_session')
  redirect(`/${locale}/admin/login`)
}

// 3. CANCEL APPOINTMENT ACTION
export async function cancelAppointment(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  await processCancellation(id)
  
  // Refresh the admin page data
  revalidatePath('/admin')
}

// --- PUBLIC ACTIONS (Booking) ---

export async function bookAppointment(prevState: AppointmentFormState | undefined, formData: FormData): Promise<AppointmentFormState> {
  const locale = await getLocale();
  let messages;
  try {
     const m = await import(`../messages/${locale}.json`);
     messages = m.default.booking;
  } catch (e) {
     console.error('Translation file missing, using fallbacks');
     messages = { 
        validationFailed: 'Validation failed',
        serverConfigError: 'Server config error',
        dayUnavailable: 'Day unavailable',
        timeSlotBooked: 'Time slot booked',
        success: 'Booking confirmed',
        failedCalendarEvent: 'Calendar event failed',
        criticalError: 'Critical error',
        serverError: 'Server error',
        errorOccurred: 'Error occurred'
     };
  }
  
  const validatedFields = schema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    service: formData.get('service'),
    date: formData.get('date'),
    time: formData.get('time'),
  })

  if (!validatedFields.success) {
    return {
      message: messages.validationFailed,
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, date, time, service } = validatedFields.data;
  
  // Use the email from .env
  const adminEmail = process.env.BARBER_ADMIN_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail || !adminEmail) {
      console.error('CRITICAL: Email environment variables are not set.');
      return { message: messages.serverConfigError };
  }

  let newAppointmentId: number | null = null;

  try {
    // 1. Check if the day is blocked
    const { data: blockedDay, error: blockedDayError } = await supabase
      .from('blocked_days')
      .select('id')
      .eq('date', date)
      .single();

    if (blockedDayError && blockedDayError.code !== 'PGRST116') {
      throw new Error('Database error while checking for blocked days.');
    }

    if (blockedDay) {
      return { message: messages.dayUnavailable };
    }

    // 2. Try to insert the new appointment.
    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert([{
        customer_name: name, 
        email: email,
        date: date,
        time: time,
        service: service,
        status: 'confirmed' 
      }])
      .select('id, customer_name, email, date, time, service')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return { message: messages.timeSlotBooked };
      }
      console.error('Supabase insert error:', insertError);
      throw new Error('Failed to create the appointment in the database.');
    }
    
    newAppointmentId = newAppointment.id;

    // 3. Send emails
    try {
      // Send to Admin (romarlaki10@gmail.com)
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail, 
        subject: 'New Booking Notification',
        html: getAdminNotificationHTML(newAppointment),
      });

      // Send to Customer
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Your Appointment is Confirmed!',
        html: getCustomerConfirmationHTML(newAppointment),
      });

    } catch (emailError) {
      console.error('Critical error: Emails failed to send after booking was created:', emailError);
      throw new Error('Failed to send confirmation emails.');
    }

    // 4. Create calendar event
    try {
      await createCalendarEvent(newAppointment);
    } catch (calendarError) {
        console.error('Failed to create Google Calendar event:', calendarError);
        throw new Error(messages.failedCalendarEvent);
    }

    return { message: messages.success.replace('{{date}}', formatIsraeliDate(date)).replace('{{time}}', time) };

  } catch (error) {
    if (newAppointmentId) {
      console.log(`Attempting to roll back booking with ID: ${newAppointmentId}`);
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', newAppointmentId);

      if (deleteError) {
        console.error('CRITICAL: FAILED TO ROLL BACK BOOKING.', deleteError);
        return { message: messages.criticalError };
      }
    }
    
    console.error('An unexpected error occurred in bookAppointment:', error);
    const errorMessage = error instanceof Error ? error.message : messages.serverError;
    return { message: messages.errorOccurred.replace('{{message}}', errorMessage) };
  }
}

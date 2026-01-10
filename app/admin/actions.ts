'use server'
 
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabase } from '../../lib/server/supabase'
import { revalidatePath } from 'next/cache'
import { resend } from '../../lib/resend';
import { getCancellationNoticeHTML } from '../../lib/email/templates';
import { deleteCalendarEvent } from '../../lib/google/calendar';
 
export async function login(prevState: { error: string } | undefined, formData: FormData) {
  const password = formData.get('password')
 
  if (password === process.env.ADMIN_PASSWORD) {
    const cookieStore = cookies()
    cookieStore.set('session', 'admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // One week
      path: '/',
    })
    redirect('/admin')
  } else {
    return { error: 'Invalid password' }
  }
}

export async function logout() {
    const cookieStore = cookies()
    cookieStore.delete('session')
    redirect('/admin/login')
}

export async function cancelAppointment(formData: FormData) {
    const id = formData.get('id') as string;

    const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select('*, event_id')
        .eq('id', id)
        .single();

    if (fetchError || !appointment) {
        console.error('Error fetching appointment for cancellation:', fetchError);
        return;
    }

    const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

    if (deleteError) {
        console.error('Error canceling appointment:', deleteError);
        return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (fromEmail && appointment.email) {
        try {
            await resend.emails.send({
                from: fromEmail,
                to: appointment.email,
                subject: 'Your Appointment Has Been Canceled',
                html: getCancellationNoticeHTML(appointment),
            });
        } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
        }
    }

    if (appointment.event_id) {
        try {
            await deleteCalendarEvent(appointment.event_id);
        } catch (calendarError) {
            console.error('Failed to delete Google Calendar event:', calendarError);
        }
    }

    revalidatePath('/admin');
    revalidatePath('/'); // Also revalidate the customer booking page
}

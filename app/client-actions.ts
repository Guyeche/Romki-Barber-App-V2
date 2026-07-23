'use server'

import { supabase } from '../lib/server/supabase'
import { processCancellation } from '../lib/appointments'
import { revalidatePath } from 'next/cache'
import { getLocale } from 'next-intl/server'

// Localized strings for the My Bookings modal (same pattern as bookAppointment).
async function getCancellationMessages() {
  const locale = await getLocale();
  try {
    const m = await import(`../messages/${locale}.json`);
    return m.default.cancellation;
  } catch (e) {
    console.error('Translation file missing, using fallbacks');
    return {
      missingFields: 'Name and Email are required',
      fetchError: 'Failed to fetch appointments',
      noBookings: 'No upcoming appointments found for these details.',
      cancelSuccess: 'Appointment cancelled successfully.',
      cancelError: 'Failed to cancel appointment.'
    };
  }
}

export async function verifyAndGetAppointments(prevState: any, formData: FormData) {
  const messages = await getCancellationMessages();
  const name = (formData.get('name') as string || '').trim()
  const email = (formData.get('email') as string || '').trim()

  if (!name || !email) {
    return { error: messages.missingFields, appointments: [] }
  }

  // Fetch appointments for this user that are in the future.
  // Match by email only (case-insensitive, trimmed): requiring the name to also
  // match exactly locked out anyone who typed their name slightly differently
  // than at booking time.
  const today = new Date().toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .ilike('email', email)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) {
    console.error('Error fetching client appointments:', error)
    return { error: messages.fetchError, appointments: [] }
  }

  if (!appointments || appointments.length === 0) {
      return { error: messages.noBookings, appointments: [] }
  }

  return { success: true, appointments }
}

export async function cancelClientAppointment(id: number, name: string, email: string) {
    const messages = await getCancellationMessages();

    // 1. Verify ownership AGAIN before cancelling (email is the identifier,
    // matching verifyAndGetAppointments above)
    const { data: appointment, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', id)
        .ilike('email', (email || '').trim())
        .single()

    if (error || !appointment) {
        return { success: false, message: messages.cancelError }
    }

    // 2. Process Cancellation
    const result = await processCancellation(id)

    if (result.success) {
        revalidatePath('/') // Revalidate potentially affected pages
        return { success: true, message: messages.cancelSuccess }
    } else {
        return { success: false, message: messages.cancelError }
    }
}

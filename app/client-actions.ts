'use server'

import { supabase } from '../lib/server/supabase'
import { processCancellation } from '../lib/appointments'
import { revalidatePath } from 'next/cache'

export async function verifyAndGetAppointments(prevState: any, formData: FormData) {
  const name = (formData.get('name') as string || '').trim()
  const email = (formData.get('email') as string || '').trim()

  if (!name || !email) {
    return { error: 'Name and Email are required', appointments: [] }
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
    return { error: 'Failed to fetch appointments', appointments: [] }
  }

  if (!appointments || appointments.length === 0) {
      return { error: 'No upcoming appointments found for these details.', appointments: [] }
  }

  return { success: true, appointments }
}

export async function cancelClientAppointment(id: number, name: string, email: string) {
    // 1. Verify ownership AGAIN before cancelling (email is the identifier,
    // matching verifyAndGetAppointments above)
    const { data: appointment, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', id)
        .ilike('email', (email || '').trim())
        .single()
    
    if (error || !appointment) {
        return { success: false, message: 'Unauthorized or Appointment not found' }
    }

    // 2. Process Cancellation
    const result = await processCancellation(id)
    
    if (result.success) {
        revalidatePath('/') // Revalidate potentially affected pages
        return { success: true, message: 'Appointment cancelled successfully' }
    } else {
        return { success: false, message: result.error || 'Failed to cancel' }
    }
}

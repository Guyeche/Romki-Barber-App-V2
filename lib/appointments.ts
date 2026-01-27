import { supabase } from './server/supabase';
import { resend } from './resend';
import { deleteCalendarEvent } from './google/calendar';
import { formatIsraeliDate } from './date-utils';

export async function processCancellation(id: number | string) {
  console.log(`Processing cancellation for appointment ID: ${id}`);

  // A. FETCH the appointment details first
  const { data: appointment, error: fetchError } = await supabase
    .from('appointments')
    .select('customer_name, email, date, time, event_id')
    .eq('id', id)
    .single();

  if (fetchError || !appointment) {
    console.error("Could not find appointment to cancel:", fetchError);
    return { success: false, error: 'Appointment not found' };
  }

  // B. DELETE from Supabase
  const { error: deleteError } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting appointment:', deleteError);
    return { success: false, error: 'Database delete failed' };
  }

  // C. DELETE FROM GOOGLE CALENDAR
  if (appointment.event_id) {
    await deleteCalendarEvent(appointment.event_id);
  }

  // D. SEND CANCELLATION EMAIL
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (fromEmail) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: appointment.email,
        subject: 'Appointment Cancelled',
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Appointment Cancelled</h2>
              <p>Hi ${appointment.customer_name},</p>
              <p>Your appointment on <strong>${formatIsraeliDate(appointment.date)}</strong> at <strong>${appointment.time}</strong> has been cancelled.</p>
              <p>If you have any questions, please contact us.</p>
            </div>
          `,
      });
      console.log("Cancellation email sent to:", appointment.email);
    } catch (emailError) {
      console.error("Failed to send cancellation email:", emailError);
      // We don't fail the operation just because email failed
    }
  }

  return { success: true };
}

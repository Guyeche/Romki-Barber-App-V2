import { google } from 'googleapis';
import { supabase } from '../server/supabase';

// Define a specific type for the appointment object
interface Appointment {
  id: number | string;
  customer_name: string;
  email: string;
  service: string;
  date: string; // Format: YYYY-MM-DD
  time: string; // Format: HH:MM
}

const calendarId = process.env.GOOGLE_CALENDAR_ID;
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
});

const calendar = google.calendar({ version: 'v3', auth });

export async function createCalendarEvent(appointment: Appointment) {
  if (!calendarId) {
    console.error('GOOGLE_CALENDAR_ID is not set. Skipping calendar event creation.');
    return;
  }

  const [year, month, day] = appointment.date.split('-').map(Number);
  const [hours, minutes] = appointment.time.split(':').map(Number);
  const startTime = new Date(year, month - 1, day, hours, minutes);

  const durationMap: { [key: string]: number } = {
      'Haircut': 20,
      'Beard Trim': 10,
      'Haircut & Beard Trim': 30,
  };
  const duration = durationMap[appointment.service] || 30; // Default to 30 mins

  const endTime = new Date(startTime.getTime() + duration * 60000);

  const event = {
    summary: `Appointment: ${appointment.customer_name} - ${appointment.service}`,
    description: `Customer: ${appointment.customer_name}\nEmail: ${appointment.email}\nService: ${appointment.service}`,
    start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
    },
    end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Jerusalem',
    },
  };

  try {
    const createdEvent = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
    });

    if (createdEvent && createdEvent.data.id) {
        // Update the appointment with the Google Calendar event ID
        await supabase
            .from('appointments')
            .update({ event_id: createdEvent.data.id })
            .eq('id', appointment.id);
    }
  } catch (error) {
    console.error('Error creating calendar event:', error);
  }
}

export async function deleteCalendarEvent(eventId: string) {
  if (!calendarId) {
    console.error('GOOGLE_CALENDAR_ID is not set. Skipping calendar event deletion.');
    return;
  }

  if (!eventId) {
    console.warn('No event_id provided for deletion. Skipping.');
    return;
  }

  try {
    await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
  }
}
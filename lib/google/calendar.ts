import { google } from 'googleapis';
import { supabase } from '../server/supabase'; // CHECK THIS PATH: Make sure it points to your actual supabase file

// Define a specific type for the appointment object
interface Appointment {
  id: number | string;
  customer_name: string;
  email: string;
  service: string;
  date: string; // Format: YYYY-MM-DD
  time: string; // Format: HH:MM
}

export async function createCalendarEvent(appointment: Appointment) {
  // 1. Load variables from .env
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!calendarId || !clientEmail || !privateKey) {
    console.error('MISSING GOOGLE ENV VARS: Check GOOGLE_CALENDAR_ID, GOOGLE_CLIENT_EMAIL, or GOOGLE_PRIVATE_KEY');
    return;
  }

  // 2. Format the Private Key correctly (Fixes "Invalid JWT Signature")
  // Handle both literal "\n" strings and actual newlines
  const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, ''); 

  // 3. Authenticate using GoogleAuth (Fixes "Expected 0-1 arguments" error)
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  // 4. Calculate Time
  const [year, month, day] = appointment.date.split('-').map(Number);
  const [hours, minutes] = appointment.time.split(':').map(Number);
  
  // Create Date objects in UTC to preserve the "face value" of the time (e.g., 15:00)
  // regardless of the server's local timezone.
  const startTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  const durationMap: { [key: string]: number } = {
      'Haircut': 20,
      'Beard Trim': 20,
      'Haircut & Beard Trim': 20,
      'תספורת': 20,
      'זקן': 20,
      'תספורת וזקן': 20
  };
  const duration = durationMap[appointment.service] || 20; // Default to 20 mins

  const endTime = new Date(startTime.getTime() + duration * 60000);

  // Helper to get ISO string without 'Z' (Zulu/UTC suffix)
  // This allows us to pass the "face value" time to Google Calendar
  // and let it apply the 'Asia/Jerusalem' timezone.
  const toIsoStringNoZ = (date: Date) => {
    return date.toISOString().replace('Z', '');
  };

  // 5. Create Event Object
  const event = {
    summary: `Appointment: ${appointment.customer_name} - ${appointment.service}`,
    description: `Customer: ${appointment.customer_name}\nEmail: ${appointment.email}\nService: ${appointment.service}`,
    start: {
        dateTime: toIsoStringNoZ(startTime),
        timeZone: 'Asia/Jerusalem',
    },
    end: {
        dateTime: toIsoStringNoZ(endTime),
        timeZone: 'Asia/Jerusalem',
    },
  };

  try {
    // 6. Send to Google
    const createdEvent = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
    });

    // 7. Save the Google Event ID back to Supabase
    if (createdEvent && createdEvent.data.id) {
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
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!calendarId || !clientEmail || !privateKey || !eventId) {
    console.warn('Skipping calendar deletion: Missing env vars or eventId');
    return;
  }

  // Consistent key formatting with createCalendarEvent
  const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '');

  // Authenticate using GoogleAuth
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId,
    });
    console.log(`Deleted Google Calendar event: ${eventId}`);
  } catch (error) {
    console.error('Error deleting calendar event:', error);
  }
}

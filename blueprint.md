## Overview

This is a booking application for the Romki Barber Shop. It allows customers to book appointments online and provides a secure admin console for the barber to manage their schedule.

## Core Features

### Customer Booking

*   **Appointment Booking:** Customers can book an appointment by providing their name, email, and desired service.
*   **Real-time Availability:** The booking calendar is connected to the database, showing real-time availability. Booked time slots are disabled and cannot be selected.
*   **Double-Booking Prevention:** The backend validates every request to ensure a time slot is not booked twice.
*   **Email Confirmations:** Customers receive an email confirmation, and the barber receives a notification for every new booking.
*   **Localized Date Formatting:** All dates displayed to the user (in emails and on the website) are formatted as `DD/MM/YYYY` to match regional standards in Israel.

### Barber Admin Console

*   **Secure Access:** The admin console at `/admin` is protected by a password.
*   **Schedule Management:** The barber can view all upcoming appointments in a clear, organized list.
*   **Appointment Cancellation:** The barber can cancel an appointment, which deletes it from the database, removes the event from Google Calendar, and makes the time slot available again.
*   **Google Calendar Sync:** All appointments are automatically synced with the barber's Google Calendar. New bookings create events, and cancellations remove them.

---

## Current Plan: Fixes and Localization

*This work is complete.*

1.  **Fix Google Calendar Timezone:** Corrected the Google Calendar integration by changing the hardcoded timezone from `America/New_York` to `Asia/Jerusalem`, ensuring appointments are created at the correct time.
2.  **Implement Localized Date Formatting:** Updated all user-facing dates across the application—including email templates and the admin dashboard—to use the `DD/MM/YYYY` format, which is standard in Israel.

---

## Previous Plan: Enhance Notifications & Integrate Google Calendar

*This work is complete.*

1.  **Refactor Email Templates:** Created beautiful, professional HTML email templates for booking confirmations, admin notifications, and cancellation notices.
2.  **Integrate Google Calendar API:**
    *   Installed the `googleapis` package.
    *   Set up a helper file to manage the Google Calendar API connection and authentication.
    *   When a booking is created, the system automatically adds an event to the barber's Google Calendar.
    *   When a booking is canceled from the admin console, the system automatically removes the corresponding event from the barber's calendar.
3.  **Implement Customer Cancellation Emails:** When an appointment is canceled by the admin, the system automatically sends a professional and courteous notification email to the customer.

---

## Technical Architecture

*   **Framework:** Built with Next.js using the App Router.
*   **Server Actions:** All data mutations (booking, canceling, logging in) are handled by secure Next.js Server Actions.
*   **Database:** Supabase (PostgreSQL) is used to store appointment data.
*   **Authentication:** The admin console uses a simple, secure cookie-based session management system.
*   **Email Service:** Resend is used for sending transactional emails.
*   **Styling:** Tailwind CSS for a modern, responsive UI.
*   **Calendar Integration:** Google Calendar API is used for automated event management.

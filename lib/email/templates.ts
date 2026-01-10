// Define a type for the appointment data to ensure type safety
interface Appointment {
  customer_name: string;
  service: string;
  date: string;
  time: string;
}

// Helper function to format the date as DD/MM/YYYY
const formatIsraeliDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getCustomerConfirmationHTML = (appointment: Appointment) => `
  <h1>Booking Confirmation</h1>
  <p>Dear ${appointment.customer_name},</p>
  <p>Your appointment for <strong>${appointment.service}</strong> is confirmed for <strong>${formatIsraeliDate(appointment.date)}</strong> at <strong>${appointment.time}</strong>.</p>
  <p>Thank you for choosing Romki Barber Shop.</p>
`;

export const getAdminNotificationHTML = (appointment: Appointment) => `
  <h1>New Booking</h1>
  <p>A new appointment has been booked:</p>
  <ul>
    <li><strong>Name:</strong> ${appointment.customer_name}</li>
    <li><strong>Service:</strong> ${appointment.service}</li>
    <li><strong>Date:</strong> ${formatIsraeliDate(appointment.date)}</li>
    <li><strong>Time:</strong> ${appointment.time}</li>
  </ul>
`;

export const getCancellationNoticeHTML = (appointment: Appointment) => `
  <h1>Appointment Canceled</h1>
  <p>Dear ${appointment.customer_name},</p>
  <p>Your appointment for <strong>${appointment.service}</strong> on <strong>${formatIsraeliDate(appointment.date)}</strong> at <strong>${appointment.time}</strong> has been canceled.</p>
  <p>We apologize for any inconvenience. Please feel free to book another appointment at your convenience.</p>
  <p>Sincerely,</p>
  <p>The Romki Barber Shop Team</p>
`;

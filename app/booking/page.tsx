'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { bookAppointment } from '../actions'
import DateTimePicker from '../../components/DateTimePicker'
import { useState } from 'react'
import Link from 'next/link';

const initialState = {
  message: '',
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" aria-disabled={pending} className="px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
      {pending ? 'Booking...' : 'Book Appointment'}
    </button>
  )
}

export default function BookingPage() {
  const [state, formAction] = useFormState(bookAppointment, initialState)
  const [dateTime, setDateTime] = useState<{ date?: Date; time?: string }>({ date: undefined, time: undefined });

  const handleDateTimeChange = (date: Date, time: string) => {
    setDateTime({ date, time });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-4xl font-bold text-center text-gray-800 dark:text-white">Book Your Appointment</h1>
        
        {!state.message ? (
          <form action={formAction} className="mt-8 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Name</label>
              <input type="text" name="name" id="name" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Email</label>
              <input type="email" name="email" id="email" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            </div>
            <div>
              <label htmlFor="service" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service</label>
              <select id="service" name="service" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <option>Haircut</option>
                <option>Beard Trim</option>
                <option>Haircut & Beard Trim</option>
              </select>
            </div>
            <div>
              <DateTimePicker onDateTimeChange={handleDateTimeChange} />
              <input type="hidden" name="date" value={dateTime.date ? dateTime.date.toISOString().split('T')[0] : ''} />
              <input type="hidden" name="time" value={dateTime.time || ''} />
            </div>
            <div className="text-center">
              <SubmitButton />
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center">
            <p className="text-green-500 text-lg">{state.message}</p>
            <Link href="/" className="mt-6 inline-block px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Book Another Appointment
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

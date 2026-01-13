'use client'

import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { supabase } from '../lib/supabase'
import { useTranslations } from 'next-intl'

const businessHours = {
  start: 9,
  end: 19,
}

interface DateTimePickerProps {
  onDateTimeChange: (date: Date, time: string) => void;
}

export default function DateTimePicker({ onDateTimeChange }: DateTimePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [blockedDays, setBlockedDays] = useState<Date[]>([])
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('booking');

  useEffect(() => {
    const fetchBlockedDays = async () => {
        const { data, error } = await supabase.from('blocked_days').select('date');
        if (error) {
            console.error('Error fetching blocked days:', error);
            return;
        }
        // The dates from supabase are strings (e.g., "2023-12-25").
        // We need to convert them to Date objects for the DayPicker.
        // It's important to account for timezones by creating the date as UTC.
        const dates = data.map(item => {
            const date = new Date(item.date);
            // Add timezone offset to prevent the date from shifting
            return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        });
        setBlockedDays(dates);
    };

    fetchBlockedDays();
  }, []);

  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDay) return;

      setIsLoading(true);
      setBookedTimes([]);
      const year = selectedDay.getFullYear();
      const month = String(selectedDay.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDay.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      try {
        // This endpoint is no longer necessary if we check for booked times directly
        // against the database, but we'll keep it for now.
        const response = await fetch(`/api/appointments?date=${dateString}`);
        if (!response.ok) {
          throw new Error('Failed to fetch booked times');
        }
        const data = await response.json();
        setBookedTimes(data);
      } catch (error) {
        console.error(error);
        // Optionally, show an error message to the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedTimes();
  }, [selectedDay]);


  const handleDayClick = (day: Date | undefined) => {
    setSelectedDay(day)
    setSelectedTime(undefined) // Reset time when a new day is selected
    if (day) {
        onDateTimeChange(day, '')
    }
  }

  const handleTimeClick = (time: string) => {
    setSelectedTime(time)
    if (selectedDay) {
        onDateTimeChange(selectedDay, time)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    if (selectedDay) {
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`)
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  return (
    <div>
      <DayPicker
        mode="single"
        selected={selectedDay}
        onSelect={handleDayClick}
        disabled={[
          ...blockedDays,
          { dayOfWeek: [5, 6] }, // Disable Friday and Saturday
          { before: new Date() }  // Disable past days
        ]}
        className="bg-gray-200 dark:bg-gray-800 p-4 rounded-lg"
      />
      {selectedDay && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('selectTime')}</h3>
          {isLoading ? (
            <div className="text-center">{t('loadingTimes')}</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => {
                const isBooked = bookedTimes.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeClick(time)}
                    disabled={isBooked}
                    className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors
                      ${
                        isBooked
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                          : selectedTime === time
                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                            : 'bg-gray-200 text-gray-800 hover:bg-blue-500 hover:text-white dark:bg-gray-600 dark:text-white dark:hover:bg-blue-500'
                      }`
                    }
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTranslations, useLocale } from 'next-intl'
import { format } from 'date-fns'
import { enUS, he } from 'date-fns/locale'

interface ScheduleDay {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface DateTimePickerProps {
  onDateTimeChange: (date: Date, time: string) => void;
}

export default function DateTimePicker({ onDateTimeChange }: DateTimePickerProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string | undefined>()
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [blockedDays, setBlockedDays] = useState<Date[]>([])
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])
  const [bookingWindow, setBookingWindow] = useState<number>(14);
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('booking');
  const locale = useLocale();
  const dateFnsLocale = locale === 'he' ? he : enUS;

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Blocked Days
      const { data: blockedData, error: blockedError } = await supabase.from('blocked_days').select('date');
      let blockedDates: Date[] = [];
      if (blockedError) {
          console.error('Error fetching blocked days:', blockedError);
      } else {
          blockedDates = blockedData.map(item => {
              const date = new Date(item.date);
              return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
          });
          setBlockedDays(blockedDates);
      }

      // 2. Fetch Schedule & Settings
      try {
        const res = await fetch('/api/schedule');
        if (res.ok) {
          const data = await res.json();
          if (data.bookingWindow) setBookingWindow(data.bookingWindow);
          
          if (data.schedule) {
             setSchedule(data.schedule);
             
             // Calculate Available Dates immediately after fetching schedule
             const dates: Date[] = [];
             const today = new Date();
             today.setHours(0, 0, 0, 0);

             for (let i = 0; i < (data.bookingWindow || 14); i++) {
                 const d = new Date(today);
                 d.setDate(today.getDate() + i);
                 
                 // Check blocked
                 const isBlocked = blockedDates.some(bd => 
                     bd.getDate() === d.getDate() && 
                     bd.getMonth() === d.getMonth() && 
                     bd.getFullYear() === d.getFullYear()
                 );
                 if (isBlocked) continue;

                 // Check schedule
                 const dayConfig = data.schedule.find((s: any) => s.day_of_week === d.getDay());
                 if (!dayConfig?.is_active) continue;

                 dates.push(d);
             }
             setAvailableDates(dates);
          }
        }
      } catch (e) {
        console.error('Error fetching schedule:', e);
      }
    };

    fetchData();
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
    if (selectedDay && schedule.length > 0) {
      const dayConfig = schedule.find(s => s.day_of_week === selectedDay.getDay());
      
      if (dayConfig && dayConfig.is_active) {
        const [startH, startM] = dayConfig.start_time.split(':').map(Number);
        const [endH, endM] = dayConfig.end_time.split(':').map(Number);
        
        let currentH = startH;
        let currentM = startM;
        const endTotalMinutes = endH * 60 + endM;

        while (true) {
            const currentTotalMinutes = currentH * 60 + currentM;
            // If the slot ends after the closing time, stop.
            if (currentTotalMinutes + 20 > endTotalMinutes) break;
            
            slots.push(`${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
            
            currentM += 20;
            if (currentM >= 60) {
                currentH++;
                currentM -= 60;
            }
            // Safety break for infinite loop (shouldn't happen but good practice)
            if (currentH >= 24 && currentM > 0) break;
        }
      }
    }

    // Filter out past times if the selected day is today
    if (selectedDay) {
        const now = new Date();
        if (
            selectedDay.getDate() === now.getDate() &&
            selectedDay.getMonth() === now.getMonth() &&
            selectedDay.getFullYear() === now.getFullYear()
        ) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            return slots.filter(time => {
                const [slotHour, slotMinute] = time.split(':').map(Number);
                if (slotHour < currentHour) return false;
                if (slotHour === currentHour && slotMinute <= currentMinute) return false;
                return true;
            });
        }
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  return (
    <div>
      {!selectedDay ? (
        <div className="mt-4">
           <h3 className="text-lg font-medium text-stone-200 mb-4">{t('selectDate')}</h3>
           {availableDates.length === 0 ? (
               <p className="text-stone-500 text-center py-8">No dates available for booking.</p>
           ) : (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableDates.map(date => (
                      <button
                         key={date.toISOString()}
                         type="button"
                         onClick={() => handleDayClick(date)}
                         className="flex flex-col items-center justify-center p-4 rounded-xl border border-stone-800 bg-[#111111]/80 hover:bg-[#1a1a1a] hover:border-[#ecb613]/50 transition-all shadow-sm focus:outline-none backdrop-blur-sm"
                      >
                         <span className="text-sm font-medium text-stone-400 uppercase tracking-wider">
                            {format(date, 'EEEE', { locale: dateFnsLocale })}
                         </span>
                         <span className="text-xl font-bold text-stone-100 mt-1">
                            {format(date, 'd MMM', { locale: dateFnsLocale })}
                         </span>
                      </button>
                  ))}
               </div>
           )}
        </div>
      ) : (
        <div className="mt-4">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#ecb613]">
                 {format(selectedDay, 'EEEE, d MMMM', { locale: dateFnsLocale })}
              </h3>
              <button 
                type="button"
                onClick={() => setSelectedDay(undefined)} 
                className="text-sm font-medium text-stone-400 hover:text-stone-200 transition-colors underline underline-offset-4"
              >
                 {t('changeDate')}
              </button>
           </div>
           
           <h4 className="text-sm font-medium text-stone-300 mb-3">{t('selectTime')}</h4>
           {isLoading ? (
            <div className="text-center py-8 text-stone-400">{t('loadingTimes')}</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {timeSlots.map((time) => {
                const isBooked = bookedTimes.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeClick(time)}
                    disabled={isBooked}
                    className={`px-3 py-3 text-sm font-semibold rounded-xl transition-all shadow-sm backdrop-blur-sm focus:outline-none
                      ${
                        isBooked
                          ? 'bg-stone-900/50 text-stone-600 cursor-not-allowed border border-stone-800/50'
                          : selectedTime === time
                            ? 'bg-[#ecb613] text-black shadow-[0_0_15px_rgba(236,182,19,0.3)] border-transparent transform scale-105'
                            : 'bg-[#111111]/80 text-stone-200 border border-stone-800 hover:border-[#ecb613]/50 hover:bg-[#1a1a1a]'
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

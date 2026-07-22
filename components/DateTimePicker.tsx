'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { format } from 'date-fns'
import { enUS, he } from 'date-fns/locale'
import { isSlotBlocked, blocksForDate, type ScheduleBlock } from '../lib/blocks'

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
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [bookingWindow, setBookingWindow] = useState<number>(14);
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('booking');
  const locale = useLocale();
  const dateFnsLocale = locale === 'he' ? he : enUS;

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Blocked Days via the server API — the browser anon client is
      // subject to RLS, which silently returns no rows and made vacation days bookable.
      let blockedDates: Date[] = [];
      try {
          const res = await fetch('/api/blocked-days');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const { days } = await res.json();
          blockedDates = (days ?? []).map((item: { date: string }) => {
              const date = new Date(item.date);
              return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
          });
          setBlockedDays(blockedDates);
      } catch (e) {
          console.error('Error fetching blocked days:', e);
      }

      // 2. Fetch Schedule & Settings
      try {
        const res = await fetch('/api/schedule');
        if (res.ok) {
          const data = await res.json();
          if (data.bookingWindow) setBookingWindow(data.bookingWindow);
          if (data.blocks) setBlocks(data.blocks);

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

    // Remove slots that fall inside a schedule block (recurring break or one-off block).
    let available = slots;
    if (selectedDay) {
        const dayStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;
        const dayBlocks = blocksForDate(blocks, dayStr, selectedDay.getDay());
        available = available.filter(time => !isSlotBlocked(time, dayBlocks));
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

            return available.filter(time => {
                const [slotHour, slotMinute] = time.split(':').map(Number);
                if (slotHour < currentHour) return false;
                if (slotHour === currentHour && slotMinute <= currentMinute) return false;
                return true;
            });
        }
    }

    return available
  }

  const timeSlots = generateTimeSlots()

  return (
    <div>
      {!selectedDay ? (
        <div className="mt-6">
           <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-smoke mb-4">{t('selectDate')}</h3>
           {availableDates.length === 0 ? (
               <p className="text-smoke text-center py-8">No dates available for booking.</p>
           ) : (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableDates.map(date => (
                      <button
                         key={date.toISOString()}
                         type="button"
                         onClick={() => handleDayClick(date)}
                         className="flex flex-col items-center justify-center p-4 rounded-xl border border-line bg-ink hover:border-gold/60 hover:bg-gold/5 transition-all"
                      >
                         <span className="text-xs font-medium text-smoke uppercase tracking-wider">
                            {format(date, 'EEEE', { locale: dateFnsLocale })}
                         </span>
                         <span className="text-lg font-bold text-cream mt-1">
                            {format(date, 'd MMM', { locale: dateFnsLocale })}
                         </span>
                      </button>
                  ))}
               </div>
           )}
        </div>
      ) : (
        <div className="mt-6">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-cream">
                 {format(selectedDay, 'EEEE, d MMMM', { locale: dateFnsLocale })}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDay(undefined)}
                className="text-sm font-medium text-gold hover:text-gold-bright transition-colors"
              >
                 {t('changeDate')}
              </button>
           </div>

           <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-smoke mb-3">{t('selectTime')}</h4>
           {isLoading ? (
            <div className="text-center py-8 text-smoke">{t('loadingTimes')}</div>
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
                    className={`px-3 py-3 text-sm font-semibold rounded-lg transition-all tabular-nums
                      ${
                        isBooked
                          ? 'bg-ink/50 text-smoke/40 cursor-not-allowed border border-transparent line-through'
                          : selectedTime === time
                            ? 'bg-gold text-ink shadow-[0_0_20px_rgba(210,161,58,0.3)] ring-1 ring-gold-bright transform scale-105'
                            : 'bg-ink text-cream border border-line hover:border-gold/60 hover:bg-gold/5'
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

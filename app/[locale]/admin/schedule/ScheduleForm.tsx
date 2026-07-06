'use client'

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface ScheduleDay {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function ScheduleForm({ initialSchedule, initialBookingWindow }: { initialSchedule: ScheduleDay[], initialBookingWindow: number }) {
  const [schedule, setSchedule] = useState<ScheduleDay[]>(initialSchedule);
  const [bookingWindow, setBookingWindow] = useState(initialBookingWindow);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const t = useTranslations('admin.schedule');
  const locale = useLocale();
  const router = useRouter();

  // Ensure we have 7 days even if DB is empty (should satisfy via seed, but safe fallback)
  // Logic: 0-6 days.
  
  const getDayName = (dayIndex: number) => {
      const date = new Date();
      // Calculate a date that is definitely that day of week
      // Sunday is 0. 
      // Current date day: date.getDay()
      // Diff = dayIndex - date.getDay()
      date.setDate(date.getDate() - date.getDay() + dayIndex);
      return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'long' }).format(date);
  };

  const generateTimeOptions = () => {
      const options = [];
      for (let i = 0; i < 24; i++) {
          const hour = i.toString().padStart(2, '0');
          options.push(`${hour}:00`);
          options.push(`${hour}:20`);
          options.push(`${hour}:40`);
      }
      return options;
  };

  const timeOptions = generateTimeOptions();

  const handleSave = async () => {
      setSaving(true);
      setMessage('');
      try {
          const res = await fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ schedule, bookingWindow })
          });
          
          if (res.ok) {
              setMessage(t('success'));
              router.refresh();
          } else {
              setMessage(t('error'));
          }
      } catch (e) {
          setMessage(t('error'));
      } finally {
          setSaving(false);
      }
  };

  const updateDay = (index: number, field: keyof ScheduleDay, value: any) => {
      const newSchedule = [...schedule];
      newSchedule[index] = { ...newSchedule[index], [field]: value };
      setSchedule(newSchedule);
  };

  return (
      <div className="bg-coal border border-line shadow rounded-2xl p-6">
          <div className="mb-6 p-4 bg-ink/60 border border-line rounded-lg">
              <label className="block text-sm font-semibold mb-2 text-cream">
                  {t('bookingWindow')}
              </label>
              <select
                  value={bookingWindow}
                  onChange={(e) => setBookingWindow(parseInt(e.target.value))}
                  className="bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block w-full p-2.5 transition-colors"
              >
                  <option value={7}>{t('week1')}</option>
                  <option value={14}>{t('weeks2')}</option>
                  <option value={21}>{t('weeks3')}</option>
                  <option value={30}>{t('month1')}</option>
                  <option value={60}>{t('months2')}</option>
              </select>
          </div>

          <div className="space-y-4">
              {schedule.map((day, index) => (
                  <div key={day.day_of_week} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-line last:border-0">
                      <div className="flex items-center mb-2 md:mb-0 w-32">
                          <label className="font-semibold text-lg">{getDayName(day.day_of_week)}</label>
                      </div>
                      
                      <div className="flex items-center space-x-4 rtl:space-x-reverse flex-1">
                          <div className="flex items-center">
                              <input
                                  type="checkbox"
                                  checked={day.is_active}
                                  onChange={(e) => updateDay(index, 'is_active', e.target.checked)}
                                  className="w-5 h-5 accent-gold bg-ink border-line rounded focus:ring-gold/50 focus:ring-2"
                              />
                              <span className="ml-2 rtl:mr-2 text-sm text-smoke">
                                  {day.is_active ? t('active') : t('closed')}
                              </span>
                          </div>

                          {day.is_active && (
                              <div className="flex items-center space-x-2 rtl:space-x-reverse ml-4 rtl:mr-4">
                                  <div className="flex flex-col">
                                      <label className="text-xs text-smoke mb-1">{t('start')}</label>
                                      <select
                                          value={day.start_time.substring(0, 5)}
                                          onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                                          className="bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block w-full p-2.5 transition-colors tabular-nums"
                                      >
                                          {timeOptions.map((time) => (
                                              <option key={time} value={time}>{time}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <span className="text-smoke self-end mb-3">-</span>
                                  <div className="flex flex-col">
                                      <label className="text-xs text-smoke mb-1">{t('end')}</label>
                                      <select
                                          value={day.end_time.substring(0, 5)}
                                          onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                                          className="bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block w-full p-2.5 transition-colors tabular-nums"
                                      >
                                          {timeOptions.map((time) => (
                                              <option key={time} value={time}>{time}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>

          <div className="mt-6 flex justify-end items-center">
              {message && (
                  <span className={`mx-4 text-sm ${message === t('success') ? 'text-gold' : 'text-red-400'}`}>
                      {message}
                  </span>
              )}
              <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-ink bg-gold hover:bg-gold-bright focus:ring-2 focus:outline-none focus:ring-gold/50 rounded-lg text-center transition-colors disabled:opacity-60"
              >
                  {saving ? t('saving') : t('save')}
              </button>
          </div>
      </div>
  );
}

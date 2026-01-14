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
          options.push(`${hour}:30`);
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  {t('bookingWindow')}
              </label>
              <select
                  value={bookingWindow}
                  onChange={(e) => setBookingWindow(parseInt(e.target.value))}
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              >
                  <option value={7} className="bg-white text-gray-900 dark:bg-gray-700 dark:text-white">{t('week1')}</option>
                  <option value={14} className="bg-white text-gray-900 dark:bg-gray-700 dark:text-white">{t('weeks2')}</option>
                  <option value={21} className="bg-white text-gray-900 dark:bg-gray-700 dark:text-white">{t('weeks3')}</option>
                  <option value={30} className="bg-white text-gray-900 dark:bg-gray-700 dark:text-white">{t('month1')}</option>
                  <option value={60} className="bg-white text-gray-900 dark:bg-gray-700 dark:text-white">{t('months2')}</option>
              </select>
          </div>

          <div className="space-y-4">
              {schedule.map((day, index) => (
                  <div key={day.day_of_week} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <div className="flex items-center mb-2 md:mb-0 w-32">
                          <label className="font-semibold text-lg">{getDayName(day.day_of_week)}</label>
                      </div>
                      
                      <div className="flex items-center space-x-4 rtl:space-x-reverse flex-1">
                          <div className="flex items-center">
                              <input
                                  type="checkbox"
                                  checked={day.is_active}
                                  onChange={(e) => updateDay(index, 'is_active', e.target.checked)}
                                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <span className="ml-2 rtl:mr-2 text-sm text-gray-700 dark:text-gray-300">
                                  {day.is_active ? t('active') : t('closed')}
                              </span>
                          </div>

                          {day.is_active && (
                              <div className="flex items-center space-x-2 rtl:space-x-reverse ml-4 rtl:mr-4">
                                  <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 mb-1">{t('start')}</label>
                                      <select
                                          value={day.start_time.substring(0, 5)}
                                          onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                      >
                                          {timeOptions.map((time) => (
                                              <option key={time} value={time}>{time}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <span className="text-gray-500 self-end mb-3">-</span>
                                  <div className="flex flex-col">
                                      <label className="text-xs text-gray-500 mb-1">{t('end')}</label>
                                      <select
                                          value={day.end_time.substring(0, 5)}
                                          onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
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
                  <span className={`mx-4 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                      {message}
                  </span>
              )}
              <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:bg-gray-400"
              >
                  {saving ? t('saving') : t('save')}
              </button>
          </div>
      </div>
  );
}

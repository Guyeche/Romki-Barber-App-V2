'use client'

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { ScheduleBlock } from '../../../../lib/blocks';

interface ScheduleDay {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// One recurring break per weekday (v1). Keyed by day_of_week.
type BreakMap = Record<number, { start_time: string; end_time: string }>;

const DEFAULT_BREAK = { start_time: '13:00', end_time: '14:00' };

function buildInitialBreaks(blocks: ScheduleBlock[]): BreakMap {
  const map: BreakMap = {};
  for (const b of blocks) {
    if (b.day_of_week != null) {
      map[b.day_of_week] = {
        start_time: b.start_time.substring(0, 5),
        end_time: b.end_time.substring(0, 5),
      };
    }
  }
  return map;
}

export default function ScheduleForm({ initialSchedule, initialBookingWindow, initialBreaks = [] }: { initialSchedule: ScheduleDay[], initialBookingWindow: number, initialBreaks?: ScheduleBlock[] }) {
  const [schedule, setSchedule] = useState<ScheduleDay[]>(initialSchedule);
  const [bookingWindow, setBookingWindow] = useState(initialBookingWindow);
  const [breaks, setBreaks] = useState<BreakMap>(() => buildInitialBreaks(initialBreaks));
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
      // Validate any breaks: end must be after start.
      for (const [dow, br] of Object.entries(breaks)) {
          if (br.start_time >= br.end_time) {
              setMessage(t('breakInvalid'));
              return;
          }
      }

      setSaving(true);
      setMessage('');

      // Only send breaks for days that are currently active.
      const activeDays = new Set(schedule.filter(d => d.is_active).map(d => d.day_of_week));
      const recurringBreaks = Object.entries(breaks)
          .filter(([dow]) => activeDays.has(Number(dow)))
          .map(([dow, br]) => ({
              day_of_week: Number(dow),
              start_time: br.start_time,
              end_time: br.end_time,
          }));

      try {
          const res = await fetch('/api/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ schedule, bookingWindow, recurringBreaks })
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

  const addBreak = (dayOfWeek: number) => {
      setBreaks(prev => ({ ...prev, [dayOfWeek]: { ...DEFAULT_BREAK } }));
  };

  const removeBreak = (dayOfWeek: number) => {
      setBreaks(prev => {
          const next = { ...prev };
          delete next[dayOfWeek];
          return next;
      });
  };

  const updateBreak = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
      setBreaks(prev => ({
          ...prev,
          [dayOfWeek]: { ...(prev[dayOfWeek] ?? DEFAULT_BREAK), [field]: value },
      }));
  };

  const applyBreakToAll = () => {
      // Use the first existing break as the template, else the default.
      const template = Object.values(breaks)[0] ?? DEFAULT_BREAK;
      setBreaks(() => {
          const next: BreakMap = {};
          schedule.filter(d => d.is_active).forEach(d => {
              next[d.day_of_week] = { ...template };
          });
          return next;
      });
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
                      
                      <div className="flex items-center flex-wrap gap-y-3 space-x-4 rtl:space-x-reverse flex-1">
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

                          {day.is_active && (
                              <div className="flex items-center gap-2 ml-4 rtl:mr-4 pl-4 rtl:pr-4 border-l border-line rtl:border-l-0 rtl:border-r">
                                  {breaks[day.day_of_week] ? (
                                      <>
                                          <div className="flex flex-col">
                                              <label className="text-xs text-smoke mb-1">{t('breakStart')}</label>
                                              <select
                                                  value={breaks[day.day_of_week].start_time}
                                                  onChange={(e) => updateBreak(day.day_of_week, 'start_time', e.target.value)}
                                                  className="bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block p-2.5 transition-colors tabular-nums"
                                              >
                                                  {timeOptions.map((time) => (
                                                      <option key={time} value={time}>{time}</option>
                                                  ))}
                                              </select>
                                          </div>
                                          <span className="text-smoke self-end mb-3">-</span>
                                          <div className="flex flex-col">
                                              <label className="text-xs text-smoke mb-1">{t('breakEnd')}</label>
                                              <select
                                                  value={breaks[day.day_of_week].end_time}
                                                  onChange={(e) => updateBreak(day.day_of_week, 'end_time', e.target.value)}
                                                  className="bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block p-2.5 transition-colors tabular-nums"
                                              >
                                                  {timeOptions.map((time) => (
                                                      <option key={time} value={time}>{time}</option>
                                                  ))}
                                              </select>
                                          </div>
                                          <button
                                              type="button"
                                              onClick={() => removeBreak(day.day_of_week)}
                                              className="self-end mb-1 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                                          >
                                              {t('removeBreak')}
                                          </button>
                                      </>
                                  ) : (
                                      <button
                                          type="button"
                                          onClick={() => addBreak(day.day_of_week)}
                                          className="text-xs font-medium text-gold hover:text-gold-bright transition-colors"
                                      >
                                          + {t('addBreak')}
                                      </button>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>

          <div className="mt-4 flex justify-end">
              <button
                  type="button"
                  onClick={applyBreakToAll}
                  className="text-xs font-medium text-gold hover:text-gold-bright transition-colors"
              >
                  {t('applyBreakAll')}
              </button>
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

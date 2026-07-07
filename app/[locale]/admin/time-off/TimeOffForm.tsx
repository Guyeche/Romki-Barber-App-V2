'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface OneOffBlock {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

interface BlockedDay {
  id: number;
  date: string;
  reason: string | null;
}

interface VacationRange {
  from: string;
  to: string;
  reason: string | null;
  ids: number[];
}

function generateTimeOptions() {
  const options: string[] = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    options.push(`${hour}:00`, `${hour}:20`, `${hour}:40`);
  }
  return options;
}

const timeOptions = generateTimeOptions();
const todayStr = () => new Date().toISOString().slice(0, 10);
const dayMs = 86400000;

// Group individual blocked days into contiguous ranges that share a reason,
// so a two-week vacation shows as one "from–to" row instead of 14 rows.
function groupRanges(days: BlockedDay[]): VacationRange[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const groups: VacationRange[] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    const consecutive =
      last &&
      new Date(`${last.to}T00:00:00Z`).getTime() + dayMs ===
        new Date(`${d.date}T00:00:00Z`).getTime();
    if (last && consecutive && (last.reason || '') === (d.reason || '')) {
      last.to = d.date;
      last.ids.push(d.id);
    } else {
      groups.push({ from: d.date, to: d.date, reason: d.reason, ids: [d.id] });
    }
  }
  return groups;
}

export default function TimeOffForm({
  initialBlocks,
  initialVacationDays = [],
}: {
  initialBlocks: OneOffBlock[];
  initialVacationDays?: BlockedDay[];
}) {
  const t = useTranslations('admin.timeOff');
  const router = useRouter();

  const [mode, setMode] = useState<'hours' | 'vacation'>('hours');

  // --- Hour-block state ---
  const [blocks, setBlocks] = useState<OneOffBlock[]>(initialBlocks);
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('14:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapCount, setOverlapCount] = useState(0);

  // --- Vacation (full-day range) state ---
  const [vacationDays, setVacationDays] = useState<BlockedDay[]>(initialVacationDays);
  const [vacFrom, setVacFrom] = useState(todayStr());
  const [vacTo, setVacTo] = useState(todayStr());
  const [vacReason, setVacReason] = useState('');
  const [vacSaving, setVacSaving] = useState(false);
  const [vacError, setVacError] = useState('');
  const [vacNote, setVacNote] = useState('');

  const vacationRanges = groupRanges(vacationDays);

  // Count existing bookings that fall inside the chosen hour window (informational).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!date || start >= end) {
        setOverlapCount(0);
        return;
      }
      try {
        const res = await fetch(`/api/appointments?date=${date}`);
        if (!res.ok) return;
        const booked: string[] = await res.json();
        if (cancelled) return;
        const count = booked.filter((time) => {
          const hm = time.substring(0, 5);
          return hm >= start && hm < end;
        }).length;
        setOverlapCount(count);
      } catch {
        /* non-critical */
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [date, start, end]);

  const handleAdd = async () => {
    setError('');
    if (start >= end) {
      setError(t('invalid'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, start_time: start, end_time: end, reason: reason || null }),
      });
      if (!res.ok) {
        setError(t('error'));
        return;
      }
      const { block } = await res.json();
      setBlocks((prev) =>
        [...prev, block].sort((a, b) =>
          a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)
        )
      );
      setReason('');
      router.refresh();
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/blocks?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    }
  };

  const handleAddVacation = async () => {
    setVacError('');
    setVacNote('');
    if (vacTo < vacFrom) {
      setVacError(t('rangeInvalid'));
      return;
    }
    setVacSaving(true);
    try {
      const res = await fetch('/api/blocked-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: vacFrom, to: vacTo, reason: vacReason || null }),
      });
      if (!res.ok) {
        setVacError(t('error'));
        return;
      }
      const { days, existingBookings } = await res.json();
      // Merge returned days into state, de-duplicating by id.
      setVacationDays((prev) => {
        const map = new Map<number, BlockedDay>();
        [...prev, ...days].forEach((d: BlockedDay) => map.set(d.id, d));
        return [...map.values()];
      });
      setVacReason('');
      if (existingBookings > 0) {
        setVacNote(t('vacationOverlap', { count: existingBookings }));
      }
      router.refresh();
    } catch {
      setVacError(t('error'));
    } finally {
      setVacSaving(false);
    }
  };

  const handleDeleteVacation = async (ids: number[]) => {
    const res = await fetch(`/api/blocked-days?ids=${ids.join(',')}`, { method: 'DELETE' });
    if (res.ok) {
      const set = new Set(ids);
      setVacationDays((prev) => prev.filter((d) => !set.has(d.id)));
      router.refresh();
    }
  };

  const inputCls =
    'bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block w-full p-2.5 transition-colors';
  const selectCls = `${inputCls} tabular-nums`;

  return (
    <div className="space-y-8">
      {/* Mode toggle */}
      <div className="inline-flex rounded-lg border border-line bg-coal p-1">
        {(['hours', 'vacation'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m ? 'bg-gold text-ink shadow-sm' : 'text-smoke hover:text-cream'
            }`}
          >
            {m === 'hours' ? t('modeHours') : t('modeVacation')}
          </button>
        ))}
      </div>

      {/* Add form */}
      {mode === 'hours' ? (
        <div className="bg-coal border border-line shadow rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('date')}</label>
              <input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className={selectCls} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('start')}</label>
              <select value={start} onChange={(e) => setStart(e.target.value)} className={selectCls}>
                {timeOptions.map((time) => (<option key={time} value={time}>{time}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('end')}</label>
              <select value={end} onChange={(e) => setEnd(e.target.value)} className={selectCls}>
                {timeOptions.map((time) => (<option key={time} value={time}>{time}</option>))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('reason')}</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reasonPlaceholder')} className={`${inputCls} placeholder-smoke/60`} />
            </div>
          </div>

          {overlapCount > 0 && (
            <p className="mt-4 text-sm text-amber-400">⚠ {t('overlapWarning', { count: overlapCount })}</p>
          )}

          <div className="mt-6 flex justify-end items-center gap-4">
            {error && <span className="text-sm text-red-400">{error}</span>}
            <button type="button" onClick={handleAdd} disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-ink bg-gold hover:bg-gold-bright focus:ring-2 focus:outline-none focus:ring-gold/50 rounded-lg text-center transition-colors disabled:opacity-60">
              {saving ? t('adding') : t('add')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-coal border border-line shadow rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('fromDate')}</label>
              <input
                type="date"
                value={vacFrom}
                min={todayStr()}
                onChange={(e) => {
                  setVacFrom(e.target.value);
                  if (vacTo < e.target.value) setVacTo(e.target.value);
                }}
                className={selectCls}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('toDate')}</label>
              <input type="date" value={vacTo} min={vacFrom} onChange={(e) => setVacTo(e.target.value)} className={selectCls} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-smoke mb-1">{t('reason')}</label>
              <input type="text" value={vacReason} onChange={(e) => setVacReason(e.target.value)} placeholder={t('vacationReasonPlaceholder')} className={`${inputCls} placeholder-smoke/60`} />
            </div>
          </div>

          {vacNote && <p className="mt-4 text-sm text-amber-400">⚠ {vacNote}</p>}

          <div className="mt-6 flex justify-end items-center gap-4">
            {vacError && <span className="text-sm text-red-400">{vacError}</span>}
            <button type="button" onClick={handleAddVacation} disabled={vacSaving} className="px-5 py-2.5 text-sm font-semibold text-ink bg-gold hover:bg-gold-bright focus:ring-2 focus:outline-none focus:ring-gold/50 rounded-lg text-center transition-colors disabled:opacity-60">
              {vacSaving ? t('adding') : t('addVacation')}
            </button>
          </div>
        </div>
      )}

      {/* Vacations list */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-smoke mb-3">{t('vacationsTitle')}</h2>
        {vacationRanges.length === 0 ? (
          <div className="text-center py-8 bg-coal border border-line rounded-xl">
            <p className="text-smoke">{t('emptyVacations')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vacationRanges.map((r) => (
              <div key={r.ids.join('-')} className="flex items-center justify-between p-4 bg-coal border border-line rounded-xl">
                <div>
                  <span className="font-semibold text-cream tabular-nums">
                    {r.from === r.to ? r.from : `${r.from} → ${r.to}`}
                  </span>
                  {r.ids.length > 1 && <span className="mx-3 text-gold text-sm">{t('daysCount', { count: r.ids.length })}</span>}
                  {r.reason && <span className="text-smoke text-sm">{r.reason}</span>}
                </div>
                <button type="button" onClick={() => handleDeleteVacation(r.ids)} className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
                  {t('delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hour blocks list */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-smoke mb-3">{t('hoursTitle')}</h2>
        {blocks.length === 0 ? (
          <div className="text-center py-8 bg-coal border border-line rounded-xl">
            <p className="text-smoke">{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-coal border border-line rounded-xl">
                <div>
                  <span className="font-semibold text-cream">{b.date}</span>
                  <span className="mx-3 text-gold tabular-nums">
                    {b.start_time.substring(0, 5)}–{b.end_time.substring(0, 5)}
                  </span>
                  {b.reason && <span className="text-smoke text-sm">{b.reason}</span>}
                </div>
                <button type="button" onClick={() => handleDelete(b.id)} className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
                  {t('delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

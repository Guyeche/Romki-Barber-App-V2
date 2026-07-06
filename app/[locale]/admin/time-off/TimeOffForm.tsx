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

export default function TimeOffForm({ initialBlocks }: { initialBlocks: OneOffBlock[] }) {
  const t = useTranslations('admin.timeOff');
  const router = useRouter();

  const [blocks, setBlocks] = useState<OneOffBlock[]>(initialBlocks);
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('14:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapCount, setOverlapCount] = useState(0);

  // Count existing bookings that fall inside the chosen window (informational only).
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

  const selectCls =
    'bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block w-full p-2.5 transition-colors tabular-nums';

  return (
    <div className="space-y-8">
      {/* Add form */}
      <div className="bg-coal border border-line shadow rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-smoke mb-1">{t('date')}</label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className={selectCls}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-smoke mb-1">{t('start')}</label>
            <select value={start} onChange={(e) => setStart(e.target.value)} className={selectCls}>
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-smoke mb-1">{t('end')}</label>
            <select value={end} onChange={(e) => setEnd(e.target.value)} className={selectCls}>
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-smoke mb-1">{t('reason')}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reasonPlaceholder')}
              className="bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold block w-full p-2.5 transition-colors placeholder-smoke/60"
            />
          </div>
        </div>

        {overlapCount > 0 && (
          <p className="mt-4 text-sm text-amber-400">
            ⚠ {t('overlapWarning', { count: overlapCount })}
          </p>
        )}

        <div className="mt-6 flex justify-end items-center gap-4">
          {error && <span className="text-sm text-red-400">{error}</span>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-ink bg-gold hover:bg-gold-bright focus:ring-2 focus:outline-none focus:ring-gold/50 rounded-lg text-center transition-colors disabled:opacity-60"
          >
            {saving ? t('adding') : t('add')}
          </button>
        </div>
      </div>

      {/* List */}
      {blocks.length === 0 ? (
        <div className="text-center py-12 bg-coal border border-line rounded-xl">
          <p className="text-smoke">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-4 bg-coal border border-line rounded-xl"
            >
              <div>
                <span className="font-semibold text-cream">{b.date}</span>
                <span className="mx-3 text-gold tabular-nums">
                  {b.start_time.substring(0, 5)}–{b.end_time.substring(0, 5)}
                </span>
                {b.reason && <span className="text-smoke text-sm">{b.reason}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(b.id)}
                className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

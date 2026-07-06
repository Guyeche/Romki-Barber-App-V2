'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

// Quick "block from now" action. todayEnd is today's closing time ('HH:MM') or null
// if the barber is closed today. todayDate is 'YYYY-MM-DD'.
interface BlockNowButtonProps {
  todayEnd: string | null;
  todayDate: string;
}

type Preset = '20' | '60' | 'rest';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (mins: number) =>
  `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;

// Next 20-minute boundary from local now, as minutes since midnight.
function nextBoundaryMins(): number {
  const now = new Date();
  return (Math.floor((now.getHours() * 60 + now.getMinutes()) / 20) + 1) * 20;
}

export default function BlockNowButton({ todayEnd, todayDate }: BlockNowButtonProps) {
  const t = useTranslations('admin.blockNow');
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>('60');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [overlapCount, setOverlapCount] = useState(0);
  const [startMins, setStartMins] = useState(0);

  useEffect(() => setMounted(true), []);

  // Recompute the start boundary whenever the modal opens.
  useEffect(() => {
    if (open) {
      setStartMins(nextBoundaryMins());
      setError('');
    }
  }, [open]);

  const endMins = useMemo(() => {
    if (todayEnd == null) return 0;
    const closing = toMin(todayEnd);
    if (preset === 'rest') return closing;
    const raw = startMins + (preset === '20' ? 20 : 60);
    return Math.min(raw, closing); // never block past closing time
  }, [preset, startMins, todayEnd]);

  const closedToday = todayEnd == null;
  const nothingLeft = !closedToday && startMins >= toMin(todayEnd!);
  const invalid = closedToday || nothingLeft || endMins <= startMins;

  // Count existing bookings inside the window (informational only).
  useEffect(() => {
    if (!open || invalid) {
      setOverlapCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/appointments?date=${todayDate}`);
        if (!res.ok) return;
        const booked: string[] = await res.json();
        if (cancelled) return;
        const s = toHHMM(startMins);
        const e = toHHMM(endMins);
        setOverlapCount(booked.filter((tm) => tm.substring(0, 5) >= s && tm.substring(0, 5) < e).length);
      } catch {
        /* non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, invalid, startMins, endMins, todayDate]);

  const handleConfirm = async () => {
    setError('');
    if (invalid) return;
    setSaving(true);
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayDate,
          start_time: toHHMM(startMins),
          end_time: toHHMM(endMins),
          reason: reason || null,
        }),
      });
      if (!res.ok) {
        setError(t('error'));
        return;
      }
      setOpen(false);
      setReason('');
      router.refresh();
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const presetBtn = (p: Preset, label: string) => (
    <button
      type="button"
      onClick={() => setPreset(p)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
        preset === p
          ? 'bg-gold text-ink border-gold'
          : 'bg-ink text-cream border-line hover:border-gold/60'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-semibold text-ink bg-gold rounded-lg hover:bg-gold-bright transition-colors shadow-sm"
      >
        {t('button')}
      </button>

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-md bg-coal border border-line rounded-2xl p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl font-bold text-cream mb-4">{t('title')}</h2>

              {closedToday ? (
                <p className="text-smoke">{t('closedToday')}</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {presetBtn('20', t('preset20'))}
                    {presetBtn('60', t('preset1h'))}
                    {presetBtn('rest', t('presetRestOfDay'))}
                  </div>

                  <p className="text-sm text-smoke mb-4 tabular-nums">
                    {nothingLeft ? (
                      <span className="text-amber-400">{t('closedToday')}</span>
                    ) : (
                      <>
                        <span className="text-cream font-semibold">
                          {toHHMM(startMins)} – {toHHMM(endMins)}
                        </span>
                      </>
                    )}
                  </p>

                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('reasonPlaceholder')}
                    className="w-full mb-4 bg-ink border border-line text-cream text-sm rounded-lg focus:ring-1 focus:ring-gold/50 focus:border-gold p-2.5 transition-colors placeholder-smoke/60"
                  />

                  {overlapCount > 0 && (
                    <p className="mb-4 text-sm text-amber-400">
                      ⚠ {t('overlapWarning', { count: overlapCount })}
                    </p>
                  )}
                </>
              )}

              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-smoke hover:text-cream transition-colors"
                >
                  {t('cancel')}
                </button>
                {!closedToday && (
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={saving || invalid}
                    className="px-5 py-2.5 text-sm font-semibold text-ink bg-gold hover:bg-gold-bright rounded-lg transition-colors disabled:opacity-60"
                  >
                    {saving ? t('confirming') : t('confirm')}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

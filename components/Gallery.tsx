'use client';

import { useState, useEffect, useCallback } from 'react';

// Photos are pre-optimized into /public/gallery/{thumb,full}/N.webp by the
// image build step. Keep GALLERY_COUNT in sync with the number of files there.
const GALLERY_COUNT = 35;
const photos = Array.from({ length: GALLERY_COUNT }, (_, i) => i + 1);

export default function Gallery() {
  const [open, setOpen] = useState<number | null>(null);

  const show = useCallback((i: number) => setOpen(i), []);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: number) =>
      setOpen((cur) => (cur === null ? cur : (cur + dir + GALLERY_COUNT) % GALLERY_COUNT)),
    []
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close, step]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {photos.map((n, i) => (
          <button
            key={n}
            type="button"
            onClick={() => show(i)}
            aria-label={`Open photo ${n}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-coal focus:outline-none focus:ring-2 focus:ring-gold/60"
          >
            <img
              src={`/gallery/thumb/${n}.webp`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={close}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-coal/80 text-cream transition-colors hover:border-gold/60 hover:text-gold"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>

          {/* Prev */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); step(-1); }}
            aria-label="Previous"
            className="absolute left-3 sm:left-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-coal/80 text-cream transition-colors hover:border-gold/60 hover:text-gold"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); step(1); }}
            aria-label="Next"
            className="absolute right-3 sm:right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-coal/80 text-cream transition-colors hover:border-gold/60 hover:text-gold"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          <img
            src={`/gallery/full/${photos[open]}.webp`}
            alt={`Photo ${photos[open]}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />

          <span dir="ltr" className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-line bg-coal/80 px-3 py-1 text-xs tabular-nums text-smoke">
            {open + 1} / {GALLERY_COUNT}
          </span>
        </div>
      )}
    </>
  );
}

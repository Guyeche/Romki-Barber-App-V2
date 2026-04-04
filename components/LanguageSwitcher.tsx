'use client';

import { useLanguageSwitcher } from '../lib/i18n';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const { switchLanguage } = useLanguageSwitcher();
  const currentLocale = useLocale();

  return (
    <div className="flex items-center gap-1 bg-stone-900/80 p-1 rounded-lg border border-stone-800 shadow-inner backdrop-blur-sm">
      <button
        onClick={() => switchLanguage('en')}
        className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
          currentLocale === 'en'
            ? 'bg-[#ecb613] text-black shadow-sm'
            : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/50'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => switchLanguage('he')}
        className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
          currentLocale === 'he'
            ? 'bg-[#ecb613] text-black shadow-sm'
            : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/50'
        }`}
        aria-label="Switch to Hebrew"
      >
        עברית
      </button>
    </div>
  );
}

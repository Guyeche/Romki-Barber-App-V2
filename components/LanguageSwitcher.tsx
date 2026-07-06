'use client';

import { useLanguageSwitcher } from '../lib/i18n';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const { switchLanguage } = useLanguageSwitcher();
  const currentLocale = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-coal p-1">
      <button
        onClick={() => switchLanguage('en')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
          currentLocale === 'en'
            ? 'bg-gold text-ink'
            : 'text-smoke hover:text-cream'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => switchLanguage('he')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
          currentLocale === 'he'
            ? 'bg-gold text-ink'
            : 'text-smoke hover:text-cream'
        }`}
        aria-label="Switch to Hebrew"
      >
        עברית
      </button>
    </div>
  );
}

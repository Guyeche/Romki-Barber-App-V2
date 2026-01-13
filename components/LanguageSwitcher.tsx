'use client';

import { useLanguageSwitcher } from '../lib/i18n';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const { switchLanguage } = useLanguageSwitcher();
  const currentLocale = useLocale();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => switchLanguage('en')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          currentLocale === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => switchLanguage('he')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          currentLocale === 'he'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
        aria-label="Switch to Hebrew"
      >
        עברית
      </button>
    </div>
  );
}

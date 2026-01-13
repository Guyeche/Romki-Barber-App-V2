'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useParams } from 'next/navigation';

export function useLanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const switchLanguage = (newLocale: string) => {
    // Store preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('language-preference', newLocale);
    }

    // Replace the locale in the current pathname
    const segments = pathname.split('/').filter(Boolean);
    
    // Check if first segment is a locale
    if (segments[0] && ['en', 'he'].includes(segments[0])) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    
    router.push('/' + segments.join('/'));
    router.refresh();
  };

  return { locale, switchLanguage };
}

export function getStoredLanguagePreference(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('language-preference');
}

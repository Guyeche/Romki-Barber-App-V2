'use client'

import { usePathname } from '../lib/navigation';
import { useEffect } from 'react';

export default function BackgroundController() {
  const pathname = usePathname();

  useEffect(() => {
    let bgUrl = '';

    if (pathname === '/') {
      bgUrl = process.env.NEXT_PUBLIC_BG_HOME || '';
    } else if (pathname?.startsWith('/booking')) {
      bgUrl = process.env.NEXT_PUBLIC_BG_BOOKING || '';
    } else if (pathname?.startsWith('/admin')) {
      bgUrl = process.env.NEXT_PUBLIC_BG_ADMIN || '';
    }

    if (bgUrl) {
      document.body.style.backgroundImage = `url(${bgUrl})`;
    } else {
      document.body.style.backgroundImage = ''; // Fallback to CSS gradient
    }
  }, [pathname]);

  return null;
}

import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'he'],
  
  // CHANGE THIS LINE:
  defaultLocale: 'he' 
});

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
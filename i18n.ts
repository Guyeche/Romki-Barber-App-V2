import {getRequestConfig} from 'next-intl/server';
import {routing} from './lib/routing';

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the [locale] path segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale, // <--- THIS WAS MISSING! It is required.
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
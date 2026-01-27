import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../lib/routing'; // <--- UPDATED IMPORT
import { Rubik } from "next/font/google";
import "../globals.css"; 
import LanguageSwitcher from '../../components/LanguageSwitcher'; 
import BackgroundController from '../../components/BackgroundController';
import CancelBookingModal from '../../components/CancelBookingModal';
import type { Metadata } from "next";

const rubik = Rubik({ subsets: ["latin", "hebrew"] });

export const metadata: Metadata = {
  title: "BarberLaki",
  description: "Book your appointment at BarberLaki",
};

export function generateStaticParams() {
  // Use routing.locales instead of just locales
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Use routing.locales here as well
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const isRTL = locale === 'he';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={rubik.className} suppressHydrationWarning>
        <div className={isRTL ? 'rtl' : 'ltr'}>
          <NextIntlClientProvider messages={messages}>
            <BackgroundController />
            <nav className="fixed top-0 right-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-sm p-4">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <CancelBookingModal />
                <LanguageSwitcher />
              </div>
            </nav>
            <div className="pt-16">
              {children}
            </div>
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}

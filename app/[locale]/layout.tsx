import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../lib/routing'; // <--- UPDATED IMPORT
import { Rubik, Playfair_Display, Frank_Ruhl_Libre } from "next/font/google";
import "../globals.css";
import LanguageSwitcher from '../../components/LanguageSwitcher';
import BackgroundController from '../../components/BackgroundController';
import CancelBookingModal from '../../components/CancelBookingModal';
import { Link } from '@/lib/navigation';
import type { Metadata } from "next";

const rubik = Rubik({ subsets: ["latin", "hebrew"], variable: "--font-rubik" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const frankRuhl = Frank_Ruhl_Libre({ subsets: ["hebrew", "latin"], variable: "--font-frank-ruhl" });

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
      <body className={`${rubik.variable} ${playfair.variable} ${frankRuhl.variable} font-body`} suppressHydrationWarning>
        <div className={isRTL ? 'rtl' : 'ltr'}>
          <NextIntlClientProvider messages={messages}>
            <BackgroundController />
            <nav className="fixed top-0 right-0 left-0 z-50 border-b border-line bg-ink/80 backdrop-blur-md">
              <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
                <Link href="/" className="font-display text-lg sm:text-xl font-bold tracking-wide text-gold hover:text-gold-bright transition-colors whitespace-nowrap">
                  BarberLaki
                </Link>
                <div className="flex items-center gap-3">
                  <CancelBookingModal />
                  <LanguageSwitcher />
                </div>
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

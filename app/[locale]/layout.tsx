import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../lib/routing';
import "../globals.css"; 
import LanguageSwitcher from '../../components/LanguageSwitcher'; 
import BackgroundController from '../../components/BackgroundController';
import { Link } from '../../lib/navigation';
import CancelBookingModal from '../../components/CancelBookingModal';
import type { Metadata } from "next";
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
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning className="antialiased">
      <body suppressHydrationWarning>
        <div className={isRTL ? 'rtl' : 'ltr'}>
          <NextIntlClientProvider messages={messages}>
            <BackgroundController />
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-800 bg-black/60 backdrop-blur-md">
              <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="font-heading text-xl md:text-2xl font-bold tracking-wider text-stone-100 hover:text-[#ecb613] transition-colors">
                  BARBERLAKI
                </Link>
                <div className="flex items-center gap-2 sm:gap-6">
                  <CancelBookingModal />
                  <LanguageSwitcher />
                </div>
              </div>
            </nav>
            <main className="">
              {children}
            </main>
          </NextIntlClientProvider>
        </div>
      </body>
    </html>
  );
}

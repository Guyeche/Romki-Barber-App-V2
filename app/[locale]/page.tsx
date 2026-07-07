import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { Scissors, Sparkles, Clock, MapPin, Phone } from 'lucide-react';
import Gallery from '@/components/Gallery';

export default async function Home() {
  const t = await getTranslations('home');
  const tServices = await getTranslations('booking.services');

  const services = [
    { icon: Scissors, name: tServices('haircut'), description: t('services.haircut.description'), price: t('services.haircut.price') },
    { icon: Sparkles, name: tServices('beardTrim'), description: t('services.beardTrim.description'), price: t('services.beardTrim.price') },
    { icon: Scissors, name: tServices('haircutBeardTrim'), description: t('services.combo.description'), price: t('services.combo.price') },
    { icon: Scissors, name: tServices('scissorsHaircut'), description: t('services.scissorsHaircut.description'), price: t('services.scissorsHaircut.price') },
    { icon: Scissors, name: tServices('oneLengthClipper'), description: t('services.oneLengthClipper.description'), price: t('services.oneLengthClipper.price') },
  ];

  return (
    <div className="-mt-16">
      {/* Hero */}
      <section className="relative flex min-h-screen items-center pt-16">
        <div className="absolute inset-0">
          <img
            src="/hero-barber.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-ink/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/80" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
          <div className="max-w-xl">
            <div className="mb-6 inline-block rounded-full border border-line bg-coal/60 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-smoke">{t('tagline')}</span>
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.1] md:text-6xl lg:text-7xl">
              {t('heroTitle1')}{' '}
              <span className="text-gradient-gold">{t('heroTitle2')}</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-smoke md:text-lg">
              {t('description')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/booking"
                className="rounded-xl bg-gold px-10 py-3.5 text-base font-semibold text-ink shadow-[0_0_30px_rgba(210,161,58,0.25)] transition-all hover:bg-gold-bright hover:shadow-[0_0_40px_rgba(210,161,58,0.4)]"
              >
                {t('bookNow')}
              </Link>
              <a
                href="#services"
                className="rounded-xl border border-gold/40 px-10 py-3.5 text-base font-semibold text-gold transition-colors hover:bg-gold/10"
              >
                {t('ourServices')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">{t('whatWeOffer')}</span>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">{t('ourServices')}</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="group rounded-2xl border border-line bg-card p-8 transition-all duration-300 hover:border-gold/40 hover:shadow-[0_0_40px_rgba(210,161,58,0.08)]"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
                  <service.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">{service.name}</h3>
                <p className="mb-6 text-sm leading-relaxed text-smoke">{service.description}</p>
                <p className="font-display text-2xl font-bold text-gold">{service.price}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/booking"
              className="inline-block rounded-xl bg-gold px-10 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-gold-bright"
            >
              {t('bookNow')}
            </Link>
          </div>
        </div>
      </section>

      {/* Meet the Barber */}
      <section id="about" className="border-t border-line py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-gold/20 via-transparent to-gold/10" />
              <img
                src="/barber-portrait.webp"
                alt={t('about.imageAlt')}
                className="relative w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">{t('about.eyebrow')}</span>
              <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
                {t('about.title1')}{' '}
                <span className="text-gradient-gold">{t('about.title2')}</span>
              </h2>
              <p className="mt-6 text-base leading-relaxed text-smoke">{t('about.body1')}</p>
              <p className="mt-4 text-base leading-relaxed text-smoke">{t('about.body2')}</p>
              <div className="mt-10">
                <Link
                  href="/booking"
                  className="inline-block rounded-xl border border-gold/40 px-8 py-3 font-semibold text-gold transition-colors hover:bg-gold/10"
                >
                  {t('bookNow')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="border-t border-line py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">{t('gallery.eyebrow')}</span>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">{t('gallery.title')}</h2>
          </div>
          <Gallery />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-coal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <h3 className="mb-4 font-display text-2xl font-bold text-gold">{t('title')}</h3>
              <p className="text-sm leading-relaxed text-smoke">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="mb-4 font-display text-lg font-semibold">{t('footer.hoursTitle')}</h4>
              <div className="space-y-2 text-sm text-smoke">
                <div className="flex items-center gap-2"><Clock size={14} className="text-gold" /><span>{t('footer.hours1')}</span></div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-gold" /><span>{t('footer.hours2')}</span></div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-gold" /><span>{t('footer.hours3')}</span></div>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-display text-lg font-semibold">{t('footer.visitTitle')}</h4>
              <div className="space-y-2 text-sm text-smoke">
                <div className="flex items-center gap-2"><MapPin size={14} className="text-gold" /><span>{t('footer.location')}</span></div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-gold" /><span dir="ltr">{t('footer.phone')}</span></div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-line pt-8 text-center">
            <p className="text-xs text-smoke">{t('footer.rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

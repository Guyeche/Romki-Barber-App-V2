import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Scissors, Sparkles, Flame, Instagram, Facebook, MapPin, Clock, Phone } from "lucide-react";

export default async function Home() {
  const t = await getTranslations('landing');
  const tCommon = await getTranslations('common');

  const services = [
    {
      icon: Scissors,
      title: t('services.haircut.title'),
      description: t('services.haircut.desc'),
      price: t('services.haircut.price'),
    },
    {
      icon: Sparkles,
      title: t('services.beard.title'),
      description: t('services.beard.desc'),
      price: t('services.beard.price'),
    },
  ];

  return (
    <div className="min-h-screen font-body">
      {/* Hero */}
      <section className="relative flex min-h-screen items-center bg-black">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2674&auto=format&fit=crop"
            alt="Barber at work"
            className="h-full w-full object-cover opacity-60"
          />
          {/* RTL/LTR aware gradients for readability */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent rtl:bg-gradient-to-l" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-16">
          <div className="max-w-3xl ltr:pr-8 rtl:pl-8">
            <div className="mb-6 inline-block rounded-full border border-stone-700 bg-black/50 px-4 py-1.5 backdrop-blur-md shadow-lg">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-stone-300 drop-shadow-md">{t('heroSubtitle')}</span>
            </div>
            <h1 className="font-heading text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl drop-shadow-xl w-full">
              {t('heroTitle1')}
              <span className="text-gradient-gold block md:inline md:mr-3 ltr:md:ml-3 rtl:md:mr-3"> {t('heroTitle2')}</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-200 drop-shadow-lg md:text-lg">
              {t('heroDesc')}
            </p>
            <div className="mt-10 mb-8 sm:mt-14 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 items-center">
              <Link href="/booking" className="w-full sm:w-auto">
                <Button variant="gold" className="w-full sm:w-auto h-auto rounded-2xl px-10 py-5 sm:px-14 sm:py-6 text-xl sm:text-2xl font-bold shadow-[0_0_35px_rgba(236,182,19,0.5)] hover:shadow-[0_0_50px_rgba(236,182,19,0.7)] uppercase tracking-widest transform transition-all duration-300">
                  {tCommon('bookNow')}
                </Button>
              </Link>
              <a href="#services" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto h-auto rounded-2xl px-8 py-5 sm:px-10 sm:py-6 text-lg border-stone-500 text-stone-200 bg-black/50 hover:bg-black/80 hover:text-white backdrop-blur-md transition-all duration-300 font-semibold tracking-wide">
                  {t('ourServices')}
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{t('scroll')}</span>
            <div className="h-8 w-px bg-gradient-to-b from-muted-foreground to-transparent" />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-24 lg:py-32 bg-background">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{t('servicesSub')}</span>
            <h2 className="mt-3 font-heading text-4xl font-bold text-foreground md:text-5xl">{t('servicesTitle')}</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_40px_hsl(43_74%_49%/0.06)]"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <service.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">{service.title}</h3>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                <p className="font-heading text-2xl font-bold text-accent">{service.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Barber */}
      <section id="about" className="border-t border-border py-24 lg:py-32 bg-background">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/20 via-transparent to-accent/10" />
              <img
                src="/barber-portrait.jpg"
                alt="The barber"
                className="relative rounded-2xl object-cover"
                loading="lazy"
                width={800}
                height={1024}
              />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{t('aboutSub')}</span>
              <h2 className="mt-3 font-heading text-4xl font-bold text-foreground md:text-5xl ltr:text-left rtl:text-right">
                {t('aboutTitle1')}
                <span className="text-gradient-gold">{t('aboutTitle2')}</span>
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground">{t('aboutDesc1')}</p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t('aboutDesc2')}</p>
              <div className="mt-10 flex gap-10">
                {[
                  { value: "15+", label: t('stats.years') },
                  { value: "5K+", label: t('stats.clients') },
                  { value: "4.9", label: t('stats.rating') },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-heading text-3xl font-bold text-accent">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <h3 className="mb-4 font-heading text-2xl font-bold text-accent">BarberLaki</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('footer.desc')}
              </p>
              <div className="mt-6 flex gap-4">
                <a href="#" className="text-muted-foreground transition-colors hover:text-accent" aria-label="Instagram">
                  <Instagram size={20} />
                </a>
                <a href="#" className="text-muted-foreground transition-colors hover:text-accent" aria-label="Facebook">
                  <Facebook size={20} />
                </a>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-heading text-lg font-semibold text-foreground">{t('footer.hours')}</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Clock size={14} className="text-accent" /><span>{t('footer.hours1')}</span></div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-accent" /><span>{t('footer.hours2')}</span></div>
                <div className="flex items-center gap-2"><Clock size={14} className="text-accent" /><span>{t('footer.hours3')}</span></div>
              </div>
            </div>
            <div>
              <h4 className="mb-4 font-heading text-lg font-semibold text-foreground">{t('footer.location')}</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin size={14} className="text-accent" /><span>{t('footer.address')}</span></div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-accent" /><span>+972 50-123-4567</span></div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center">
            <p className="text-xs text-muted-foreground">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

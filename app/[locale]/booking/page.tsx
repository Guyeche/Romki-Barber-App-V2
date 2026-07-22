'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { bookAppointment } from '../../actions'
import DateTimePicker from '../../../components/DateTimePicker'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'

const initialState: { message: string; success?: boolean } = {
  message: '',
}

const inputClasses = "block w-full px-4 py-3 mt-1.5 text-cream bg-ink border border-line rounded-lg placeholder-smoke/50 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 transition-colors sm:text-sm"
const labelClasses = "block text-xs font-semibold uppercase tracking-[0.15em] text-smoke"

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('booking')

  return (
    <button
      type="submit"
      aria-disabled={pending}
      className="w-full px-6 py-3.5 text-lg font-semibold text-ink bg-gold rounded-xl shadow-[0_0_30px_rgba(210,161,58,0.2)] transition-all hover:bg-gold-bright hover:shadow-[0_0_40px_rgba(210,161,58,0.35)] disabled:opacity-60"
    >
      {pending ? t('booking') : t('bookAppointment')}
    </button>
  )
}

export default function BookingPage() {
  const [state, formAction] = useFormState(bookAppointment, initialState)
  const [dateTime, setDateTime] = useState<{ date?: Date; time?: string }>({ date: undefined, time: undefined });
  const [formData, setFormData] = useState({ name: '', email: '' });
  const t = useTranslations('booking')

  useEffect(() => {
    const savedName = localStorage.getItem('barber_app_name');
    const savedEmail = localStorage.getItem('barber_app_email');
    if (savedName || savedEmail) {
      setFormData({
        name: savedName || '',
        email: savedEmail || ''
      });
    }
  }, []);

  const handleSubmit = (payload: FormData) => {
    const name = payload.get('name') as string;
    const email = payload.get('email') as string;

    if (name) localStorage.setItem('barber_app_name', name);
    if (email) localStorage.setItem('barber_app_email', email);

    formAction(payload);
  };

  const handleDateTimeChange = (date: Date, time: string) => {
    setDateTime({ date, time });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 py-12">
      <div className="max-w-lg w-full p-8 sm:p-10 bg-coal/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-line">
        <span className="block text-center text-xs font-semibold uppercase tracking-[0.3em] text-gold">BarberLaki</span>
        <h1 className="mt-3 font-display text-4xl font-bold text-center">{t('title')}</h1>

        {!state.success ? (
          <form action={handleSubmit} className="mt-10 space-y-6">
            {state.message && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center" role="alert">
                {state.message}
              </div>
            )}
            <div>
              <label htmlFor="name" className={labelClasses}>{t('yourName')}</label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClasses}>{t('yourEmail')}</label>
              <input
                type="email"
                name="email"
                id="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="service" className={labelClasses}>{t('selectService')}</label>
              <select id="service" name="service" required className={inputClasses}>
                <option>{t('services.haircutBeardTrim')}</option>
                <option>{t('services.haircut')}</option>
                <option>{t('services.scissorsHaircut')}</option>
                <option>{t('services.oneLengthClipper')}</option>
                <option>{t('services.beardTrim')}</option>
              </select>
            </div>
            <div>
              <DateTimePicker onDateTimeChange={handleDateTimeChange} />
              <input type="hidden" name="date" value={dateTime.date ? `${dateTime.date.getFullYear()}-${String(dateTime.date.getMonth() + 1).padStart(2, '0')}-${String(dateTime.date.getDate()).padStart(2, '0')}` : ''} />
              <input type="hidden" name="time" value={dateTime.time || ''} />
            </div>
            <div className="pt-2">
              <SubmitButton />
            </div>
          </form>
        ) : (
          <div className="mt-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 border border-gold/40">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-gold">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="mt-6 text-lg text-cream">{state.message}</p>
            <Link href="/" className="mt-8 inline-block px-8 py-3 text-lg font-semibold text-ink bg-gold rounded-xl hover:bg-gold-bright transition-colors">
              {t('bookAnother')}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

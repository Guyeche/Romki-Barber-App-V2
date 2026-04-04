'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { bookAppointment } from '../../actions'
import DateTimePicker from '../../../components/DateTimePicker'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/navigation'

const initialState = {
  message: '',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('booking')

  return (
    <button type="submit" aria-disabled={pending} className="px-8 py-4 text-lg font-bold text-black bg-[#ecb613] rounded-xl shadow-[0_0_15px_rgba(236,182,19,0.3)] hover:bg-[#dca912] hover:shadow-[0_0_25px_rgba(236,182,19,0.5)] transition-all w-full mt-4">
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
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 pt-24 pb-12 font-body">
      {/* Shared Premium Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2674&auto=format&fit=crop"
          alt="Background"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      </div>

      <div className="max-w-xl w-full p-8 md:p-10 bg-black/50 backdrop-blur-2xl shadow-2xl rounded-3xl border border-stone-800 relative z-10">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ecb613] to-[#fde047] rounded-t-3xl"></div>
        <h1 className="text-3xl md:text-5xl font-heading font-bold text-center text-white mt-2 drop-shadow-md">{t('title')}</h1>
        <p className="mt-4 text-center text-stone-300">{t('description')}</p>
        
        {!state.message ? (
          <form action={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-stone-300">{t('yourName')}</label>
              <input 
                type="text" 
                name="name" 
                id="name" 
                required 
                value={formData.name}
                onChange={handleInputChange}
                className="block w-full px-4 py-3.5 text-stone-100 bg-[#111111]/80 border border-stone-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ecb613] focus:border-transparent transition-all placeholder-stone-600 backdrop-blur-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-stone-300">{t('yourEmail')}</label>
              <input 
                type="email" 
                name="email" 
                id="email" 
                required 
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full px-4 py-3.5 text-stone-100 bg-[#111111]/80 border border-stone-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ecb613] focus:border-transparent transition-all placeholder-stone-600 backdrop-blur-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="service" className="block text-sm font-medium text-stone-300">{t('selectService')}</label>
              <select id="service" name="service" required className="block w-full px-4 py-3.5 text-stone-100 bg-[#111111]/80 border border-stone-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ecb613] focus:border-transparent transition-all backdrop-blur-sm appearance-none">
                <option value={t('services.haircutBeardTrim')} className="bg-stone-900">{t('services.haircutBeardTrim')}</option>
                <option value={t('services.haircut')} className="bg-stone-900">{t('services.haircut')}</option>
                <option value={t('services.beardTrim')} className="bg-stone-900">{t('services.beardTrim')}</option>
              </select>
            </div>
            <div className="pt-2">
              <DateTimePicker onDateTimeChange={handleDateTimeChange} />
              <input type="hidden" name="date" value={dateTime.date ? `${dateTime.date.getFullYear()}-${String(dateTime.date.getMonth() + 1).padStart(2, '0')}-${String(dateTime.date.getDate()).padStart(2, '0')}` : ''} />
              <input type="hidden" name="time" value={dateTime.time || ''} />
            </div>
            <div className="text-center pt-2">
              <SubmitButton />
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center bg-green-950/40 p-8 rounded-2xl border border-green-900/50 shadow-inner backdrop-blur-sm">
            <p className="text-green-400 text-xl font-bold drop-shadow-sm mb-6">{state.message}</p>
            <Link href="/" className="inline-block px-10 py-4 text-base font-bold text-black bg-[#ecb613] rounded-xl shadow-[0_0_15px_rgba(236,182,19,0.3)] hover:bg-[#dca912] w-full sm:w-auto transition-all">
              {t('bookAnother')}
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

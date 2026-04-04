'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import { verifyAndGetAppointments, cancelClientAppointment } from '../app/client-actions'
import { formatIsraeliDate } from '../lib/date-utils'
import { Button } from '@/components/ui/button'
import { CalendarDays, X } from 'lucide-react'

const initialState: any = {
  error: '',
  appointments: [],
  success: undefined
}

function SubmitButton({ text, loadingText }: { text: string, loadingText: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-[#ecb613] text-black hover:bg-[#dca912]"
    >
      {pending ? loadingText : text}
    </Button>
  )
}

export default function CancelBookingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [state, formAction] = useFormState(verifyAndGetAppointments, initialState)
  const t = useTranslations('cancellation')
  const tCommon = useTranslations('common')
  const [cancelMessage, setCancelMessage] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCancel = async (id: number, name: string, email: string) => {
    if (!confirm(t('confirmCancel'))) return;

    setCancelMessage(tCommon('loading'));
    const result = await cancelClientAppointment(id, name, email);
    if (result.success) {
        setCancelMessage(t('cancelSuccess'));
        setTimeout(() => {
             setIsOpen(false);
             setCancelMessage('');
        }, 2000);
    } else {
        setCancelMessage(result.message || t('cancelError'));
    }
  }

  const openModal = () => {
      setIsOpen(true);
      setCancelMessage('');
  }

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-body" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer" 
        aria-hidden="true" 
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 bg-stone-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-lg border border-stone-800">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ecb613] to-[#fde047]"></div>
        
        {/* Close button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-100 transition-colors p-1"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-8 py-8">
            <div className="w-full">
                <h3 className="text-2xl font-heading font-bold text-stone-100 mb-4" id="modal-title">
                  {t('title')}
                </h3>
                
                {cancelMessage && (
                    <div className={`mt-2 mb-4 p-3 rounded-xl border text-sm ${cancelMessage.includes('success') || cancelMessage === t('cancelSuccess') ? 'bg-green-950/50 border-green-900 text-green-400' : 'bg-red-950/50 border-red-900 text-red-400'}`}>
                        {cancelMessage}
                    </div>
                )}

                {!state.appointments || state.appointments.length === 0 ? (
                    <>
                        <div className="mb-6">
                            <p className="text-sm text-stone-400">
                                {t('description')}
                            </p>
                        </div>
                        <form action={formAction} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="modal-name" className="block text-sm font-medium text-stone-200">{tCommon('name')}</label>
                                <input type="text" name="name" id="modal-name" required className="block w-full border border-stone-800 bg-stone-950 rounded-xl shadow-sm py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-[#ecb613] text-sm text-stone-100 transition-shadow placeholder:text-stone-500" placeholder="John Doe" />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="modal-email" className="block text-sm font-medium text-stone-200">{tCommon('email')}</label>
                                <input type="email" name="email" id="modal-email" required className="block w-full border border-stone-800 bg-stone-950 rounded-xl shadow-sm py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-[#ecb613] text-sm text-stone-100 transition-shadow placeholder:text-stone-500" placeholder="email@example.com" />
                            </div>
                            {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
                            <div className="pt-4">
                                <SubmitButton text={t('findBookings')} loadingText={tCommon('loading')} />
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="mt-6">
                        <ul className="divide-y divide-stone-800 border border-stone-800 rounded-xl mb-6 overflow-hidden">
                            {state.appointments.map((apt: any) => (
                                <li key={apt.id} className="p-4 flex justify-between items-center bg-stone-950/50 hover:bg-stone-950 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-stone-100 mb-0.5">{formatIsraeliDate(apt.date)} &bull; {apt.time}</p>
                                        <p className="text-xs text-stone-400">{apt.service}</p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleCancel(apt.id, apt.customer_name, apt.email)}
                                    >
                                        {tCommon('cancel')}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-center">
                          <button onClick={() => window.location.reload()} className="text-xs text-stone-400 hover:text-stone-100 transition-colors underline underline-offset-4">
                              {tCommon('actions')} (Clear)
                          </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        {!state.appointments || state.appointments.length === 0 ? (
          <div className="bg-stone-950/50 px-8 py-4 flex flex-row-reverse border-t border-stone-800">
            <Button
              className="bg-transparent text-stone-300 hover:text-white hover:bg-stone-800"
              onClick={() => setIsOpen(false)}
            >
              {tCommon('cancel')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={openModal}
        className="gap-2 rounded-lg bg-[#ecb613] text-black hover:bg-[#dca912] border-none shadow-[0_0_15px_rgba(236,182,19,0.2)] font-semibold transition-all"
      >
        <CalendarDays className="h-4 w-4" />
        {t('myBookings')}
      </Button>
      {mounted && createPortal(modalContent, document.body)}
    </>
  )
}

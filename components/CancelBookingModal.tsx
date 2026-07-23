'use client'

import { useState } from 'react'
import { createPortal, useFormState, useFormStatus } from 'react-dom'
import { useTranslations } from 'next-intl'
import { verifyAndGetAppointments, cancelClientAppointment } from '../app/client-actions'
import { formatIsraeliDate } from '../lib/date-utils'

const initialState: any = {
  error: '',
  appointments: [],
  success: undefined
}

function SubmitButton({ text, loadingText }: { text: string, loadingText: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-ink bg-gold hover:bg-gold-bright focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors disabled:opacity-50"
    >
      {pending ? loadingText : text}
    </button>
  )
}

export default function CancelBookingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [state, formAction] = useFormState(verifyAndGetAppointments, initialState)
  const t = useTranslations('cancellation')
  const tCommon = useTranslations('common')
  const [cancelMessage, setCancelMessage] = useState('')
  // In-page confirmation instead of native confirm(), which some in-app/mobile
  // browsers suppress silently (returns false, no dialog) — cancelling looked dead.
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const handleCancel = async (id: number, name: string, email: string) => {
    setConfirmingId(null);
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
      setConfirmingId(null);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-3 sm:px-4 py-2 text-sm text-gold hover:bg-gold/10 font-semibold rounded-full transition-colors flex items-center gap-2 border border-gold/40 whitespace-nowrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        <span className="hidden sm:inline">{t('myBookings')}</span>
      </button>

      {/* Portal to <body>: the navbar's backdrop-filter makes it the containing
          block for position:fixed, which would trap the overlay inside the nav */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative z-10 bg-coal rounded-2xl text-start overflow-hidden shadow-2xl transform transition-all w-full max-w-lg border border-line">
            <div className="px-6 py-6">
                <div className="text-center sm:text-start w-full">
                    <h3 className="font-display text-xl leading-6 font-semibold text-cream" id="modal-title">
                      {t('title')}
                    </h3>
                    
                    {cancelMessage && (
                        <div className={`mt-2 p-2 rounded-lg ${cancelMessage.includes('success') || cancelMessage === t('cancelSuccess') ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                            {cancelMessage}
                        </div>
                    )}

                    {!state.appointments || state.appointments.length === 0 ? (
                        <>
                            <div className="mt-2">
                                <p className="text-sm text-smoke">
                                    {t('description')}
                                </p>
                            </div>
                            <form action={formAction} className="mt-5 space-y-4">
                                <div>
                                    <label htmlFor="modal-name" className="block text-xs font-semibold uppercase tracking-[0.15em] text-smoke">{tCommon('name')}</label>
                                    <input type="text" name="name" id="modal-name" required className="mt-1.5 block w-full bg-ink border border-line rounded-lg py-2.5 px-3 text-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 sm:text-sm transition-colors" />
                                </div>
                                <div>
                                    <label htmlFor="modal-email" className="block text-xs font-semibold uppercase tracking-[0.15em] text-smoke">{tCommon('email')}</label>
                                    <input type="email" name="email" id="modal-email" required className="mt-1.5 block w-full bg-ink border border-line rounded-lg py-2.5 px-3 text-cream focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 sm:text-sm transition-colors" />
                                </div>
                                {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
                                <div className="mt-4">
                                    <SubmitButton text={t('findBookings')} loadingText={tCommon('loading')} />
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="mt-4">
                            <ul className="divide-y divide-line">
                                {state.appointments.map((apt: any) => (
                                    <li key={apt.id} className="py-4 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-cream tabular-nums">{formatIsraeliDate(apt.date)} - {apt.time}</p>
                                            <p className="text-sm text-smoke">{apt.service}</p>
                                        </div>
                                        {confirmingId === apt.id ? (
                                            <div className="ms-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => handleCancel(apt.id, apt.customer_name, apt.email)}
                                                    className="bg-red-500 text-ink hover:bg-red-400 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors"
                                                >
                                                    {t('confirmCancelYes')}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmingId(null)}
                                                    className="border border-line text-smoke hover:text-cream font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors"
                                                >
                                                    {t('confirmCancelKeep')}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmingId(apt.id)}
                                                className="ms-4 border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors"
                                            >
                                                {tCommon('cancel')}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => window.location.reload()} className="mt-4 w-full text-center text-sm text-smoke hover:text-cream underline">
                                {tCommon('actions')} (Clear)
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-ink/60 px-6 py-4 sm:flex sm:flex-row-reverse border-t border-line">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-lg border border-line px-4 py-2 bg-coal text-base font-medium text-smoke hover:text-cream hover:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/40 sm:w-auto sm:text-sm transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {tCommon('cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

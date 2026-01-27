'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
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
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-full shadow-md transition-all transform hover:scale-105 flex items-center gap-2 border border-blue-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        {t('myBookings')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            aria-hidden="true" 
            onClick={() => setIsOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-6">
                <div className="text-center sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                      {t('title')}
                    </h3>
                    
                    {cancelMessage && (
                        <div className={`mt-2 p-2 rounded ${cancelMessage.includes('success') || cancelMessage === t('cancelSuccess') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {cancelMessage}
                        </div>
                    )}

                    {!state.appointments || state.appointments.length === 0 ? (
                        <>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('description')}
                                </p>
                            </div>
                            <form action={formAction} className="mt-5 space-y-4">
                                <div>
                                    <label htmlFor="modal-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{tCommon('name')}</label>
                                    <input type="text" name="name" id="modal-name" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                                <div>
                                    <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{tCommon('email')}</label>
                                    <input type="email" name="email" id="modal-email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                                {state.error && <p className="text-red-500 text-sm">{state.error}</p>}
                                <div className="mt-4">
                                    <SubmitButton text={t('findBookings')} loadingText={tCommon('loading')} />
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="mt-4">
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {state.appointments.map((apt: any) => (
                                    <li key={apt.id} className="py-4 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatIsraeliDate(apt.date)} - {apt.time}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{apt.service}</p>
                                        </div>
                                        <button
                                            onClick={() => handleCancel(apt.id, apt.customer_name, apt.email)}
                                            className="ml-4 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs"
                                        >
                                            {tCommon('cancel')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <button onClick={() => window.location.reload()} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 underline">
                                {tCommon('actions')} (Clear)
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 sm:flex sm:flex-row-reverse border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {tCommon('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login } from '../../../actions'
import { useTranslations } from 'next-intl'
import { useRouter } from '../../../../lib/routing'
import { useEffect } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('admin.login')

  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full px-4 py-2 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 transition-colors"
    >
      {/* simplified button text to avoid DOM update conflicts */}
      <span>{t('login')}</span>
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined)
  const t = useTranslations('admin.login')
  const router = useRouter()

  useEffect(() => {
    console.log('Login Page State:', state);
    if (state?.success) {
      console.log('Login successful, redirecting...');
      router.push('/admin')
    }
  }, [state, router])

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">{t('title')}</h1>
        <form action={formAction} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-200 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div className="min-h-[24px]">
            {state?.message && (
                <p className="text-sm text-red-500">{state.message}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      </div>
    </main>
  )
}

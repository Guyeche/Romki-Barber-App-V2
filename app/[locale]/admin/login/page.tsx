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
      className="w-full px-4 py-2.5 text-lg font-semibold text-ink bg-gold rounded-xl hover:bg-gold-bright disabled:opacity-60 transition-colors"
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
    <main className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-coal rounded-2xl shadow-2xl border border-line">
        <h1 className="font-display text-3xl font-bold text-center text-cream">{t('title')}</h1>
        <form action={formAction} className="space-y-6">
          <input
            type="text"
            name="username"
            value="admin"
            readOnly
            autoComplete="username"
            className="hidden"
          />
          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.15em] text-smoke">{t('password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="block w-full px-4 py-3 mt-1.5 text-cream bg-ink border border-line rounded-lg focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/50 sm:text-sm transition-colors"
            />
          </div>
          
          <div className="min-h-[24px]">
            {state?.message && (
                <p className="text-sm text-red-400">{state.message}</p>
            )}
          </div>

          <SubmitButton />
        </form>
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { cancelAppointment } from '../../actions'
import { useTranslations } from 'next-intl'

export default function CancelButton({ id }: { id: number }) {
    const t = useTranslations('admin')
    const [confirming, setConfirming] = useState(false)

    // The confirmation step is rendered in-page: a native confirm() dialog is
    // silently suppressed in some in-app/mobile browsers (it returns false
    // without ever showing), which made cancelling impossible there.
    if (!confirming) {
        return (
            <button
                type="button"
                onClick={() => setConfirming(true)}
                className="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/10 transition-colors"
            >
                {t('cancel')}
            </button>
        )
    }

    return (
        <form action={cancelAppointment} className="flex items-center gap-2 flex-wrap justify-end">
            <input type="hidden" name="id" value={id} />
            <span className="text-xs text-smoke">{t('cancelConfirm')}</span>
            <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-ink bg-red-500 rounded-lg hover:bg-red-400 transition-colors"
            >
                {t('confirmCancelYes')}
            </button>
            <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 text-xs font-semibold text-smoke border border-line rounded-lg hover:text-cream hover:border-gold/40 transition-colors"
            >
                {t('confirmCancelKeep')}
            </button>
        </form>
    )
}

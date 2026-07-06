'use client'

import { cancelAppointment } from '../../actions'
import { useTranslations } from 'next-intl'

export default function CancelButton({ id }: { id: number }) {
    const t = useTranslations('admin')
    
    return (
        <form action={cancelAppointment}>
            <input type="hidden" name="id" value={id} />
            <button 
                type="submit"
                onClick={(e) => {
                    if (!confirm(t('cancelConfirm'))) {
                        e.preventDefault();
                    }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/10 transition-colors"
            >
                {t('cancel')}
            </button>
        </form>
    )
}

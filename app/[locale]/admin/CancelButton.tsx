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
                className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
                {t('cancel')}
            </button>
        </form>
    )
}

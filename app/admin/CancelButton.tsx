'use client'

import { cancelAppointment } from './actions'

export default function CancelButton({ id }: { id: number }) {
    return (
        <form action={cancelAppointment}>
            <input type="hidden" name="id" value={id} />
            <button 
                type="submit"
                onClick={(e) => {
                    if (!confirm('Are you sure you want to cancel this appointment?')) {
                        e.preventDefault();
                    }
                }}
                className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
                Cancel
            </button>
        </form>
    )
}

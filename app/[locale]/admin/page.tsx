import { supabase } from '../../../lib/server/supabase'
import { logout } from '../../admin/actions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CancelButton from '../../admin/CancelButton'
import { getTranslations, getLocale } from 'next-intl/server'

// This tells Next.js not to cache the page, so we always see the latest data.
export const revalidate = 0;

async function getAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, customer_name, date, time, service')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return data;
}

export default async function AdminPage() {
  const cookieStore = cookies()
  const session = cookieStore.get('session')
  const locale = await getLocale()
  const t = await getTranslations('admin')

  if (!session || session.value !== 'admin') {
    redirect(`/${locale}/admin/login`)
  }

  const appointments = await getAppointments();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
          <form action={logout}>
            <button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">{t('logout')}</button>
          </form>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-xl overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('customer')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('service')}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('dateTime')}</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">{t('actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {appointments.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            {t('noAppointments')}
                        </td>
                    </tr>
                ) : appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold">{appointment.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{appointment.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold">{new Date(appointment.date).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <CancelButton id={appointment.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

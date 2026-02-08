import { supabase } from '../../../lib/server/supabase'
import { logout } from '../../actions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '../../../lib/routing';
import AdminDashboard from '../../../components/AdminDashboard';

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
  const session = cookieStore.get('admin_session')
  const locale = await getLocale()
  const t = await getTranslations('admin')

  if (!session || session.value !== 'true') {
    redirect(`/${locale}/admin/login`)
  }

  const appointments = await getAppointments();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white pb-20">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('dashboard')}</h1>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <Link href="/admin/schedule" className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              {t('schedule.title')}
            </Link>
            <form action={logout}>
              <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm">{t('logout')}</button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AdminDashboard appointments={appointments} />
      </main>
    </div>
  );
}

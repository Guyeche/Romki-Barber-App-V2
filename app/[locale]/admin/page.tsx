import { supabase } from '../../../lib/server/supabase'
import { logout } from '../../actions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '../../../lib/routing';
import AdminDashboard from '../../../components/AdminDashboard';
import BlockNowButton from '../../../components/BlockNowButton';

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

  // Today's closing time (for the "block from now → rest of today" preset).
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayWeekday = new Date().getDay();
  const { data: todaySchedule } = await supabase
    .from('work_schedule')
    .select('start_time, end_time, is_active')
    .eq('day_of_week', todayWeekday)
    .single();
  const todayEnd =
    todaySchedule?.is_active && todaySchedule.end_time
      ? todaySchedule.end_time.substring(0, 5)
      : null;

  return (
    <div className="min-h-screen text-cream pb-20">
      <header className="bg-coal/90 backdrop-blur-md border-b border-line shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-cream">{t('dashboard')}</h1>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <BlockNowButton todayEnd={todayEnd} todayDate={todayDate} />
            <Link href="/admin/time-off" className="px-3 py-2 text-sm font-medium text-gold hover:text-gold-bright transition-colors">
              {t('timeOff.nav')}
            </Link>
            <Link href="/admin/schedule" className="px-3 py-2 text-sm font-medium text-gold hover:text-gold-bright transition-colors">
              {t('schedule.title')}
            </Link>
            <form action={logout}>
              <button type="submit" className="px-4 py-2 text-sm font-semibold text-ink bg-gold rounded-lg hover:bg-gold-bright transition-colors shadow-sm">{t('logout')}</button>
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

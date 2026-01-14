import { supabase } from '../../../../lib/server/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import ScheduleForm from './ScheduleForm';

export const revalidate = 0;

export default async function SchedulePage() {
  const cookieStore = cookies();
  const session = cookieStore.get('admin_session');
  const locale = await getLocale();
  const t = await getTranslations('admin.schedule');

  if (!session || session.value !== 'true') {
    redirect(`/${locale}/admin/login`);
  }

  // Fetch initial schedule
  const { data: schedule } = await supabase
    .from('work_schedule')
    .select('*')
    .order('day_of_week', { ascending: true });

  // Fetch initial settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'booking_window_days')
    .single();

  const bookingWindow = settings?.value ? parseInt(settings.value) : 14;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>
            <ScheduleForm initialSchedule={schedule || []} initialBookingWindow={bookingWindow} />
        </div>
    </div>
  );
}

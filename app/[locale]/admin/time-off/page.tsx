import { supabase } from '../../../../lib/server/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '../../../../lib/routing';
import TimeOffForm from './TimeOffForm';

export const revalidate = 0;

export default async function TimeOffPage() {
  const cookieStore = cookies();
  const session = cookieStore.get('admin_session');
  const locale = await getLocale();
  const t = await getTranslations('admin.timeOff');

  if (!session || session.value !== 'true') {
    redirect(`/${locale}/admin/login`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: blocks } = await supabase
    .from('schedule_blocks')
    .select('id, date, start_time, end_time, reason')
    .not('date', 'is', null)
    .gte('date', today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  const { data: blockedDays } = await supabase
    .from('blocked_days')
    .select('id, date, reason')
    .gte('date', today)
    .order('date', { ascending: true });

  return (
    <div className="min-h-screen text-cream p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold">{t('title')}</h1>
          <Link
            href="/admin"
            className="text-sm font-medium text-gold hover:text-gold-bright transition-colors"
          >
            ← {locale === 'he' ? 'לוח בקרה' : 'Dashboard'}
          </Link>
        </div>
        <p className="text-smoke text-sm mb-8">{t('subtitle')}</p>
        <TimeOffForm initialBlocks={blocks || []} initialVacationDays={blockedDays || []} />
      </div>
    </div>
  );
}

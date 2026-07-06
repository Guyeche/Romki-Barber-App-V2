'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import AppointmentCard from './AppointmentCard';

interface Appointment {
  id: number;
  customer_name: string;
  service: string;
  date: string;
  time: string;
}

interface AdminDashboardProps {
  appointments: Appointment[];
}

export default function AdminDashboard({ appointments }: AdminDashboardProps) {
  const t = useTranslations('admin');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'recent'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const locale = useLocale();

  const filteredAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = appointments;

    // 1. Filter by Tab
    if (activeTab === 'upcoming') {
      filtered = appointments.filter(a => {
        const aptDate = new Date(a.date);
        // Compare date string YYYY-MM-DD
        return aptDate >= today; 
      });
      // Sort: Date ASC, Time ASC
      // appointments are already sorted by date ASC, time ASC from DB
    } else if (activeTab === 'history') {
      filtered = appointments.filter(a => {
        const aptDate = new Date(a.date);
        return aptDate < today;
      });
      // Sort: Date DESC, Time DESC
      filtered = [...filtered].reverse(); 
    } else if (activeTab === 'recent') {
      // Sort by ID DESC (newest first)
      filtered = [...appointments].sort((a, b) => b.id - a.id);
    }

    // 2. Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.customer_name.toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [appointments, activeTab, searchTerm]);

  // Next Appointment logic (from upcoming, sorted by date ASC)
  const nextAppointment = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    
    // Find first appointment that is >= now
    // appointments array is sorted by date asc, time asc.
    // We need to parse date+time to be precise.
    return appointments.find(a => {
       const aptDate = new Date(`${a.date}T${a.time}`);
       return aptDate >= now;
    });
  }, [appointments]);

  // Grouping for Upcoming view (Today, Tomorrow, Later)
  const groupedUpcoming = useMemo(() => {
      if (activeTab !== 'upcoming') return null;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const groups = {
          today: [] as Appointment[],
          tomorrow: [] as Appointment[],
          later: [] as Appointment[]
      };

      filteredAppointments.forEach(apt => {
          if (apt.date === todayStr) groups.today.push(apt);
          else if (apt.date === tomorrowStr) groups.tomorrow.push(apt);
          else groups.later.push(apt);
      });

      return groups;
  }, [filteredAppointments, activeTab]);

  return (
    <div className="space-y-6">
      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-coal border border-line p-1 rounded-lg">
          {(['upcoming', 'history', 'recent'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gold text-ink shadow-sm'
                  : 'text-smoke hover:text-cream'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
            <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-line bg-coal text-cream placeholder-smoke/60 focus:ring-1 focus:ring-gold/50 focus:border-gold outline-none transition-colors"
            />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        
        {/* Next Appointment Highlight (Only on Upcoming tab and if no search) */}
        {activeTab === 'upcoming' && !searchTerm && nextAppointment && (
            <div className="mb-8">
                <h2 className="text-sm font-bold text-gold mb-3 uppercase tracking-[0.2em]">{t('nextAppointment')}</h2>
                <div className="border-l-4 border-gold pl-4 rtl:border-l-0 rtl:border-r-4 rtl:pl-0 rtl:pr-4">
                    <AppointmentCard appointment={nextAppointment} />
                </div>
            </div>
        )}

        {/* List */}
        {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 bg-coal border border-line rounded-xl">
                <p className="text-smoke">{t('noAppointments')}</p>
            </div>
        ) : activeTab === 'upcoming' && !searchTerm ? (
            // Grouped View for Upcoming
            <>
                {groupedUpcoming?.today.length! > 0 && (
                    <section>
                        <h2 className="font-display text-lg font-bold text-cream mb-3">{t('today')}</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                            {groupedUpcoming!.today.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
                        </div>
                    </section>
                )}
                {groupedUpcoming?.tomorrow.length! > 0 && (
                    <section>
                        <h2 className="font-display text-lg font-bold text-cream mb-3">{t('tomorrow')}</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                            {groupedUpcoming!.tomorrow.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
                        </div>
                    </section>
                )}
                {groupedUpcoming?.later.length! > 0 && (
                    <section>
                        <h2 className="font-display text-lg font-bold text-cream mb-3">{t('upcoming')}</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                            {groupedUpcoming!.later.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
                        </div>
                    </section>
                )}
            </>
        ) : (
            // Flat List for History/Recent/Search
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {filteredAppointments.map(apt => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

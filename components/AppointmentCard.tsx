'use client';

import CancelButton from '../app/[locale]/admin/CancelButton';
import { useLocale } from 'next-intl';

interface AppointmentCardProps {
  appointment: {
    id: number;
    customer_name: string;
    service: string;
    date: string;
    time: string;
  };
}

export default function AppointmentCard({ appointment }: AppointmentCardProps) {
  const locale = useLocale();
  const dateObj = new Date(appointment.date);
  
  const formattedDate = dateObj.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
                {appointment.time.substring(0, 5)}
            </span>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
                {formattedDate}
            </span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          {appointment.customer_name}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {appointment.service}
        </p>
      </div>
      
      <div className="mt-2 sm:mt-0">
        <CancelButton id={appointment.id} />
      </div>
    </div>
  );
}

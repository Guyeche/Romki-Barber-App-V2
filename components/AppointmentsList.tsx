'use client';

import { useState, useEffect, useOptimistic } from 'react';
import { supabase } from '../lib/supabase';
import { cancelAppointment } from '../app/admin/actions'; 

interface Appointment {
  id: number;
  customer_name: string;
  email: string;
  service: string;
  date: string; 
  time: string;
  status: string;
  event_id: string;
}

// Helper to format date to DD/MM/YYYY
const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [optimisticAppointments, removeOptimisticAppointment] = useOptimistic(
    appointments,
    (state: Appointment[], id: number) => state.filter(appt => appt.id !== id)
  );

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching appointments:', error);
      } else {
        setAppointments(data as Appointment[]);
      }
    };

    fetchAppointments();

    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            setAppointments(current => [...current, payload.new as Appointment]);
        } else if (payload.eventType === 'DELETE') {
            setAppointments(current => current.filter(appt => appt.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleCancel = async (appointment: Appointment) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
        removeOptimisticAppointment(appointment.id);
        const formData = new FormData();
        formData.append('id', appointment.id.toString());
        await cancelAppointment(formData);
    }
  };

  return (
    <div className="bg-gray-800 text-white p-4 sm:p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Current Appointments</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Service</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {optimisticAppointments.map((appointment) => (
              <tr key={appointment.id}>
                <td className="px-4 py-4 whitespace-nowrap">{appointment.customer_name}</td>
                <td className="px-4 py-4 whitespace-nowrap">{appointment.service}</td>
                <td className="px-4 py-4 whitespace-nowrap">{formatDisplayDate(appointment.date)}</td>
                <td className="px-4 py-4 whitespace-nowrap">{appointment.time}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleCancel(appointment)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

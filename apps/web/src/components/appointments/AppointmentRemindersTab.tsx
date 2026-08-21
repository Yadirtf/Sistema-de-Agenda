'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Appointment, SchedulingConfig } from '@agendamiento/shared';
import { useReminders } from '@/hooks/useReminders';
import { RemindersSummaryBanner } from './reminders/RemindersSummaryBanner';
import { RemindersFilterBar } from './reminders/RemindersFilterBar';
import { RemindersEmptyState } from './reminders/RemindersEmptyState';
import { ReminderCard } from './reminders/ReminderCard';

type ReminderFilter = 'all' | 'pending' | 'sent';

export function AppointmentRemindersTab() {
  const [filter, setFilter] = useState<ReminderFilter>('all');
  const [search, setSearch] = useState('');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments-pending-reminders'],
    queryFn: () => apiClient.get<Appointment[]>('/appointments/pending-reminders'),
  });

  const { data: config } = useQuery({
    queryKey: ['scheduling-config'],
    queryFn: () => apiClient.get<SchedulingConfig>('/scheduling/config'),
  });

  const allItems = appointments || [];
  const pendingItems = allItems.filter((a) => !a.reminderSentAt);
  const sentItems = allItems.filter((a) => !!a.reminderSentAt);

  const { processingId, sendReminder, filterAppointments } = useReminders({
    appointments: allItems,
    config,
  });

  const filteredAppointments = filterAppointments(filter, search);

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Buscando citas próximas y notificaciones activas...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <RemindersSummaryBanner
        reminderDaysBefore={config?.reminderDaysBefore || 1}
        pendingCount={pendingItems.length}
        sentCount={sentItems.length}
      />

      <RemindersFilterBar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        counts={{ all: allItems.length, pending: pendingItems.length, sent: sentItems.length }}
      />

      {filteredAppointments.length === 0 ? (
        <RemindersEmptyState filter={filter} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredAppointments.map((appt) => (
            <ReminderCard
              key={appt.id}
              appointment={appt}
              isProcessing={processingId === appt.id}
              onSend={() => sendReminder(appt, false)}
              onResend={() => sendReminder(appt, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

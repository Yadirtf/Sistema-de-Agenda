'use client';

import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Appointment, SchedulingConfig } from '@agendamiento/shared';

type ReminderFilter = 'all' | 'pending' | 'sent';

interface UseRemindersParams {
  appointments: Appointment[];
  config?: SchedulingConfig;
}

export function useReminders({ appointments, config }: UseRemindersParams) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const markAsSentMutation = useMutation({
    mutationFn: (id: number) => {
      setProcessingId(id);
      return apiClient.patch(`/appointments/${id}/reminder-sent`);
    },
    onSuccess: () => {
      setProcessingId(null);
      queryClient.invalidateQueries({ queryKey: ['appointments-pending-reminders'] });
    },
    onError: () => {
      setProcessingId(null);
    },
  });

  const sendReminder = (appt: Appointment, isResend = false) => {
    if (!config?.businessPhone) {
      alert('Debes configurar el teléfono del negocio en Configuración Global primero.');
      return;
    }

    const phone = appt.client?.person?.phone?.replace(/\D/g, '');
    if (!phone) {
      alert('El cliente no tiene un número telefónico registrado.');
      return;
    }

    const clientName = `${appt.client?.person?.firstName || ''} ${appt.client?.person?.lastName || ''}`.trim();
    const date = new Date(appt.appointmentDate).toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const time = new Date(appt.appointmentDate).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const publicLink = `${window.location.origin}/confirm-appointment/${appt.confirmationToken}`;
    const greeting = isResend
      ? `Hola ${clientName}, te reenviamos el recordatorio de`
      : `Hola ${clientName}, te recordamos`;
    const message = `${greeting} tu cita para el día ${date} a las ${time}. Para confirmar o reagendar, ingresa aquí: ${publicLink}`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    markAsSentMutation.mutate(appt.id);
  };

  const filterAppointments = (filter: ReminderFilter, search: string) => {
    return appointments.filter((appt) => {
      const isSent = !!appt.reminderSentAt;
      if (filter === 'pending' && isSent) return false;
      if (filter === 'sent' && !isSent) return false;

      if (search.trim()) {
        const term = search.toLowerCase();
        const name = `${appt.client?.person?.firstName || ''} ${appt.client?.person?.lastName || ''}`.toLowerCase();
        const phone = (appt.client?.person?.phone || '').toLowerCase();
        const doc = (appt.client?.person?.documentNumber || '').toLowerCase();
        return name.includes(term) || phone.includes(term) || doc.includes(term);
      }
      return true;
    });
  };

  return {
    processingId,
    sendReminder,
    filterAppointments,
  };
}

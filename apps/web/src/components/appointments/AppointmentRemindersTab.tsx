'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, ExternalLink, Calendar, User, Phone, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Appointment, SchedulingConfig } from '@agendamiento/shared';
import { useState } from 'react';

export function AppointmentRemindersTab() {
  const queryClient = useQueryClient();
  const [sendingId, setSendingId] = useState<number | null>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments-pending-reminders'],
    queryFn: () => apiClient.get<Appointment[]>('/appointments/pending-reminders'),
  });

  const { data: config } = useQuery({
    queryKey: ['scheduling-config'],
    queryFn: () => apiClient.get<SchedulingConfig>('/scheduling/config'),
  });

  const markAsSentMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/appointments/${id}/reminder-sent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-pending-reminders'] });
    },
  });

  const handleSendReminder = (appt: Appointment) => {
    if (!config?.businessPhone) {
      alert('Debes configurar el teléfono del negocio en Configuración Global primero.');
      return;
    }

    const clientName = `${appt.client?.person?.firstName} ${appt.client?.person?.lastName}`;
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

    const message = `Hola ${clientName}, te recordamos tu cita para el día ${date} a las ${time}. Para confirmar o reagendar, ingresa aquí: ${publicLink}`;

    const whatsappUrl = `https://wa.me/${appt.client?.person?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    markAsSentMutation.mutate(appt.id);
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Buscando citas próximas...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
        <Bell size={20} style={{ color: 'var(--primary-600)' }} />
        <p style={{ fontSize: '0.875rem', color: 'var(--primary-700)', fontWeight: 500 }}>
          Citas agendadas para los próximos <strong>{config?.reminderDaysBefore || 1} días</strong> que aún no han sido confirmadas ni notificadas.
        </p>
      </div>

      {appointments?.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay recordatorios pendientes por enviar.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
          {appointments?.map((appt) => (
            <div key={appt.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{appt.client?.person?.firstName} {appt.client?.person?.lastName}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{appt.client?.person?.phone}</p>
                  </div>
                </div>
                <span className="badge badge-info">Agendada</span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', backgroundColor: 'var(--bg-app)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
                  <span>{new Date(appt.appointmentDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Phone size={14} style={{ color: 'var(--success-text)' }} />
                  <span>WhatsApp Pendiente</span>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => handleSendReminder(appt)}
              >
                <MessageSquare size={16} />
                <span>Notificación</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

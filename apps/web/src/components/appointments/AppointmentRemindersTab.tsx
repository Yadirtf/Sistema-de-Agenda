'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  MessageSquare,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getStatusBadgeClass } from '@/lib/appointment-utils';
import { Appointment, SchedulingConfig } from '@agendamiento/shared';

type ReminderFilter = 'all' | 'pending' | 'sent';

export function AppointmentRemindersTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReminderFilter>('all');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments-pending-reminders'],
    queryFn: () => apiClient.get<Appointment[]>('/appointments/pending-reminders'),
  });

  const { data: config } = useQuery({
    queryKey: ['scheduling-config'],
    queryFn: () => apiClient.get<SchedulingConfig>('/scheduling/config'),
  });

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

  const handleSendReminder = (appt: Appointment, isResend = false) => {
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

    const greeting = isResend ? `Hola ${clientName}, te reenviamos el recordatorio de` : `Hola ${clientName}, te recordamos`;
    const message = `${greeting} tu cita para el día ${date} a las ${time}. Para confirmar o reagendar, ingresa aquí: ${publicLink}`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    markAsSentMutation.mutate(appt.id);
  };

  const formatRelativeNotificationTime = (dateStr: string) => {
    const sentDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - sentDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 2) return 'Notificado hace un momento';
    if (diffMins < 60) return `Notificado hace ${diffMins} min`;
    if (diffHours < 24) {
      return `Notificado hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'} (${sentDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })})`;
    }
    return `Notificado el ${sentDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`;
  };

  const allItems = appointments || [];
  const pendingItems = allItems.filter((a) => !a.reminderSentAt);
  const sentItems = allItems.filter((a) => !!a.reminderSentAt);

  // Filtrado por búsqueda y subfiltro
  const filteredAppointments = allItems.filter((appt) => {
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

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Buscando citas próximas y notificaciones activas...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Banner Informativo */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--primary-50)',
          border: '1px solid var(--primary-100)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--primary-900)' }}>
              Centro de Notificaciones y Recordatorios
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--primary-700)', marginTop: '0.125rem' }}>
              Citas agendadas para los próximos <strong>{config?.reminderDaysBefore || 1} días</strong>.
              Los registros notificados permanecen visibles durante 24 horas para su seguimiento.
            </p>
          </div>
        </div>

        {/* Resumen rápido */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.5rem 0.875rem',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--warning-text)',
              }}
            />
            <span>
              <strong>{pendingItems.length}</strong> por notificar
            </span>
          </div>

          <div
            style={{
              padding: '0.5rem 0.875rem',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-text)',
              }}
            />
            <span>
              <strong>{sentItems.length}</strong> notificados (últimas 24h)
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        className="glass-card"
        style={{
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Sub-filtros por estado */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            onClick={() => setFilter('all')}
          >
            <span>Todos</span>
            <span
              style={{
                marginLeft: '0.375rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '999px',
                backgroundColor: filter === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {allItems.length}
            </span>
          </button>

          <button
            className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            onClick={() => setFilter('pending')}
          >
            <span>Pendientes</span>
            <span
              style={{
                marginLeft: '0.375rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '999px',
                backgroundColor: filter === 'pending' ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {pendingItems.length}
            </span>
          </button>

          <button
            className={`btn ${filter === 'sent' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            onClick={() => setFilter('sent')}
          >
            <span>Notificados</span>
            <span
              style={{
                marginLeft: '0.375rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '999px',
                backgroundColor: filter === 'sent' ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {sentItems.length}
            </span>
          </button>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Buscar por cliente o teléfono..."
            style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem', width: '100%' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Tarjetas */}
      {filteredAppointments.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-app)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-light)',
            }}
          >
            <CheckCircle2 size={28} />
          </div>
          <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>
            {filter === 'pending'
              ? '¡Excelente! No hay recordatorios pendientes por enviar.'
              : filter === 'sent'
              ? 'No hay citas notificadas en las últimas 24 horas.'
              : 'No se encontraron citas próximas con los filtros actuales.'}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
            Las citas programadas dentro de los días de recordatorio aparecerán aquí automáticamente.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredAppointments.map((appt) => {
            const isSent = !!appt.reminderSentAt;
            const person = appt.client?.person;
            const apptDate = new Date(appt.appointmentDate);
            const isProcessing = processingId === appt.id;

            return (
              <div
                key={appt.id}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  border: isSent
                    ? '1px solid var(--border-subtle)'
                    : '1px solid var(--primary-200)',
                  backgroundColor: isSent ? 'rgba(255, 255, 255, 0.75)' : 'white',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Indicador de estado superior */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: isSent ? 'var(--bg-app)' : 'var(--primary-50)',
                        color: isSent ? 'var(--text-muted)' : 'var(--primary-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        flexShrink: 0,
                      }}
                    >
                      {person?.firstName?.[0]?.toUpperCase() || <User size={20} />}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {person?.firstName} {person?.lastName}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {person?.documentNumber ? `C.C. ${person.documentNumber} • ` : ''}
                        {person?.phone || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>

                  <span className={`badge ${getStatusBadgeClass(appt.status?.name)}`} style={{ flexShrink: 0 }}>
                    {appt.status?.name || 'Agendada'}
                  </span>
                </div>

                {/* Detalles de la cita y estado del WhatsApp */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    backgroundColor: 'var(--bg-app)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
                      <span style={{ fontWeight: 600 }}>
                        {apptDate.toLocaleDateString('es-CO', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} />
                      <span>
                        {apptDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />

                  {/* Estado de Notificación */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    {isSent ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          color: 'var(--success-text)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>{formatRelativeNotificationTime(appt.reminderSentAt!)}</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          color: 'var(--warning-text)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        <Phone size={14} />
                        <span>Pendiente de notificar</span>
                      </div>
                    )}

                    <span
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-light)',
                        fontStyle: 'italic',
                      }}
                    >
                      {isSent ? 'Visible 24h' : 'Próxima cita'}
                    </span>
                  </div>
                </div>

                {/* Acciones de Notificación */}
                {isSent ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 'auto' }}>
                    <div
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--success-bg)',
                        color: 'var(--success-text)',
                        border: '1px solid var(--success-border)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Notificado</span>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                      }}
                      onClick={() => handleSendReminder(appt, true)}
                      disabled={isProcessing}
                      title="Reenviar mensaje de WhatsApp al cliente"
                    >
                      <RotateCcw size={14} />
                      <span>Reenviar</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      marginTop: 'auto',
                      justifyContent: 'center',
                      backgroundColor: '#25D366',
                      borderColor: '#25D366',
                      color: '#ffffff',
                    }}
                    onClick={() => handleSendReminder(appt, false)}
                    disabled={isProcessing}
                  >
                    <MessageSquare size={16} />
                    <span>{isProcessing ? 'Procesando...' : 'Notificar por WhatsApp'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

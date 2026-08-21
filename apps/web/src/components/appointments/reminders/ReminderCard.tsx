'use client';

import {
  User,
  Calendar,
  Clock,
  CheckCircle2,
  Phone,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { getStatusBadgeClass } from '@/lib/appointment-utils';
import { formatRelativeNotificationTime } from '@/lib/reminder-utils';
import { Appointment } from '@agendamiento/shared';

interface ReminderCardProps {
  appointment: Appointment;
  isProcessing: boolean;
  onSend: () => void;
  onResend: () => void;
}

export function ReminderCard({
  appointment: appt,
  isProcessing,
  onSend,
  onResend,
}: ReminderCardProps) {
  const isSent = !!appt.reminderSentAt;
  const person = appt.client?.person;
  const apptDate = new Date(appt.appointmentDate);

  return (
    <div
      className="glass-card"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        border: isSent ? '1px solid var(--border-subtle)' : '1px solid var(--primary-200)',
        backgroundColor: isSent ? 'rgba(255, 255, 255, 0.75)' : 'white',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Cabecera: avatar + nombre + badge de estado de cita */}
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

      {/* Detalle de fecha/hora + estado de notificación */}
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
              {apptDate.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)' }}>
            <Clock size={13} />
            <span>{apptDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          {isSent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--success-text)', fontWeight: 600, fontSize: '0.75rem' }}>
              <CheckCircle2 size={14} />
              <span>{formatRelativeNotificationTime(appt.reminderSentAt!)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--warning-text)', fontWeight: 600, fontSize: '0.75rem' }}>
              <Phone size={14} />
              <span>Pendiente de notificar</span>
            </div>
          )}
          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
            {isSent ? 'Visible 24h' : 'Próxima cita'}
          </span>
        </div>
      </div>

      {/* Acciones */}
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
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}
            onClick={onResend}
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
          onClick={onSend}
          disabled={isProcessing}
        >
          <MessageSquare size={16} />
          <span>{isProcessing ? 'Procesando...' : 'Notificar por WhatsApp'}</span>
        </button>
      )}
    </div>
  );
}

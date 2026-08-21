'use client';

import { CheckCircle2 } from 'lucide-react';

type ReminderFilter = 'all' | 'pending' | 'sent';

const EMPTY_MESSAGES: Record<ReminderFilter, string> = {
  pending: '¡Excelente! No hay recordatorios pendientes por enviar.',
  sent: 'No hay citas notificadas en las últimas 24 horas.',
  all: 'No se encontraron citas próximas con los filtros actuales.',
};

interface RemindersEmptyStateProps {
  filter: ReminderFilter;
}

export function RemindersEmptyState({ filter }: RemindersEmptyStateProps) {
  return (
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
        {EMPTY_MESSAGES[filter]}
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
        Las citas programadas dentro de los días de recordatorio aparecerán aquí automáticamente.
      </p>
    </div>
  );
}

'use client';

import { Bell } from 'lucide-react';

interface RemindersSummaryBannerProps {
  reminderDaysBefore: number;
  pendingCount: number;
  sentCount: number;
}

export function RemindersSummaryBanner({
  reminderDaysBefore,
  pendingCount,
  sentCount,
}: RemindersSummaryBannerProps) {
  return (
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
      {/* Título e información */}
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
            Citas agendadas para los próximos <strong>{reminderDaysBefore} días</strong>.
            Los registros notificados permanecen visibles durante 24 horas para su seguimiento.
          </p>
        </div>
      </div>

      {/* Contadores de resumen */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <SummaryPill color="var(--warning-text)" count={pendingCount} label="por notificar" />
        <SummaryPill color="var(--success-text)" count={sentCount} label="notificados (últimas 24h)" />
      </div>
    </div>
  );
}

function SummaryPill({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
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
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
      <span>
        <strong>{count}</strong> {label}
      </span>
    </div>
  );
}

'use client';

import { Sparkles, Calendar, Clock, Check } from 'lucide-react';
import { NextAppointmentSuggestion } from '@agendamiento/shared';

interface AppointmentSuggestionBannerProps {
  suggestion: NextAppointmentSuggestion;
}

export function AppointmentSuggestionBanner({
  suggestion,
}: AppointmentSuggestionBannerProps) {
  const suggestedDateObj = new Date(suggestion.suggestedDate);

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--primary-50)',
        border: '1px solid var(--primary-500)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} style={{ color: 'var(--primary-600)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary-700)' }}>
            Sugerencia Inteligente (Semana {suggestion.entryWeek})
          </span>
        </div>

        {suggestion.interval && (
          <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
            {suggestion.interval.name} ({suggestion.interval.days} días)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 600 }}>
        <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
        <span>
          {suggestedDateObj.toLocaleDateString('es-CO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      {suggestion.weekStartDate && suggestion.weekEndDate && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Rango sugerido para su semana de ingreso: <strong>{suggestion.weekStartDate}</strong> al <strong>{suggestion.weekEndDate}</strong>
        </p>
      )}

      {/* Explicación de ajustes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
        {suggestion.isClientOverride && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Check size={12} style={{ color: 'var(--primary-600)' }} />
            <span>Frecuencia personalizada del cliente</span>
          </div>
        )}
        {suggestion.adjustedForEntryWeek && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Check size={12} style={{ color: 'var(--primary-600)' }} />
            <span>Alineado con su semana de ingreso recurrente</span>
          </div>
        )}
        {suggestion.adjustedForWorkingDay && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Check size={12} style={{ color: 'var(--primary-600)' }} />
            <span>Ajustado al día laboral hábil más cercano</span>
          </div>
        )}
      </div>
    </div>
  );
}

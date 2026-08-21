'use client';

import { Clock, Check, AlertTriangle, Lock } from 'lucide-react';
import { DaySlot } from '@agendamiento/shared';

interface TimeSlotsGridProps {
  selectedDate: string; // YYYY-MM-DD
  slots: DaySlot[];
  selectedTime: string; // "HH:MM"
  onSelectTime: (time: string) => void;
  isLoading?: boolean;
  isWorkingDay?: boolean;
}

export function TimeSlotsGrid({
  selectedDate,
  slots,
  selectedTime,
  onSelectTime,
  isLoading = false,
  isWorkingDay = true,
}: TimeSlotsGridProps) {
  const formattedDate = (() => {
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return selectedDate;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  })();

  const availableCount = slots.filter((s) => s.available).length;
  const occupiedCount = slots.filter((s) => !s.available).length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: 'var(--bg-app)',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        minHeight: '280px',
      }}
    >
      {/* Cabecera del Grid de Horarios */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} style={{ color: 'var(--primary-600)' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'capitalize' }}>
            {formattedDate}
          </span>
        </div>

        {!isLoading && slots.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
              {availableCount} libres
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--danger-text)', fontWeight: 600 }}>
              {occupiedCount} ocupados
            </span>
          </div>
        )}
      </div>

      {/* Aviso de Día No Laboral */}
      {!isWorkingDay && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--warning-bg)',
            color: 'var(--warning-text)',
            border: '1px solid var(--warning-border)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Día no laboral</strong> en la configuración general. Puedes agendar para casos excepcionales.
          </span>
        </div>
      )}

      {/* Estado de Carga */}
      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            gap: '0.5rem',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid var(--primary-200)',
              borderTopColor: 'var(--primary-600)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Verificando disponibilidad de horarios...</span>
        </div>
      ) : slots.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem',
            textAlign: 'center',
          }}
        >
          No hay horarios configurados para este día.
        </div>
      ) : (
        /* Cuadrícula de Slots Horarios */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
            gap: '0.5rem',
            maxHeight: '260px',
            overflowY: 'auto',
            paddingRight: '0.25rem',
          }}
        >
          {slots.map((slot) => {
            const isSelected = slot.time === selectedTime;
            const isAvailable = slot.available;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelectTime(slot.time)}
                style={{
                  padding: '0.5rem 0.25rem',
                  borderRadius: 'var(--radius-sm)',
                  border: isSelected
                    ? '2px solid var(--primary-600)'
                    : isAvailable
                    ? '1px solid var(--border-subtle)'
                    : '1px solid var(--danger-border)',
                  backgroundColor: isSelected
                    ? 'var(--primary-600)'
                    : isAvailable
                    ? 'white'
                    : 'var(--danger-bg)',
                  color: isSelected
                    ? '#ffffff'
                    : isAvailable
                    ? 'var(--text-main)'
                    : 'var(--danger-text)',
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                  opacity: isAvailable ? 1 : 0.65,
                }}
                title={
                  !isAvailable
                    ? `${slot.time} — Horario Ocupado`
                    : `${slot.time} — Horario Disponible`
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: isSelected ? 800 : 600 }}>
                    {slot.time}
                  </span>
                  {isSelected && <Check size={12} />}
                </div>

                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: isSelected
                      ? 'rgba(255,255,255,0.9)'
                      : isAvailable
                      ? 'var(--success-text)'
                      : 'var(--danger-text)',
                  }}
                >
                  {isAvailable ? 'Libre' : 'Ocupado'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

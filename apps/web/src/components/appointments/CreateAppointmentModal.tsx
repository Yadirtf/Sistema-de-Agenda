'use client';

import { X, Save, AlertCircle, UserCheck } from 'lucide-react';
import { useCreateAppointmentForm } from '@/hooks/useCreateAppointmentForm';
import { AppointmentSuggestionBanner } from './AppointmentSuggestionBanner';
import { AppointmentCalendar } from './calendar/AppointmentCalendar';
import { TimeSlotsGrid } from './calendar/TimeSlotsGrid';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: number | null;
  previousAppointmentId?: number | null;
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  clientId: initialClientId,
  previousAppointmentId,
}: CreateAppointmentModalProps) {
  const {
    selectedClientId,
    setSelectedClientId,
    selectedProfessionalId,
    setSelectedProfessionalId,
    professionals,
    isLoadingProfessionals,
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    notes,
    setNotes,
    slots,
    isWorkingDay,
    workingDays,
    isLoadingSlots,
    loading,
    error,
    suggestion,
    clients,
    submitAppointment,
    resetForm,
  } = useCreateAppointmentForm({
    isOpen,
    initialClientId,
    previousAppointmentId,
    onSuccess: onClose,
  });

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Programar / Reagendar Cita</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Selecciona el profesional, fecha y horario disponible en el calendario interactivo
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form
          onSubmit={submitAppointment}
          style={{
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger-text)',
                border: '1px solid var(--danger-border)',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Fila Superior: Selector de Cliente y Selector de Profesional */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: !initialClientId ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
              gap: '1rem',
            }}
          >
            {/* Selector de Cliente si no viene preseleccionado */}
            {!initialClientId && (
              <div className="form-group">
                <label className="form-label">Seleccionar Cliente *</label>
                <select
                  className="input"
                  value={selectedClientId ?? ''}
                  onChange={(e) => setSelectedClientId(Number(e.target.value))}
                  required
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.person?.firstName} {c.person?.lastName} ({c.person?.documentNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Profesional */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <UserCheck size={14} style={{ color: 'var(--primary-600)' }} />
                <span>Asignar Profesional (Opcional / Disponibilidad)</span>
              </label>
              <select
                className="input"
                value={selectedProfessionalId ?? ''}
                onChange={(e) =>
                  setSelectedProfessionalId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">-- Cualquier Profesional Disponible --</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.roleName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Banner de Sugerencia Inteligente */}
          {suggestion && <AppointmentSuggestionBanner suggestion={suggestion} />}

          {/* Sección de Calendario y Horarios Disponibles */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
              Seleccionar Fecha y Horario Disponible *
            </label>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {/* Calendario Mensual */}
              <AppointmentCalendar
                selectedDate={appointmentDate}
                onSelectDate={(newDate) => setAppointmentDate(newDate)}
                workingDays={workingDays}
                suggestion={suggestion}
              />

              {/* Grid de Horarios del Día */}
              <TimeSlotsGrid
                selectedDate={appointmentDate}
                slots={slots}
                selectedTime={appointmentTime}
                onSelectTime={(time) => setAppointmentTime(time)}
                isLoading={isLoadingSlots}
                isWorkingDay={isWorkingDay}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="form-group">
            <label className="form-label">Notas Adicionales</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Observaciones de la cita..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Botones de Acción */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {appointmentDate && appointmentTime ? (
                <span>
                  Horario seleccionado: <strong style={{ color: 'var(--primary-600)' }}>{appointmentDate} a las {appointmentTime}</strong>
                </span>
              ) : (
                <span>Por favor selecciona un horario en la cuadrícula</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={handleClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !appointmentDate || !appointmentTime}
              >
                <Save size={18} />
                <span>{loading ? 'Guardando...' : 'Guardar Cita'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { X, Save, AlertCircle } from 'lucide-react';
import { useCreateAppointmentForm } from '@/hooks/useCreateAppointmentForm';
import { AppointmentSuggestionBanner } from './AppointmentSuggestionBanner';

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
    appointmentDate,
    setAppointmentDate,
    appointmentTime,
    setAppointmentTime,
    notes,
    setNotes,
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reagendar / Nueva Cita</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Completa los detalles para programar el próximo encuentro
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={submitAppointment}
          style={{
            overflowY: 'auto',
            padding: '1.5rem',
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

          {/* Selector de Cliente si no viene prefijado */}
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

          {/* Banner de Sugerencia Inteligente */}
          {suggestion && <AppointmentSuggestionBanner suggestion={suggestion} />}

          {/* Campos de Fecha y Hora */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <div className="form-group">
              <label className="form-label">Fecha de la Cita *</label>
              <input
                type="date"
                className="input"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora *</label>
              <input
                type="time"
                className="input"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="form-group">
            <label className="form-label">Notas Adicionales</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Observaciones de la cita..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Botones de Acción */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
            }}
          >
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Agendando...' : 'Guardar Cita'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { X } from 'lucide-react';
import { AppointmentBookingForm } from './booking/AppointmentBookingForm';

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
  if (!isOpen) return null;

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
          maxWidth: '860px',
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
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll que renderiza el formulario modular */}
        <div
          style={{
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
          }}
        >
          <AppointmentBookingForm
            initialClientId={initialClientId}
            previousAppointmentId={previousAppointmentId}
            onSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

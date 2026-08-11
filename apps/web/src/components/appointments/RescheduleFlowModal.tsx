'use client';

import { useState } from 'react';
import { X, Calendar, MessageSquare, ArrowRight, RefreshCw } from 'lucide-react';
import { Appointment, CatalogItem } from '@agendamiento/shared';
import { CreateAppointmentModal } from './CreateAppointmentModal';

interface RescheduleFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  newStatus: CatalogItem | null;
}

export function RescheduleFlowModal({
  isOpen,
  onClose,
  appointment,
  newStatus,
}: RescheduleFlowModalProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!isOpen || !appointment || !newStatus) return null;

  const person = appointment.client?.person;
  const statusName = newStatus.name;

  const generateWhatsAppLink = () => {
    if (!person?.phone) return '#';

    let message = '';
    const clientName = `${person.firstName}`;

    if (statusName === 'Completada') {
      message = `Hola ${clientName}, ¡fue un gusto atenderte hoy! Tu cita ha sido marcada como completada. ¿Te gustaría agendar la próxima de una vez?`;
    } else if (statusName === 'Cancelada') {
      message = `Hola ${clientName}, confirmamos la cancelación de tu cita. Si deseas reprogramar, por favor avísanos para buscarte un nuevo espacio.`;
    } else if (statusName === 'No Asistió') {
      message = `Hola ${clientName}, notamos que no pudiste asistir a tu cita de hoy. ¿Te gustaría que busquemos una nueva fecha para reagendar?`;
    } else {
      message = `Hola ${clientName}, te escribimos sobre tu cita programada.`;
    }

    return `https://wa.me/${person.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const isFinalStatus = ['Completada', 'Cancelada', 'No Asistió'].includes(statusName);

  if (!isFinalStatus) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 250,
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
            maxWidth: '480px',
            padding: '2rem',
            boxShadow: 'var(--shadow-glow)',
            position: 'relative',
            textAlign: 'center'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}
          >
            <RefreshCw size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {statusName === 'Completada' ? '¡Excelente trabajo!' : 'Cita Finalizada'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            El estado se actualizó a <strong>{statusName}</strong>.
            ¿Deseas realizar alguna acción adicional para este cliente?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              style={{ justifyContent: 'center', padding: '0.75rem' }}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Calendar size={18} />
              <span>Reagendar Cita Ahora</span>
              <ArrowRight size={16} />
            </button>

            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                justifyContent: 'center',
                padding: '0.75rem',
                backgroundColor: '#25D366',
                color: '#ffffff',
                border: 'none'
              }}
              onClick={onClose}
            >
              <MessageSquare size={18} />
              <span>Notificar por WhatsApp</span>
            </a>

            <button className="btn btn-ghost" onClick={onClose} style={{ marginTop: '0.5rem' }}>
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>

      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          onClose();
        }}
        clientId={appointment.clientId}
        previousAppointmentId={appointment.id}
      />
    </>
  );
}

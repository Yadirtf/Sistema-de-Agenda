'use client';

import { useQuery } from '@tanstack/react-query';
import { X, Calendar, Clock, User, Phone, FileText, History, ClipboardList } from 'lucide-react';
import { Appointment, FollowUp, PaginatedResponse } from '@agendamiento/shared';
import { apiClient } from '@/lib/api-client';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
}: AppointmentDetailsModalProps) {
  // Fetch follow-ups for this appointment/client
  const { data: followUpsData, isLoading } = useQuery({
    queryKey: ['follow-ups', appointment?.id],
    queryFn: () =>
      apiClient.get<PaginatedResponse<FollowUp>>(
        `/follow-ups?clientId=${appointment?.clientId}&perPage=50`
      ),
    enabled: !!appointment && isOpen,
  });

  if (!isOpen || !appointment) return null;

  const followUps = followUpsData?.data || [];
  const person = appointment.client?.person;
  const date = new Date(appointment.appointmentDate);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800 }}>
                {person?.firstName} {person?.lastName}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Detalles de la Cita #{appointment.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-app)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <Calendar size={14} />
                <span>Fecha</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {date.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="glass-card" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-app)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <Clock size={14} />
                <span>Hora</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="glass-card" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-app)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <Phone size={14} />
                <span>Teléfono</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{person?.phone || 'N/A'}</p>
            </div>

            <div className="glass-card" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-app)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                <ClipboardList size={14} />
                <span>Estado Actual</span>
              </div>
              <span className={`badge ${appointment.status?.name === 'Completada' ? 'badge-success' : 'badge-info'}`}>
                {appointment.status?.name}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} />
              Nota de la Cita
            </h3>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
              {appointment.notes || 'Sin notas adicionales para esta cita.'}
            </div>
          </div>

          {/* Timeline / Bitácora */}
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={16} />
              Bitácora de Seguimiento
            </h3>

            {isLoading ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>Cargando bitácora...</p>
            ) : followUps.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay registros en la bitácora aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid var(--border-subtle)', marginLeft: '0.5rem', paddingLeft: '1.5rem' }}>
                {followUps.map((fu) => (
                  <div key={fu.id} style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-1.85rem',
                        top: '0.25rem',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-500)',
                        border: '2px solid var(--bg-card)',
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>
                      {new Date(fu.createdAt).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <span style={{ margin: '0 0.5rem' }}>•</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{fu.type?.name}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{fu.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { User, Calendar, Clock, RefreshCw, Plus, ChevronDown, MessageCircle } from 'lucide-react';
import { getStatusBadgeClass } from '@/lib/appointment-utils';
import { Client, CatalogItem, Appointment } from '@agendamiento/shared';

interface GeneralClientRowProps {
  client: Client;
  statuses?: CatalogItem[];
  onRebook: (client: Client) => void;
  onStatusChange?: (appt: Appointment, status: CatalogItem) => void;
}

export function GeneralClientRow({
  client,
  statuses,
  onRebook,
  onStatusChange,
}: GeneralClientRowProps) {
  const person = client.person;
  const latestAppt = client.latestAppointment;
  const statusName = latestAppt?.status?.name;
  const date = latestAppt ? new Date(latestAppt.appointmentDate) : null;
  const interval = client.schedulingConfig?.interval?.name || 'Global (Defecto)';

  const canAction = (name: string | undefined) => {
    if (!name) return true; // No tiene cita aún -> "Agendar"
    return ['Sin agendar', 'Completada', 'Cancelada', 'No Asistió'].includes(name);
  };

  const isEligibleForDirectAction = canAction(statusName);

  return (
    <tr
      key={client.id}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
      className="hover-bg-subtle"
    >
      {/* Información del Cliente */}
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {person?.firstName?.[0]?.toUpperCase() || <User size={18} />}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
              {person?.firstName} {person?.lastName}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              C.C. {person?.documentNumber}
            </p>
          </div>
        </div>
      </td>

      {/* Estado y Fecha de Última Cita */}
      <td style={{ padding: '1rem' }}>
        {latestAppt ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500 }}>
              <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
              <span>
                {date?.toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <span
              className={`badge ${getStatusBadgeClass(statusName)}`}
              style={{ width: 'fit-content', fontSize: '0.7rem' }}
            >
              {statusName}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Sin citas registradas
          </span>
        )}
      </td>

      {/* Frecuencia de Agendamiento */}
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span>{interval}</span>
        </div>
      </td>

      {/* Acciones */}
      <td style={{ padding: '1rem', textAlign: 'right' }}>
        {isEligibleForDirectAction ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onRebook(client)}
              style={{ padding: '0.4rem 0.75rem', gap: '0.375rem' }}
            >
              {latestAppt ? (
                <>
                  <RefreshCw size={14} />
                  <span>Reagendar</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Agendar</span>
                </>
              )}
            </button>
            {person?.phone && (
              <a
                href={`https://wa.me/${person.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(person.firstName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.4rem', color: '#25D366', minWidth: 'auto' }}
                title="Enviar WhatsApp"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                className="input"
                style={{
                  padding: '0.375rem 2rem 0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  appearance: 'none',
                  minWidth: '140px',
                }}
                value=""
                onChange={(e) => {
                  const statusId = e.target.value;
                  if (!statusId || !latestAppt) return;
                  const selectedStatus = statuses?.find((s) => s.id.toString() === statusId);
                  if (selectedStatus && onStatusChange) {
                    onStatusChange(latestAppt, selectedStatus);
                  }
                }}
              >
                <option value="" disabled>Cambiar Estado</option>
                {statuses?.filter((s) => s.id !== latestAppt?.statusId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onRebook(client)}
              title="Reagendar/Nueva Cita"
              style={{ padding: '0.4rem', minWidth: 'auto' }}
            >
              <RefreshCw size={14} />
            </button>
            {person?.phone && (
              <a
                href={`https://wa.me/${person.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(person.firstName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.4rem', color: '#25D366', minWidth: 'auto' }}
                title="Enviar WhatsApp"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

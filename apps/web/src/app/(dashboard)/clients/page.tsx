'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  ChevronRight,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Client, Appointment, PaginatedResponse } from '@agendamiento/shared';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedApptForDetails, setSelectedApptForDetails] = useState<Appointment | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), perPage: '10' });
      if (search) params.append('search', search);
      return apiClient.get<PaginatedResponse<Client>>(`/clients?${params.toString()}`);
    },
  });

  const clients = data?.data || [];
  const meta = data?.meta;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Gestión de Clientes
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Listado completo y configuración de agendamiento individual
          </p>
        </div>

        <Link href="/clients/new" className="btn btn-primary">
          <Plus size={18} />
          <span>Nuevo Cliente</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.875rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-light)',
            }}
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Buscar por nombre, documento, teléfono o correo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando clientes...
          </div>
        ) : isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>
            Error al cargar el listado de clientes.
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron clientes registrados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-app)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '1rem' }}>Cliente / Persona</th>
                  <th style={{ padding: '1rem' }}>Documento</th>
                  <th style={{ padding: '1rem' }}>Contacto</th>
                  <th style={{ padding: '1rem' }}>Cita / Estado</th>
                  <th style={{ padding: '1rem' }}>Frecuencia</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const person = client.person;
                  const interval = client.schedulingConfig?.interval;
                  const latestAppt = client.latestAppointment;

                  return (
                    <tr
                      key={client.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                        cursor: latestAppt ? 'pointer' : 'default',
                      }}
                      className={latestAppt ? 'hover-bg-subtle' : ''}
                      onClick={() => {
                        if (latestAppt) {
                          setSelectedApptForDetails(latestAppt);
                        }
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
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
                            {person?.firstName?.[0] || 'C'}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                              {person?.firstName} {person?.lastName}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ID: {client.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <p style={{ fontWeight: 500 }}>{person?.documentNumber}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {person?.documentType?.name}
                        </p>
                      </td>

                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        {person?.phone && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              color: 'var(--text-main)',
                            }}
                          >
                            <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>{person.phone}</span>
                          </div>
                        )}
                        {person?.email && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              marginTop: '0.125rem',
                            }}
                          >
                            <Mail size={14} />
                            <span>{person.email}</span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        {latestAppt ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span
                              className={`badge ${
                                latestAppt.status?.name === 'Completada'
                                  ? 'badge-success'
                                  : ['Cancelada', 'No Asistió'].includes(latestAppt.status?.name || '')
                                  ? 'badge-danger'
                                  : latestAppt.status?.name === 'Agendada'
                                  ? 'badge-info'
                                  : 'badge-warning'
                              }`}
                              style={{ width: 'fit-content' }}
                            >
                              {latestAppt.status?.name}
                            </span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(latestAppt.appointmentDate).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                        ) : (
                          <span className="badge badge-ghost" style={{ color: 'var(--text-light)', border: '1px dashed var(--border-medium)' }}>
                            Sin agendar
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem' }}>
                        {interval ? (
                          <span className="badge badge-info">
                            <Clock size={12} />
                            <span>
                              {interval.name}
                            </span>
                          </span>
                        ) : (
                          <span
                            style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}
                          >
                            Global
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/clients/${client.id}`}
                          className="btn btn-ghost"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                        >
                          <span>Perfil</span>
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              Página {meta.page} de {meta.totalPages} ({meta.total} clientes)
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                disabled={meta.page <= 1}
                onClick={() => setPage(page - 1)}
                style={{ padding: '0.375rem 0.75rem' }}
              >
                Anterior
              </button>
              <button
                className="btn btn-secondary"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                style={{ padding: '0.375rem 0.75rem' }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <AppointmentDetailsModal
        isOpen={!!selectedApptForDetails}
        onClose={() => setSelectedApptForDetails(null)}
        appointment={selectedApptForDetails}
      />
    </div>
  );
}

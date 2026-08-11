'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Calendar, User, Clock, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Client, CatalogItem, PaginatedResponse } from '@agendamiento/shared';

interface GeneralClientsTabProps {
  onRebook: (client: Client) => void;
}

export function GeneralClientsTab({ onRebook }: GeneralClientsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // Fetch clients with their latest appointment
  const { data, isLoading } = useQuery({
    queryKey: ['clients-general', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '10',
        search: search
      });
      if (statusFilter) params.append('statusId', statusFilter);

      return apiClient.get<PaginatedResponse<Client>>(`/clients?${params.toString()}`);
    },
  });

  // Fetch appointment statuses for the filter
  const { data: statuses } = useQuery({
    queryKey: ['catalogs', 'appointment-statuses'],
    queryFn: () => apiClient.get<CatalogItem[]>('/catalogs/appointment-statuses'),
  });

  const clients = data?.data || [];
  const meta = data?.meta;

  const canAction = (statusName: string | undefined) => {
    if (!statusName) return true; // No appointment yet -> "Agendar"
    return ['Sin agendar', 'Completada', 'Cancelada', 'No Asistió'].includes(statusName);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Buscar cliente por nombre o cédula..."
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)', margin: '0 0.5rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <Filter size={16} />
            <span>Estado última cita:</span>
          </div>

          <select
            className="input"
            style={{ width: 'auto', minWidth: '180px', fontSize: '0.875rem' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {statuses?.map((st) => (
              <option key={st.id} value={st.id.toString()}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clients Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando información de clientes...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron clientes con los filtros seleccionados.
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
                  }}
                >
                  <th style={{ padding: '1rem' }}>Cliente</th>
                  <th style={{ padding: '1rem' }}>Última Cita</th>
                  <th style={{ padding: '1rem' }}>Frecuencia</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const person = client.person;
                  const latestAppt = client.latestAppointment;
                  const statusName = latestAppt?.status?.name;
                  const date = latestAppt ? new Date(latestAppt.appointmentDate) : null;
                  const interval = client.schedulingConfig?.interval?.name || 'Global (Defecto)';

                  return (
                    <tr
                      key={client.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      className="hover-bg-subtle"
                    >
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
                            <User size={18} />
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

                      <td style={{ padding: '1rem' }}>
                        {latestAppt ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500 }}>
                              <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
                              <span>
                                {date?.toLocaleDateString('es-CO', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <span
                              className={`badge ${
                                statusName === 'Completada'
                                  ? 'badge-success'
                                  : ['Cancelada', 'No Asistió'].includes(statusName || '')
                                  ? 'badge-danger'
                                  : 'badge-warning'
                              }`}
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

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          <Clock size={14} />
                          <span>{interval}</span>
                        </div>
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        {canAction(statusName) ? (
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
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', color: 'var(--success-text)', fontSize: '0.75rem', fontWeight: 600 }}>
                            <Clock size={14} />
                            <span>Cita en curso/prog.</span>
                          </div>
                        )}
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
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem' }}>
              Página {page} de {meta.totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <AlertCircle size={20} style={{ color: 'var(--primary-500)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Panel de Control General</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Esta vista muestra todos los clientes registrados y el estado de su última interacción.
            El botón <strong>Agendar</strong> aparece para clientes nuevos sin historial, mientras que <strong>Reagendar</strong> se habilita para clientes que han finalizado su ciclo actual (Completada, Cancelada, No Asistió o Sin Agendar), permitiendo programar la siguiente visita basada en su frecuencia preferida.
          </p>
        </div>
      </div>
    </div>
  );
}

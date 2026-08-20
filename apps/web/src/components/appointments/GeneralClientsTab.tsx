'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Client, CatalogItem, PaginatedResponse, Appointment } from '@agendamiento/shared';
import { GeneralClientsFilterBar } from './general/GeneralClientsFilterBar';
import { GeneralClientRow } from './general/GeneralClientRow';

interface GeneralClientsTabProps {
  onRebook: (client: Client) => void;
  onStatusChange?: (appt: Appointment, status: CatalogItem) => void;
}

export function GeneralClientsTab({ onRebook, onStatusChange }: GeneralClientsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // Consulta de clientes con su última cita
  const { data, isLoading } = useQuery({
    queryKey: ['clients', 'general', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '10',
        search: search,
      });
      if (statusFilter) params.append('statusId', statusFilter);

      return apiClient.get<PaginatedResponse<Client>>(`/clients?${params.toString()}`);
    },
  });

  // Consulta de catálogo de estados de cita para los filtros
  const { data: statuses } = useQuery({
    queryKey: ['catalogs', 'appointment-statuses'],
    queryFn: () => apiClient.get<CatalogItem[]>('/catalogs/appointment-statuses'),
  });

  const clients = data?.data || [];
  const meta = data?.meta;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Barra de Filtros y Búsqueda */}
      <GeneralClientsFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        statuses={statuses}
      />

      {/* Tabla de Clientes */}
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
                {clients.map((client) => (
                  <GeneralClientRow
                    key={client.id}
                    client={client}
                    statuses={statuses}
                    onRebook={onRebook}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
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

      {/* Banner Informativo */}
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

'use client';

import { Search, Filter } from 'lucide-react';
import { CatalogItem } from '@agendamiento/shared';

interface GeneralClientsFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  statuses?: CatalogItem[];
}

export function GeneralClientsFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statuses,
}: GeneralClientsFilterBarProps) {
  return (
    <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Campo de Búsqueda */}
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
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)', margin: '0 0.5rem' }} />

        {/* Filtro por Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <Filter size={16} />
          <span>Estado última cita:</span>
        </div>

        <select
          className="input"
          style={{ width: 'auto', minWidth: '180px', fontSize: '0.875rem' }}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
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
  );
}

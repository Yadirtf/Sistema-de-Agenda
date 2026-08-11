'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Calendar, Filter, User } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { YearlyHistoryResponse } from '@agendamiento/shared';

export function YearlyHistoryGrid() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');

  const { data: history, isLoading } = useQuery({
    queryKey: ['appointments-yearly-history', year, search],
    queryFn: async () => {
      const params = new URLSearchParams({ year: year.toString() });
      if (search) params.append('search', search);
      const res = await apiClient.get<YearlyHistoryResponse>(`/appointments/yearly-history?${params.toString()}`);
      console.log('Yearly History Data:', res);
      return res;
    },
  });

  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Completada': return 'var(--success-text)';
      case 'Cancelada': return 'var(--danger-text)';
      case 'No Asistió': return 'var(--warning-text)';
      default: return 'transparent';
    }
  };

  const filteredData = history?.data.filter(item => {
    if (monthFilter === '') return true;
    return item.months[monthFilter] !== null;
  }) || [];

  const monthIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters & Navigation */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-app)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setYear(year - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', minWidth: '60px', textAlign: 'center' }}>{year}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setYear(year + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre o cédula..."
              style={{ paddingLeft: '2.5rem', width: '300px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <Filter size={16} />
            <span>Filtrar por Mes:</span>
          </div>
          <select
            className="input"
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los meses</option>
            {months.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem', width: '250px' }}>Cliente / Cédula</th>
                {months.map((m) => (
                  <th key={m} style={{ padding: '1rem', textAlign: 'center' }}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={13} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando historial...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={13} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros para los filtros aplicados.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.clientId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.clientName}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.documentNumber}</p>
                    </td>
                    {monthIndices.map((monthNum) => {
                      const monthData = item.months[monthNum];
                      return (
                        <td key={monthNum} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          {monthData ? (
                            <div
                              title={`${monthData.status} - ${new Date(monthData.date).toLocaleDateString()}`}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                backgroundColor: getStatusColor(monthData.status),
                                margin: '0 auto',
                                cursor: 'help',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
                            </div>
                          ) : (
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: 'var(--bg-app)', border: '1px dashed var(--border-subtle)', margin: '0 auto' }} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', padding: '1rem', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)' }}>
        {[
          { label: 'Completada', color: 'var(--success-text)', description: 'Cita finalizada con éxito' },
          { label: 'Cancelada', color: 'var(--danger-text)', description: 'Cita anulada por el cliente o admin' },
          { label: 'No Asistió', color: 'var(--warning-text)', description: 'El cliente no se presentó' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: l.color, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>{l.label}</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{l.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

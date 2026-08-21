'use client';

import { Search } from 'lucide-react';

type ReminderFilter = 'all' | 'pending' | 'sent';

interface RemindersFilterBarProps {
  filter: ReminderFilter;
  onFilterChange: (f: ReminderFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  counts: { all: number; pending: number; sent: number };
}

export function RemindersFilterBar({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  counts,
}: RemindersFilterBarProps) {
  const tabs: { key: ReminderFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'sent', label: 'Notificados' },
  ];

  return (
    <div
      className="glass-card"
      style={{
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      {/* Botones de sub-filtro con contadores */}
      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`btn ${filter === key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            onClick={() => onFilterChange(key)}
          >
            <span>{label}</span>
            <span
              style={{
                marginLeft: '0.375rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '999px',
                backgroundColor: filter === key ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
        <Search
          size={16}
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
          placeholder="Buscar por cliente o teléfono..."
          style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem', width: '100%' }}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

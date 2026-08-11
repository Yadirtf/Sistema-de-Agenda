'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Plus, Shield, Mail, Calendar, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { UserWithRoles, PaginatedResponse } from '@agendamiento/shared';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), perPage: '10' });
      if (search) params.append('search', search);
      return apiClient.get<PaginatedResponse<UserWithRoles>>(`/users?${params.toString()}`);
    },
  });

  const users = data?.data || [];
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
            Gestión de Usuarios del Sistema
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Administración de cuentas de acceso y asignación de roles (RBAC)
          </p>
        </div>
      </div>

      {/* Search */}
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
            placeholder="Buscar por correo o nombre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando usuarios...
          </div>
        ) : isError ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>
            Error al cargar usuarios o sin permisos suficientes.
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron usuarios registrados.
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
                  <th style={{ padding: '1rem' }}>Usuario / Persona</th>
                  <th style={{ padding: '1rem' }}>Correo Electrónico</th>
                  <th style={{ padding: '1rem' }}>Roles Asignados</th>
                  <th style={{ padding: '1rem' }}>Fecha de Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const person = user.person;

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary-500)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                            }}
                          >
                            {person?.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                              {person?.firstName} {person?.lastName}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Doc: {person?.documentNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {user.roles?.map((role) => (
                            <span key={role.id} className="badge badge-info">
                              <Shield size={12} />
                              <span>{role.name}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {new Date(user.createdAt).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

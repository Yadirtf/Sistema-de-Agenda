'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RefreshCcw, User, Calendar, AlertTriangle, Trash } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Client } from '@agendamiento/shared';

export function RecycleBinTable() {
  const queryClient = useQueryClient();
  const [isEmptying, setIsEmptying] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients-bin'],
    queryFn: () => apiClient.get<Client[]>('/clients/bin/deleted'),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/clients/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-bin'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/clients/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-bin'] });
    },
  });

  const emptyBinMutation = useMutation({
    mutationFn: () => apiClient.delete('/clients/bin/empty'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-bin'] });
      setIsEmptying(false);
    },
  });

  const handleRestore = (id: number) => {
    if (confirm('¿Estás seguro de que deseas restaurar este cliente?')) {
      restoreMutation.mutate(id);
    }
  };

  const handlePermanentDelete = (id: number) => {
    if (confirm('¡ADVERTENCIA! Se eliminarán permanentemente todos los datos asociados (citas, historial, etc.). Esta acción no se puede deshacer. ¿Continuar?')) {
      permanentDeleteMutation.mutate(id);
    }
  };

  const handleEmptyBin = () => {
    if (confirm('¿Estás seguro de que deseas vaciar toda la papelera? Se perderán todos los datos de estos clientes permanentemente.')) {
      setIsEmptying(true);
      emptyBinMutation.mutate();
    }
  };

  if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando papelera...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
          <Trash2 size={20} />
          <span style={{ fontSize: '0.875rem' }}>{clients?.length || 0} clientes en la papelera</span>
        </div>

        {clients && clients.length > 0 && (
          <button
            className="btn btn-danger"
            onClick={handleEmptyBin}
            disabled={isEmptying}
            style={{ padding: '0.5rem 1rem' }}
          >
            <Trash size={16} />
            <span>{isEmptying ? 'Vaciando...' : 'Vaciar Papelera'}</span>
          </button>
        )}
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        {!clients || clients.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
              <Trash2 size={32} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>La papelera está vacía</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-app)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem' }}>Cliente</th>
                  <th style={{ padding: '1rem' }}>Fecha Eliminación</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="hover-bg-subtle">
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={18} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{client.person?.firstName} {client.person?.lastName}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>C.C. {client.person?.documentNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} />
                        <span>{client.deletedAt ? new Date(client.deletedAt).toLocaleString('es-CO') : 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRestore(client.id)}
                          title="Restaurar cliente"
                          style={{ color: 'var(--primary-600)' }}
                        >
                          <RefreshCcw size={16} />
                          <span>Restaurar</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handlePermanentDelete(client.id)}
                          title="Eliminar permanentemente"
                          style={{ color: 'var(--danger-text)' }}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <AlertTriangle size={20} style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.25rem' }}>Zona de Peligro</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger-text)', opacity: 0.9, lineHeight: 1.5 }}>
            Los clientes en esta lista no son visibles en el sistema principal. Restaurarlos devolverá todas sus citas e historial.
            La eliminación definitiva borrará permanentemente toda la información relacionada sin posibilidad de recuperación.
          </p>
        </div>
      </div>
    </div>
  );
}

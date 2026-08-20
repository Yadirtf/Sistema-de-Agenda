'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  RefreshCcw,
  User,
  Calendar,
  AlertTriangle,
  Trash,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Client } from '@agendamiento/shared';

// ─── Tipos de confirmación ────────────────────────────────────────────────────
type ConfirmAction =
  | { type: 'permanent-single'; client: Client }
  | { type: 'empty-bin' }
  | null;

// ─── Modal de confirmación inline ─────────────────────────────────────────────
function ConfirmModal({
  action,
  onConfirm,
  onCancel,
  isLoading,
}: {
  action: ConfirmAction;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!action) return null;

  const isEmptyBin = action.type === 'empty-bin';
  const clientName =
    !isEmptyBin
      ? `${action.client.person?.firstName ?? ''} ${action.client.person?.lastName ?? ''}`.trim()
      : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2rem',
          position: 'relative',
          border: '1px solid var(--danger-border)',
        }}
      >
        {/* Botón cerrar */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
        >
          <X size={18} />
        </button>

        {/* Icono + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--danger-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} style={{ color: 'var(--danger-text)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {isEmptyBin ? 'Vaciar papelera' : 'Eliminar permanentemente'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
              Esta acción <strong>no se puede deshacer</strong>
            </p>
          </div>
        </div>

        {/* Descripción */}
        <div
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
          }}
        >
          {isEmptyBin ? (
            <>
              Se eliminarán <strong>todos los clientes</strong> de la papelera junto con{' '}
              <strong>todas sus citas, historial e ingresos</strong>. No habrá posibilidad de recuperación.
            </>
          ) : (
            <>
              Se eliminará permanentemente a{' '}
              <strong style={{ color: 'var(--text-main)' }}>{clientName}</strong> junto con{' '}
              <strong>todas sus citas, reagendamientos, seguimientos e ingresos</strong>.
            </>
          )}
        </div>

        {/* Aviso visual */}
        <div
          style={{
            display: 'flex',
            gap: '0.625rem',
            alignItems: 'flex-start',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            marginBottom: '1.5rem',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger-text)', lineHeight: 1.5 }}>
            {isEmptyBin
              ? 'Se borrarán todos los registros relacionados en la base de datos.'
              : 'El registro de cliente y su persona serán borrados de la base de datos si no está vinculada a un usuario del sistema.'}
          </p>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isLoading}
            style={{ minWidth: '160px', justifyContent: 'center' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash size={16} />
                <span>{isEmptyBin ? 'Sí, vaciar papelera' : 'Sí, eliminar'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function RecycleBinTable() {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients-bin'],
    queryFn: () => apiClient.get<Client[]>('/clients/bin/deleted'),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['clients-bin'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['scheduling-capacity'] });
  };

  // Mutación: restaurar
  const restoreMutation = useMutation({
    mutationFn: (id: number) => {
      setRestoringId(id);
      return apiClient.patch(`/clients/${id}/restore`);
    },
    onSuccess: () => {
      setRestoringId(null);
      setGlobalError(null);
      invalidateAll();
    },
    onError: (err: any) => {
      setRestoringId(null);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err?.message || 'Error al restaurar el cliente.';
      setGlobalError(msg);
    },
  });

  // Mutación: eliminar permanentemente uno
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/clients/${id}/permanent`),
    onSuccess: () => {
      setConfirmAction(null);
      setGlobalError(null);
      invalidateAll();
    },
    onError: (err: any) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err?.message || 'Error al eliminar el cliente.';
      setGlobalError(msg);
      setConfirmAction(null);
    },
  });

  // Mutación: vaciar papelera
  const emptyBinMutation = useMutation({
    mutationFn: () => apiClient.delete('/clients/bin/empty'),
    onSuccess: () => {
      setConfirmAction(null);
      setGlobalError(null);
      invalidateAll();
    },
    onError: (err: any) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err?.message || 'Error al vaciar la papelera.';
      setGlobalError(msg);
      setConfirmAction(null);
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'permanent-single') {
      permanentDeleteMutation.mutate(confirmAction.client.id);
    } else {
      emptyBinMutation.mutate();
    }
  };

  const isConfirming =
    permanentDeleteMutation.isPending || emptyBinMutation.isPending;

  if (isLoading)
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        Cargando papelera...
      </div>
    );

  return (
    <>
      {/* Modal de confirmación */}
      <ConfirmModal
        action={confirmAction}
        onConfirm={handleConfirm}
        onCancel={() => !isConfirming && setConfirmAction(null)}
        isLoading={isConfirming}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Cabecera con contador y acción vaciar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
            <Trash2 size={20} />
            <span style={{ fontSize: '0.875rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>{clients?.length ?? 0}</strong>{' '}
              {clients?.length === 1 ? 'cliente en la papelera' : 'clientes en la papelera'}
            </span>
          </div>

          {clients && clients.length > 0 && (
            <button
              className="btn btn-danger"
              onClick={() => setConfirmAction({ type: 'empty-bin' })}
              style={{ padding: '0.5rem 1rem' }}
            >
              <Trash size={16} />
              <span>Vaciar papelera</span>
            </button>
          )}
        </div>

        {/* Error global */}
        {globalError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              fontSize: '0.875rem',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.125rem' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tabla */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {!clients || clients.length === 0 ? (
            <div
              style={{
                padding: '4rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-app)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-light)',
                }}
              >
                <Trash2 size={32} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>La papelera está vacía</p>
              <p style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>
                Los clientes eliminados aparecerán aquí antes de ser borrados definitivamente
              </p>
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
                    <th style={{ padding: '1rem' }}>Cliente</th>
                    <th style={{ padding: '1rem' }}>Documento</th>
                    <th style={{ padding: '1rem' }}>Fecha Eliminación</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const isThisRestoring = restoringId === client.id;
                    const person = client.person;

                    return (
                      <tr
                        key={client.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                        className="hover-bg-subtle"
                      >
                        {/* Cliente */}
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--bg-app)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {person?.firstName?.[0]?.toUpperCase() ?? <User size={18} />}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                {person?.firstName} {person?.lastName}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                ID Cliente: {client.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Documento */}
                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                          <p style={{ fontWeight: 500 }}>{person?.documentNumber ?? '—'}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {person?.documentType?.name}
                          </p>
                        </td>

                        {/* Fecha */}
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Calendar size={14} />
                            <span>
                              {client.deletedAt
                                ? new Date(client.deletedAt).toLocaleString('es-CO', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            {/* Restaurar */}
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => restoreMutation.mutate(client.id)}
                              title="Restaurar cliente al sistema"
                              disabled={isThisRestoring || restoreMutation.isPending}
                              style={{ color: 'var(--primary-600)', minWidth: '100px' }}
                            >
                              {isThisRestoring ? (
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              ) : (
                                <RefreshCcw size={14} />
                              )}
                              <span>{isThisRestoring ? 'Restaurando...' : 'Restaurar'}</span>
                            </button>

                            {/* Eliminar permanentemente */}
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setConfirmAction({ type: 'permanent-single', client })}
                              title="Eliminar permanentemente con todos sus datos"
                              style={{ color: 'var(--danger-text)' }}
                            >
                              <Trash size={14} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Aviso zona de peligro */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--danger-text)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.25rem' }}>
              Zona de Peligro
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--danger-text)', opacity: 0.9, lineHeight: 1.5 }}>
              Los clientes en esta lista no son visibles en el sistema principal. Restaurarlos devolverá
              todas sus citas e historial. La eliminación definitiva borrará permanentemente toda la
              información relacionada sin posibilidad de recuperación.
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe para la animación spin del Loader2 */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

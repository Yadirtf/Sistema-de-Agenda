'use client';

import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Client } from '@agendamiento/shared';

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSuccess: () => void;
}

export function DeleteClientModal({ isOpen, onClose, client, onSuccess }: DeleteClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.delete(`/clients/${client.id}`);
      onSuccess();
      onClose();
    } catch (err) {
      setError('Error al eliminar el cliente. Asegúrate de que no haya restricciones pendientes.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px', position: 'relative', padding: '2rem' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--danger-text)',
            marginBottom: '1.25rem',
          }}
        >
          <AlertTriangle size={28} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Eliminar Cliente</h2>
        </div>

        <div style={{ fontSize: '0.9375rem', color: 'var(--text-main)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          ¿Estás seguro de que deseas eliminar a <strong>{client.person?.firstName} {client.person?.lastName}</strong>?
          <br />
          <br />
          Esta acción es <strong>permanente</strong> y eliminará todos sus registros asociados:
          <ul
            style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}
          >
            <li>Citas y re-agendamientos</li>
            <li>Historial de ingresos</li>
            <li>Seguimientos</li>
            <li>Configuración personalizada</li>
          </ul>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              fontSize: '0.8125rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: 'var(--danger-text)', borderColor: 'var(--danger-text)' }}
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 size={18} />
            <span>{loading ? 'Eliminando...' : 'Eliminar Permanentemente'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

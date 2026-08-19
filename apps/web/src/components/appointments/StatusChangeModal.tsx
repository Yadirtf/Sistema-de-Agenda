'use client';

import { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Ban, HelpCircle } from 'lucide-react';
import { CatalogItem } from '@agendamiento/shared';
import { getStatusColor } from '@/lib/appointment-utils';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  status: CatalogItem | null;
  loading?: boolean;
}

export function StatusChangeModal({
  isOpen,
  onClose,
  onConfirm,
  status,
  loading,
}: StatusChangeModalProps) {
  const [note, setNote] = useState('');

  if (!isOpen || !status) return null;

  const getStatusIcon = () => {
    switch (status.name) {
      case 'Completada':
        return <CheckCircle2 size={24} className="text-success" />;
      case 'Cancelada':
        return <Ban size={24} className="text-danger" />;
      case 'No Asistió':
        return <AlertCircle size={24} className="text-danger" />;
      case 'Confirmada':
        return <CheckCircle2 size={24} className="text-info" />;
      default:
        return <HelpCircle size={24} className="text-muted" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '450px',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative',
        }}
      >
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
          disabled={loading}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-app)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getStatusColor(status.name),
            }}
          >
            {getStatusIcon()}
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Confirmar Cambio</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Vas a cambiar el estado a <strong>{status.name}</strong>
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="status-note"
            style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--text-muted)',
            }}
          >
            Nota (Opcional)
          </label>
          <textarea
            id="status-note"
            className="input"
            rows={3}
            placeholder="Añade una observación sobre este cambio..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', resize: 'none' }}
            disabled={loading}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(note)}
            disabled={loading}
            style={{ backgroundColor: getStatusColor(status.name), borderColor: getStatusColor(status.name) }}
          >
            {loading ? 'Procesando...' : 'Confirmar Cambio'}
          </button>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Client, CatalogItem } from '@agendamiento/shared';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSuccess: () => void;
}

export function EditClientModal({ isOpen, onClose, client, onSuccess }: EditClientModalProps) {
  const [firstName, setFirstName] = useState(client.person?.firstName || '');
  const [middleName, setMiddleName] = useState(client.person?.middleName || '');
  const [lastName, setLastName] = useState(client.person?.lastName || '');
  const [secondLastName, setSecondLastName] = useState(client.person?.secondLastName || '');
  const [documentTypeId, setDocumentTypeId] = useState(Number(client.person?.documentTypeId) || 1);
  const [documentNumber, setDocumentNumber] = useState(client.person?.documentNumber || '');
  const [phone, setPhone] = useState(client.person?.phone || '');
  const [email, setEmail] = useState(client.person?.email || '');
  const [birthDate, setBirthDate] = useState(
    client.person?.birthDate ? new Date(client.person.birthDate).toISOString().split('T')[0] : ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: documentTypes } = useQuery({
    queryKey: ['catalogs', 'document-types'],
    queryFn: () => apiClient.get<CatalogItem[]>('/catalogs/document-types'),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await apiClient.patch(`/clients/${client.id}`, {
        person: {
          firstName,
          middleName: middleName || null,
          lastName,
          secondLastName: secondLastName || null,
          documentTypeId,
          documentNumber,
          phone: phone || null,
          email: email || null,
          birthDate: birthDate || null,
        },
      });
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Error al actualizar los datos del cliente.');
      }
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
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          padding: '2rem',
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
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          Editar Información del Cliente
        </h2>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Tipo de Documento</label>
              <select
                className="input"
                value={documentTypeId}
                onChange={(e) => setDocumentTypeId(Number(e.target.value))}
              >
                {documentTypes?.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Número de Documento</label>
              <input
                type="text"
                className="input"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primer Nombre</label>
              <input
                type="text"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Segundo Nombre</label>
              <input
                type="text"
                className="input"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Primer Apellido</label>
              <input
                type="text"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Segundo Apellido</label>
              <input
                type="text"
                className="input"
                value={secondLastName}
                onChange={(e) => setSecondLastName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Fecha de Nacimiento</label>
              <input
                type="date"
                className="input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                type="text"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

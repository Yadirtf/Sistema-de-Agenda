'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Plus,
  Phone,
  Mail,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  FollowUp,
  CatalogItem,
  Client,
  PaginatedResponse,
} from '@agendamiento/shared';

export default function FollowUpsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [clientId, setClientId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: followUpsData, isLoading } = useQuery({
    queryKey: ['follow-ups', page],
    queryFn: () => apiClient.get<PaginatedResponse<FollowUp>>(`/follow-ups?page=${page}&perPage=10`),
  });

  const { data: followUpTypes } = useQuery({
    queryKey: ['catalogs', 'follow-up-types'],
    queryFn: () => apiClient.get<CatalogItem[]>('/catalogs/follow-up-types'),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: () => apiClient.get<PaginatedResponse<Client>>('/clients?perPage=100'),
  });

  const followUps = followUpsData?.data || [];
  const meta = followUpsData?.meta;
  const clients = clientsData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId || !typeId || !description) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/follow-ups', {
        clientId,
        typeId,
        description,
      });

      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      setShowModal(false);
      setDescription('');
    } catch {
      setError('Error al registrar el seguimiento');
    } finally {
      setSaving(false);
    }
  };

  const getIconForType = (typeName?: string) => {
    if (typeName?.toLowerCase().includes('whatsapp')) return MessageSquare;
    if (typeName?.toLowerCase().includes('correo')) return Mail;
    if (typeName?.toLowerCase().includes('llamada')) return Phone;
    return FileText;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Seguimiento de Clientes
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Registro de llamadas, mensajes de WhatsApp, correos y visitas presenciales
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>Nuevo Seguimiento</span>
        </button>
      </div>

      {/* Follow-ups List */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando seguimientos...
          </div>
        ) : followUps.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay registros de seguimiento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {followUps.map((item) => {
              const person = item.client?.person;
              const Icon = getIconForType(item.type?.name);
              const createdAt = new Date(item.createdAt);

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-app)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--primary-50)',
                          color: 'var(--primary-600)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                          {person?.firstName} {person?.lastName}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {person?.phone || person?.email || person?.documentNumber}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-info">{item.type?.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {createdAt.toLocaleDateString('es-CO')} {createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', paddingLeft: '3rem' }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New FollowUp Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Registrar Seguimiento</h2>

            {error && (
              <div style={{ padding: '0.625rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select
                  className="input"
                  value={clientId ?? ''}
                  onChange={(e) => setClientId(Number(e.target.value))}
                  required
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.person?.firstName} {c.person?.lastName} ({c.person?.documentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Canal / Tipo de Seguimiento *</label>
                <select
                  className="input"
                  value={typeId}
                  onChange={(e) => setTypeId(Number(e.target.value))}
                  required
                >
                  {followUpTypes?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detalle o Resultado del Seguimiento *</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Ej: Se realizó llamada para confirmar asistencia a la próxima cita. Cliente confirmó disponibilidad..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Seguimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

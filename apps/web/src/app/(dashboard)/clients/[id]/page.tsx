'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Client, ClientEntry, CatalogItem, SchedulingInterval } from '@agendamiento/shared';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientId = Number(params.id);

  const [selectedIntervalId, setSelectedIntervalId] = useState<number | null>(null);
  const [intervalNotes, setIntervalNotes] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingEntry, setAddingEntry] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch client details
  const { data: client, isLoading, isError } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => apiClient.get<Client>(`/clients/${clientId}`),
    enabled: !!clientId,
  });

  // Fetch client entries
  const { data: entries } = useQuery({
    queryKey: ['client-entries', clientId],
    queryFn: () => apiClient.get<ClientEntry[]>(`/clients/${clientId}/entries`),
    enabled: !!clientId,
  });

  // Fetch intervals catalog
  const { data: intervals } = useQuery({
    queryKey: ['catalogs', 'scheduling-intervals'],
    queryFn: () => apiClient.get<SchedulingInterval[]>('/catalogs/scheduling-intervals'),
  });

  const person = client?.person;
  const currentConfig = client?.schedulingConfig;

  const handleSaveInterval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntervalId) return;

    try {
      setSavingConfig(true);
      setMessage(null);

      await apiClient.put(`/clients/${clientId}/scheduling-config`, {
        intervalId: selectedIntervalId,
        notes: intervalNotes || null,
      });

      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setMessage({ type: 'success', text: 'Configuración de agendamiento actualizada correctamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al actualizar la configuración.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryDate) return;

    try {
      setAddingEntry(true);
      setMessage(null);

      await apiClient.post(`/clients/${clientId}/entries`, {
        entryDate: newEntryDate,
        statusId: 1, // Activo
      });

      queryClient.invalidateQueries({ queryKey: ['client-entries', clientId] });
      setMessage({ type: 'success', text: 'Nuevo ingreso registrado.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al registrar el ingreso.' });
    } finally {
      setAddingEntry(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando perfil del cliente...
      </div>
    );
  }

  if (isError || !client) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>
        No se pudo cargar el cliente especificado.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div>
        <Link href="/clients" className="btn btn-ghost" style={{ paddingLeft: 0, color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} />
          <span>Volver a Clientes</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {person?.firstName} {person?.lastName}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {person?.documentType?.name}: {person?.documentNumber}
            </p>
          </div>

          <span className={`badge ${person?.status?.name === 'Activo' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.375rem 0.875rem', fontSize: '0.875rem' }}>
            {person?.status?.name || 'Activo'}
          </span>
        </div>
      </div>

      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
            border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
            fontSize: '0.875rem',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Personal Details */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} style={{ color: 'var(--primary-500)' }} />
            <span>Datos de Contacto</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Teléfono Móvil</p>
              <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                <Phone size={16} />
                <span>{person?.phone || 'Sin registrar'}</span>
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Correo Electrónico</p>
              <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.125rem' }}>
                <Mail size={16} />
                <span>{person?.email || 'Sin registrar'}</span>
              </p>
            </div>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Fecha de Nacimiento</p>
              <p style={{ fontWeight: 600, marginTop: '0.125rem' }}>
                {person?.birthDate ? new Date(person.birthDate).toLocaleDateString('es-CO') : 'Sin registrar'}
              </p>
            </div>
          </div>
        </div>

        {/* Scheduling Config (Override) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} style={{ color: 'var(--primary-500)' }} />
            <span>Configuración de Agendamiento</span>
          </h2>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Personaliza la frecuencia de visitas para este cliente específico.
          </p>

          <form onSubmit={handleSaveInterval} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Intervalo Personalizado</label>
              <select
                className="input"
                value={selectedIntervalId ?? currentConfig?.intervalId ?? ''}
                onChange={(e) => setSelectedIntervalId(Number(e.target.value))}
              >
                <option value="">-- Usar configuración global por defecto --</option>
                {intervals?.map((int) => (
                  <option key={int.id} value={int.id}>
                    {int.name} ({int.days} días)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notas / Razón de Frecuencia</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Ej: Cliente prefiere visitas cada 15 días durante fase inicial..."
                defaultValue={currentConfig?.notes || ''}
                onChange={(e) => setIntervalNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingConfig} style={{ alignSelf: 'flex-start' }}>
              <Save size={16} />
              <span>{savingConfig ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Client Entries History */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} style={{ color: 'var(--primary-500)' }} />
          <span>Historial de Ingresos del Cliente</span>
        </h2>

        {/* Add Entry Form */}
        <form onSubmit={handleAddEntry} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Registrar Nuevo Ingreso</label>
            <input
              type="date"
              className="input"
              value={newEntryDate}
              onChange={(e) => setNewEntryDate(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-secondary" disabled={addingEntry} style={{ marginTop: '1.5rem' }}>
            <Plus size={16} />
            <span>{addingEntry ? 'Registrando...' : 'Agregar Ingreso'}</span>
          </button>
        </form>

        {/* Entries List */}
        {entries && entries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries.map((entry) => {
              const entryDate = new Date(entry.entryDate);
              const dayOfMonth = entryDate.getDate();
              const weekOfMonth = Math.ceil(dayOfMonth / 7);

              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Calendar size={18} style={{ color: 'var(--primary-500)' }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                        {entryDate.toLocaleDateString('es-CO', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Semana {weekOfMonth} del mes
                      </p>
                    </div>
                  </div>

                  <span className="badge badge-success">{entry.status?.name || 'Activo'}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No hay registros de ingreso para este cliente.
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Save, AlertCircle, Sparkles } from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Client,
  NextAppointmentSuggestion,
  PaginatedResponse,
} from '@agendamiento/shared';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: number | null;
  previousAppointmentId?: number | null;
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  clientId: initialClientId,
  previousAppointmentId,
}: CreateAppointmentModalProps) {
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClientId || null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('08:00');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<NextAppointmentSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Fetch clients for dropdown if not provided
  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: () => apiClient.get<PaginatedResponse<Client>>('/clients?perPage=100'),
    enabled: isOpen && !initialClientId,
  });

  const clients = clientsData?.data || [];

  // When client selection changes, fetch auto-suggestion
  useEffect(() => {
    const fetchSuggestion = async () => {
      const cid = initialClientId || selectedClientId;
      if (!cid || !isOpen) return;

      try {
        setLoadingSuggestion(true);
        const sugg = await apiClient.get<NextAppointmentSuggestion>(
          `/appointments/suggest-next/${cid}`,
        );
        if (sugg) {
          setSuggestion(sugg);
          const suggDate = new Date(sugg.suggestedDate);
          setAppointmentDate(suggDate.toISOString().split('T')[0]);
          setAppointmentTime(
            suggDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
          );
        }
      } catch {
        // Ignore
      } finally {
        setLoadingSuggestion(false);
      }
    };

    fetchSuggestion();
  }, [selectedClientId, initialClientId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cid = initialClientId || selectedClientId;

    if (!cid || !appointmentDate || !appointmentTime) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const combinedDateTime = `${appointmentDate}T${appointmentTime}:00`;

      await apiClient.post('/appointments', {
        clientId: cid,
        previousAppointmentId: previousAppointmentId || null,
        appointmentDate: new Date(combinedDateTime).toISOString(),
        notes: notes || null,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Error al registrar la cita.');
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 300,
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
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-glow)',
          position: 'relative',
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reagendar / Nueva Cita</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completa los detalles para programar el próximo encuentro</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', fontSize: '0.875rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {!initialClientId && (
            <div className="form-group">
              <label className="form-label">Seleccionar Cliente *</label>
              <select
                className="input"
                value={selectedClientId ?? ''}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
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
          )}

          {suggestion && (
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-500)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} style={{ color: 'var(--primary-600)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary-700)' }}>Sugerencia (Semana {suggestion.entryWeek})</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Rango: {suggestion.weekStartDate} al {suggestion.weekEndDate}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Fecha de la Cita *</label>
              <input
                type="date"
                className="input"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora *</label>
              <input
                type="time"
                className="input"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notas Adicionales</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Observaciones de la cita..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Agendando...' : 'Guardar Cita'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

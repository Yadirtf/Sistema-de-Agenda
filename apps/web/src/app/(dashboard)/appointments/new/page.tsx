'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Save, AlertCircle, Sparkles } from 'lucide-react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Client,
  CatalogItem,
  PaginatedResponse,
  NextAppointmentSuggestion,
} from '@agendamiento/shared';

export default function NewAppointmentPage() {
  const router = useRouter();

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('08:00');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<NextAppointmentSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: () => apiClient.get<PaginatedResponse<Client>>('/clients?perPage=100'),
  });

  const clients = clientsData?.data || [];

  // When client selection changes, fetch auto-suggestion
  const handleClientChange = async (clientId: number) => {
    setSelectedClientId(clientId);
    setSuggestion(null);

    if (!clientId) return;

    try {
      setLoadingSuggestion(true);
      const sugg = await apiClient.get<NextAppointmentSuggestion>(
        `/appointments/suggest-next/${clientId}`,
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
      // Ignore suggestion fetch errors
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClientId || !appointmentDate || !appointmentTime) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const combinedDateTime = `${appointmentDate}T${appointmentTime}:00`;

      await apiClient.post('/appointments', {
        clientId: selectedClientId,
        appointmentDate: new Date(combinedDateTime).toISOString(),
        notes: notes || null,
      });

      router.push('/appointments');
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

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <Link href="/appointments" className="btn btn-ghost" style={{ paddingLeft: 0, color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} />
          <span>Volver a Citas</span>
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem' }}>
          Agendar Nueva Cita
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Selecciona un cliente y programa la fecha y hora de la cita
        </p>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">Seleccionar Cliente *</label>
          <select
            className="input"
            value={selectedClientId ?? ''}
            onChange={(e) => handleClientChange(Number(e.target.value))}
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

        {/* Suggestion & Entry Week Information Card */}
        {suggestion && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-500)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Sparkles size={20} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary-700)' }}>
                  Asistente de Agendamiento — Semana {suggestion.entryWeek}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Basado en su ingreso inicial{suggestion.firstEntryDate ? ` (${suggestion.firstEntryDate})` : ''} e intervalo {suggestion.interval.name}.
                </p>
              </div>
            </div>

            {suggestion.weekStartDate && suggestion.weekEndDate && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <span>
                  🗓️ <strong>Rango Recomendado para este periodo:</strong> {suggestion.weekStartDate} al {suggestion.weekEndDate}
                </span>
                <span className="badge badge-info">Semana {suggestion.entryWeek}</span>
              </div>
            )}
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

        {/* Live Week Validation Alert */}
        {appointmentDate && suggestion && (() => {
          const selectedDay = new Date(`${appointmentDate}T12:00:00`).getDate();
          const selectedWeek = selectedDay <= 7 ? 1 : selectedDay <= 14 ? 2 : selectedDay <= 21 ? 3 : 4;
          const isMatch = selectedWeek === suggestion.entryWeek;

          if (isMatch) {
            return (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  color: 'var(--success-text)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>✓ Fecha seleccionada está en la Semana {selectedWeek} (Rango sugerido del cliente)</span>
              </div>
            );
          } else {
            return (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fffbe6',
                  border: '1px solid #ffe58f',
                  color: '#d46b08',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>⚠️ Alerta de Capacidad:</strong> Estás seleccionando una fecha en la <strong>Semana {selectedWeek}</strong>.
                  La semana de ingreso preferente del cliente es la <strong>Semana {suggestion.entryWeek}</strong>.
                  Mover de semana al cliente podría desbalancear la carga de trabajo en la agenda.
                </div>
              </div>
            );
          }
        })()}

        <div className="form-group">
          <label className="form-label">Notas Adicionales</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Ej: Observaciones de la cita o preparación del cliente..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <Link href="/appointments" className="btn btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} />
            <span>{loading ? 'Guardando...' : 'Guardar Cita'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

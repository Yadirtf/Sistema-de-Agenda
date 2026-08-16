'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  SchedulingConfig,
  SchedulingInterval,
} from '@agendamiento/shared';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Config form state
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: config } = useQuery({
    queryKey: ['scheduling-config'],
    queryFn: () => apiClient.get<SchedulingConfig>('/scheduling/config'),
  });

  const { data: intervals } = useQuery({
    queryKey: ['catalogs', 'scheduling-intervals'],
    queryFn: () => apiClient.get<SchedulingInterval[]>('/catalogs/scheduling-intervals'),
  });

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setSavingConfig(true);
      setConfigMessage(null);

      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      const defaultIntervalId = Number(formData.get('defaultIntervalId'));
      const allowClientOverride = formData.get('allowClientOverride') === 'on';
      const autoSuggestNext = formData.get('autoSuggestNext') === 'on';
      const respectEntryWeek = formData.get('respectEntryWeek') === 'on';
      const businessStartTime = formData.get('businessStartTime') as string;
      const businessEndTime = formData.get('businessEndTime') as string;
      const slotDurationMinutes = Number(formData.get('slotDurationMinutes'));
      const reminderDaysBefore = Number(formData.get('reminderDaysBefore'));
      const businessPhone = formData.get('businessPhone') as string;

      const workingDays = [1, 2, 3, 4, 5, 6, 0].filter((day) => formData.get(`day_${day}`) === 'on');

      await apiClient.put('/scheduling/config', {
        defaultIntervalId,
        allowClientOverride,
        autoSuggestNext,
        respectEntryWeek,
        workingDays,
        businessStartTime,
        businessEndTime,
        slotDurationMinutes,
        reminderDaysBefore,
        businessPhone: businessPhone || null,
      });

      queryClient.invalidateQueries({ queryKey: ['scheduling-config'] });
      setConfigMessage({ type: 'success', text: 'Configuración de agendamiento actualizada correctamente.' });
    } catch {
      setConfigMessage({ type: 'error', text: 'Error al actualizar la configuración.' });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Configuración del Sistema
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Parámetros globales de agendamiento, horarios y reglas de negocio
          </p>
        </div>
      </div>

      {config && (
        <div style={{ maxWidth: '800px' }}>
          {configMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: configMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: configMessage.type === 'success' ? 'var(--success-text)' : 'var(--danger-text)',
                border: `1px solid ${configMessage.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}
            >
              {configMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{configMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateConfig} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              Reglas de Periodicidad & Auto-sugerencia
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Intervalo Global por Defecto</label>
                <select className="input" name="defaultIntervalId" defaultValue={config.defaultIntervalId}>
                  {intervals?.map((int) => (
                    <option key={int.id} value={int.id}>
                      {int.name} ({int.days} días)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duración del Slot (Minutos)</label>
                <input
                  type="number"
                  className="input"
                  name="slotDurationMinutes"
                  defaultValue={config.slotDurationMinutes}
                  min={5}
                  max={240}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="autoSuggestNext" defaultChecked={config.autoSuggestNext} style={{ width: '18px', height: '18px' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Auto-sugerencia de Próxima Cita</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Al completar una cita, sugiere automáticamente la fecha para la siguiente cita.
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="allowClientOverride" defaultChecked={config.allowClientOverride} style={{ width: '18px', height: '18px' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Permitir Frecuencia Personalizada por Cliente</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Permite que clientes tengan un intervalo personalizado que reemplace la regla global.
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="respectEntryWeek" defaultChecked={config.respectEntryWeek} style={{ width: '18px', height: '18px' }} />
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Respetar Semana de Ingreso del Cliente</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ajusta la fecha sugerida para mantener al cliente en su misma semana del mes.
                  </p>
                </div>
              </label>
            </div>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginTop: '1rem' }}>
              Recordatorios & WhatsApp
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Días de Anticipación para Recordatorio</label>
                <input
                  type="number"
                  className="input"
                  name="reminderDaysBefore"
                  defaultValue={config.reminderDaysBefore}
                  min={1}
                  max={30}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cuántos días antes de la cita se habilitará la notificación.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono WhatsApp Negocio</label>
                <input
                  type="text"
                  className="input"
                  name="businessPhone"
                  defaultValue={config.businessPhone || ''}
                  placeholder="Ej: 573001234567"
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Número para solicitudes de reagendamiento (incluir código de país).
                </p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginTop: '1rem' }}>
              Horarios & Días Laborales
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Hora Inicio de Jornada</label>
                <input type="time" className="input" name="businessStartTime" defaultValue={config.businessStartTime} />
              </div>

              <div className="form-group">
                <label className="form-label">Hora Fin de Jornada</label>
                <input type="time" className="input" name="businessEndTime" defaultValue={config.businessEndTime} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Días Laborales Activos</label>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {[
                  { label: 'Lunes', val: 1 },
                  { label: 'Martes', val: 2 },
                  { label: 'Miércoles', val: 3 },
                  { label: 'Jueves', val: 4 },
                  { label: 'Viernes', val: 5 },
                  { label: 'Sábado', val: 6 },
                  { label: 'Domingo', val: 0 },
                ].map((day) => (
                  <label
                    key={day.val}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-app)',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      name={`day_${day.val}`}
                      defaultChecked={config.workingDays.includes(day.val)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingConfig}>
                <Save size={18} />
                <span>{savingConfig ? 'Guardando...' : 'Guardar Reglas'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

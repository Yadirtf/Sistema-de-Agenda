'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  History,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  SchedulingConfig,
  SchedulingInterval,
  WeekCapacityResponse,
} from '@agendamiento/shared';
import { YearlyHistoryGrid } from '@/components/appointments/YearlyHistoryGrid';

export default function SchedulingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'capacity' | 'config' | 'history'>('capacity');

  // Config form state
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries
  const { data: capacity, isLoading: loadingCapacity } = useQuery({
    queryKey: ['scheduling-week-capacity'],
    queryFn: () => apiClient.get<WeekCapacityResponse>('/scheduling/week-capacity'),
  });

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
            Reglas de Agendamiento & Control de Semanas
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Balanceo de carga por semana de ingreso del cliente y parámetros globales
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('capacity')}
          className={`btn ${activeTab === 'capacity' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem' }}
        >
          <BarChart3 size={18} />
          <span>Tablero de Carga por Semanas</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem' }}
        >
          <Settings size={18} />
          <span>Configuración Global</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem' }}
        >
          <History size={18} />
          <span>Historial de Citas</span>
        </button>
      </div>

      {/* Tab 3: Historial de Citas */}
      {activeTab === 'history' && <YearlyHistoryGrid />}

      {/* Tab 1: Tablero de Carga por Semanas */}
      {activeTab === 'capacity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Clientes Distribuidos
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{capacity?.totalActiveClients ?? 0}</p>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-50)',
                  color: 'var(--primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CalendarIcon size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Citas este Mes ({capacity?.currentMonthName || 'Mes Actual'})
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{capacity?.totalAppointmentsThisMonth ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Week Capacity Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {loadingCapacity ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                Cargando métricas de capacidad por semana...
              </div>
            ) : (
              capacity?.weeks.map((w) => {
                const statusBadgeMap = {
                  optimal: { label: 'Capacidad Óptima', class: 'badge-success' },
                  normal: { label: 'Capacidad Normal', class: 'badge-info' },
                  high: { label: 'Carga Alta', class: 'badge-warning' },
                  overloaded: { label: 'Sobrecargada', class: 'badge-danger' },
                };

                const badge = statusBadgeMap[w.status];

                return (
                  <div key={w.weekNumber} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>{w.weekLabel}</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.dayRangeLabel}</p>
                      </div>
                      <span className={`badge ${badge.class}`}>{badge.label}</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Clientes de esta Semana:</span>
                        <strong style={{ fontSize: '1rem' }}>{w.clientCount} clientes</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Citas programadas este mes:</span>
                        <strong>{w.appointmentCount} citas</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Configuración Global */}
      {activeTab === 'config' && config && (
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

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Sparkles,
  X,
  ChevronRight,
  MoreVertical,
  ChevronDown,
  List,
  History,
  Bell,
  Search,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import {
  Appointment,
  CatalogItem,
  CompleteAppointmentResponse,
  PaginatedResponse,
  Client,
} from '@agendamiento/shared';
import { StatusChangeModal } from '@/components/appointments/StatusChangeModal';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';
import { YearlyHistoryGrid } from '@/components/appointments/YearlyHistoryGrid';
import { RescheduleFlowModal } from '@/components/appointments/RescheduleFlowModal';
import { AppointmentRemindersTab } from '@/components/appointments/AppointmentRemindersTab';
import { GeneralClientsTab } from '@/components/appointments/GeneralClientsTab';
import { CreateAppointmentModal } from '@/components/appointments/CreateAppointmentModal';

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'daily' | 'yearly' | 'reminders'>('general');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Daily filter range based on selectedDate (forcing Bogota offset)
  const getDailyRange = (dateStr: string) => {
    // dateStr viene como YYYY-MM-DD
    const start = `${dateStr}T00:00:00.000-05:00`;
    const end = `${dateStr}T23:59:59.999-05:00`;
    return { start, end };
  };

  // Modals state
  const [selectedClientForRebook, setSelectedClientForRebook] = useState<Client | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completionData, setCompletionData] = useState<CompleteAppointmentResponse | null>(null);
  const [creatingSuggestedAppt, setCreatingSuggestedAppt] = useState(false);

  const [selectedApptForStatus, setSelectedApptForStatus] = useState<Appointment | null>(null);
  const [targetStatus, setTargetStatus] = useState<CatalogItem | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const [finishedApptForResult, setFinishedApptForResult] = useState<Appointment | null>(null);
  const [resultStatus, setResultStatus] = useState<CatalogItem | null>(null);

  const [selectedApptForDetails, setSelectedApptForDetails] = useState<Appointment | null>(null);

  // Fetch appointments
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter, page, activeTab, selectedDate, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), perPage: '10' });
      if (statusFilter) params.append('statusId', statusFilter);
      if (search) params.append('search', search);

      // If daily tab, filter for the selected date
      if (activeTab === 'daily' && selectedDate) {
        const { start, end } = getDailyRange(selectedDate);
        params.append('dateFrom', start);
        params.append('dateTo', end);
      }

      return apiClient.get<PaginatedResponse<Appointment>>(`/appointments?${params.toString()}`);
    },
  });

  // Fetch appointment statuses catalog
  const { data: statuses } = useQuery({
    queryKey: ['catalogs', 'appointment-statuses'],
    queryFn: () => apiClient.get<CatalogItem[]>('/catalogs/appointment-statuses'),
  });

  const appointments = data?.data || [];
  const meta = data?.meta;

  // Confirm status change action
  const handleConfirmStatusChange = async (note: string) => {
    if (!selectedApptForStatus || !targetStatus) return;

    try {
      setIsChangingStatus(true);
      const res = await apiClient.patch<CompleteAppointmentResponse>(
        `/appointments/${selectedApptForStatus.id}/status`,
        { statusId: targetStatus.id, note }
      );

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups', selectedApptForStatus.id] });

      const finalStatus = targetStatus;
      const finishedAppt = selectedApptForStatus;

      setSelectedApptForStatus(null);
      setTargetStatus(null);

      // Handle post-change flows
      if (finalStatus.name === 'Completada' && res.nextAppointmentSuggestion) {
        setCompletionData(res);
      } else if (['Cancelada', 'No Asistió'].includes(finalStatus.name)) {
        setFinishedApptForResult(finishedAppt);
        setResultStatus(finalStatus);
      }
    } catch {
      alert('Error al cambiar el estado de la cita.');
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Confirm auto-suggested next appointment
  const handleConfirmSuggestedAppt = async () => {
    if (!completionData?.nextAppointmentSuggestion || !completionData.completedAppointment) return;

    try {
      setCreatingSuggestedAppt(true);
      const sugg = completionData.nextAppointmentSuggestion;
      const prevAppt = completionData.completedAppointment;

      await apiClient.post('/appointments', {
        clientId: prevAppt.clientId,
        previousAppointmentId: prevAppt.id,
        appointmentDate: sugg.suggestedDate,
        notes: `Cita auto-sugerida (${sugg.interval.name} - ${sugg.interval.days} días)`,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setCompletionData(null);
    } catch {
      alert('Error al agendar la próxima cita sugerida.');
    } finally {
      setCreatingSuggestedAppt(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            Gestión de Citas
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {activeTab === 'general'
              ? 'Vista consolidada de clientes y gestión de ciclos de agendamiento'
              : activeTab === 'daily'
              ? 'Seguimiento de agendamientos programados para el día de hoy'
              : activeTab === 'reminders'
              ? 'Gestión de notificaciones y recordatorios para citas próximas'
              : 'Historial completo de citas proyectado por meses y años'}
          </p>
        </div>

        <Link href="/appointments/new" className="btn btn-primary">
          <Plus size={18} />
          <span>Agendar Cita</span>
        </Link>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('general')}
          className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem', flexShrink: 0 }}
        >
          <User size={18} />
          <span>General</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem', flexShrink: 0 }}
        >
          <List size={18} />
          <span>Seguimiento Diario</span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`btn ${activeTab === 'reminders' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem', flexShrink: 0 }}
        >
          <Bell size={18} />
          <span>Notificación</span>
        </button>

        <button
          onClick={() => setActiveTab('yearly')}
          className={`btn ${activeTab === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.5rem 1rem', flexShrink: 0 }}
        >
          <History size={18} />
          <span>Historial Anual</span>
        </button>
      </div>

      {activeTab === 'general' ? (
        <GeneralClientsTab
          onRebook={(client) => {
            setSelectedClientForRebook(client);
            setIsCreateModalOpen(true);
          }}
        />
      ) : activeTab === 'yearly' ? (
        <YearlyHistoryGrid />
      ) : activeTab === 'reminders' ? (
        <AppointmentRemindersTab />
      ) : (
        <>
          {/* Search & Filter Bar */}
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar por nombre o cédula del cliente..."
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)', margin: '0 0.5rem' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <CalendarIcon size={16} />
                  <span style={{ fontWeight: 600 }}>Fecha:</span>
                </div>
                <input
                  type="date"
                  className="input"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', width: 'auto' }}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0 -1rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <Filter size={16} />
                <span>Estado:</span>
              </div>

              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {/* Filter Buttons */}
                <button
                  className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                  onClick={() => { setStatusFilter(''); setPage(1); }}
                >
                  Todas
                </button>
                {(() => {
                  const statusOrder = ['Sin agendar', 'Agendada', 'Confirmada', 'En Curso', 'Completada', 'Cancelada', 'No Asistió'];
                  const sortedStatuses = statuses
                    ? [...statuses].sort((a, b) => {
                        const indexA = statusOrder.indexOf(a.name);
                        const indexB = statusOrder.indexOf(b.name);
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                        return a.name.localeCompare(b.name);
                      })
                    : [];

                  return sortedStatuses.map((st) => (
                    <button
                      key={st.id}
                      className={`btn ${statusFilter === st.id.toString() ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                      onClick={() => { setStatusFilter(st.id.toString()); setPage(1); }}
                    >
                      {st.name}
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Cargando citas...
              </div>
            ) : appointments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se encontraron citas con los filtros seleccionados.
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
                      }}
                    >
                      <th style={{ padding: '1rem' }}>Cliente</th>
                      <th style={{ padding: '1rem' }}>Fecha y Hora</th>
                      <th style={{ padding: '1rem' }}>Estado</th>
                      <th style={{ padding: '1rem' }}>Notas</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => {
                      const person = appt.client?.person;
                      const date = new Date(appt.appointmentDate);
                      const isCompleted = appt.status?.name === 'Completada';
                      const isCancelled = appt.status?.name === 'Cancelada' || appt.status?.name === 'No Asistió';

                      return (
                        <tr
                          key={appt.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                          className="hover-bg-subtle"
                          onClick={() => setSelectedApptForDetails(appt)}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--primary-50)',
                                  color: 'var(--primary-600)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.875rem',
                                }}
                              >
                                {person?.firstName?.[0] || 'C'}
                              </div>
                              <div>
                                <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                  {person?.firstName} {person?.lastName}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {person?.phone || person?.documentNumber}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                              <CalendarIcon size={14} style={{ color: 'var(--primary-500)' }} />
                              <span>
                                {date.toLocaleDateString('es-CO', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                              <Clock size={12} />
                              <span>
                                {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '1rem' }}>
                            <span
                              className={`badge ${
                                isCompleted
                                  ? 'badge-success'
                                  : isCancelled
                                  ? 'badge-danger'
                                  : appt.status?.name === 'Agendada'
                                  ? 'badge-info'
                                  : 'badge-warning'
                              }`}
                            >
                              {appt.status?.name || 'Agendada'}
                            </span>
                          </td>

                          <td style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {appt.notes || '-'}
                            </div>
                          </td>

                          <td style={{ padding: '1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <select
                                className="input"
                                disabled={isCompleted || isCancelled}
                                style={{
                                  padding: '0.375rem 2rem 0.375rem 0.75rem',
                                  fontSize: '0.8125rem',
                                  cursor: (isCompleted || isCancelled) ? 'not-allowed' : 'pointer',
                                  backgroundColor: (isCompleted || isCancelled) ? 'var(--bg-app)' : 'var(--bg-app)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  appearance: 'none',
                                  minWidth: '140px',
                                  opacity: (isCompleted || isCancelled) ? 0.6 : 1
                                }}
                                value=""
                                onChange={(e) => {
                                  const statusId = e.target.value;
                                  if (!statusId) return;
                                  const selectedStatus = statuses?.find((s) => s.id.toString() === statusId);
                                  if (selectedStatus) {
                                    setSelectedApptForStatus(appt);
                                    setTargetStatus(selectedStatus);
                                  }
                                }}
                              >
                                <option value="" disabled>{(isCompleted || isCancelled) ? 'Finalizada' : 'Cambiar Estado'}</option>
                                {statuses?.filter(s => s.id !== appt.statusId).map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <ChevronDown
                                size={14}
                                style={{
                                  position: 'absolute',
                                  right: '0.75rem',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  pointerEvents: 'none',
                                  color: 'var(--text-muted)'
                                }}
                              />
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
        </>
      )}

      {/* Auto-suggestion Modal Upon Completion */}
      {completionData && completionData.nextAppointmentSuggestion && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: '520px',
              padding: '2rem',
              boxShadow: 'var(--shadow-glow)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setCompletionData(null)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>¡Cita Completada!</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Próxima cita sugerida automáticamente por el sistema
                </p>
              </div>
            </div>

            {/* Suggestion Box */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--primary-500)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Fecha Sugerida
                </span>
                <span className="badge badge-info">
                  {completionData.nextAppointmentSuggestion.interval.name} ({completionData.nextAppointmentSuggestion.interval.days} días)
                </span>
              </div>

              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                {new Date(completionData.nextAppointmentSuggestion.suggestedDate).toLocaleDateString('es-CO', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {completionData.nextAppointmentSuggestion.isClientOverride && (
                  <p>✓ Basado en la frecuencia personalizada del cliente</p>
                )}
                {completionData.nextAppointmentSuggestion.adjustedForEntryWeek && (
                  <p>✓ Manteniendo la semana del mes del ingreso original (Semana {completionData.nextAppointmentSuggestion.entryWeek})</p>
                )}
                {completionData.nextAppointmentSuggestion.adjustedForWorkingDay && (
                  <p>✓ Ajustado a un día laboral activo</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setCompletionData(null)}>
                Omitir
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmSuggestedAppt}
                disabled={creatingSuggestedAppt}
              >
                <Sparkles size={16} />
                <span>{creatingSuggestedAppt ? 'Agendando...' : 'Agendar Próxima Cita'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Status Change Confirmation Modal */}
      <StatusChangeModal
        isOpen={!!selectedApptForStatus && !!targetStatus}
        onClose={() => { setSelectedApptForStatus(null); setTargetStatus(null); }}
        onConfirm={handleConfirmStatusChange}
        status={targetStatus}
        loading={isChangingStatus}
      />

      {/* Appointment Details & Timeline Modal */}
      <AppointmentDetailsModal
        isOpen={!!selectedApptForDetails}
        onClose={() => setSelectedApptForDetails(null)}
        appointment={selectedApptForDetails}
      />

      {/* Post-status change action flow */}
      <RescheduleFlowModal
        isOpen={!!finishedApptForResult && !!resultStatus}
        onClose={() => { setFinishedApptForResult(null); setResultStatus(null); }}
        appointment={finishedApptForResult}
        newStatus={resultStatus}
      />

      {/* Standalone Create Appointment Modal (from General Tab) */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedClientForRebook(null);
        }}
        clientId={selectedClientForRebook?.id}
      />
    </div>
  );
}

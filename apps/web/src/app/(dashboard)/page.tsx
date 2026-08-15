'use client';

import Link from 'next/link';
import {
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  PlusCircle,
  RotateCcw,
  MessageSquare,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DashboardStats } from '@agendamiento/shared';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
  });

  const kpis = [
    {
      title: 'Citas de Hoy',
      value: isLoading ? '...' : stats?.todayAppointments.toString() || '0',
      description: 'Programadas para la jornada',
      icon: Calendar,
      color: 'var(--primary-500)',
      bgColor: 'var(--primary-50)',
    },
    {
      title: 'Confirmadas',
      value: isLoading ? '...' : stats?.confirmedAppointments.toString() || '0',
      description: 'Clientes confirmados',
      icon: CheckCircle2,
      color: 'var(--success-text)',
      bgColor: 'var(--success-bg)',
    },
    {
      title: 'Pendientes',
      value: isLoading ? '...' : stats?.pendingAppointments.toString() || '0',
      description: 'Por confirmar / agendar',
      icon: Clock,
      color: 'var(--warning-text)',
      bgColor: 'var(--warning-bg)',
    },
    {
      title: 'Clientes Activos',
      value: isLoading ? '...' : stats?.activeClients.toString() || '0',
      description: 'Registrados en sistema',
      icon: UserCheck,
      color: 'var(--info-text)',
      bgColor: 'var(--info-bg)',
    },
  ];

  const quickActions = [
    {
      title: 'Nueva Cita',
      description: 'Agendar una cita para un cliente',
      href: '/appointments/new',
      icon: PlusCircle,
      primary: true,
    },
    {
      title: 'Registrar Cliente',
      description: 'Crear nuevo perfil de cliente',
      href: '/clients/new',
      icon: UserCheck,
      primary: false,
    },
    {
      title: 'Reagendar',
      description: 'Cambiar fecha u horario de cita',
      href: '/appointments',
      icon: RotateCcw,
      primary: false,
    },
    {
      title: 'Nuevo Seguimiento',
      description: 'Registrar llamada o mensaje',
      href: '/follow-ups',
      icon: MessageSquare,
      primary: false,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: '2rem',
          background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            ¡Bienvenido, {user?.person?.firstName || 'Usuario'}!
          </h1>
          <p style={{ fontSize: '0.9375rem', opacity: 0.9, marginTop: '0.375rem' }}>
            Sistema de Agendamiento — Gestión automatizada y flexible de citas
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="btn"
          style={{
            backgroundColor: '#ffffff',
            color: 'var(--primary-700)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
          }}
        >
          <PlusCircle size={18} />
          <span>Agendar Cita</span>
        </Link>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                  }}
                >
                  {kpi.title}
                </span>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: kpi.bgColor,
                    color: kpi.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} />
                </div>
              </div>
              <p
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: 1,
                  marginBottom: '0.375rem',
                }}
              >
                {kpi.value}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {kpi.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Actions Grid */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <TrendingUp size={20} style={{ color: 'var(--primary-500)' }} />
            <span>Acciones Rápidas</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  href={action.href}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-app)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon
                    size={24}
                    style={{
                      color: action.primary ? 'var(--primary-500)' : 'var(--text-muted)',
                    }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{action.title}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* System Overview */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Estado del Sistema
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Zona Horaria Principal</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>America/Bogota (UTC-5)</p>
              </div>
              <span className="badge badge-success">Activo</span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Autenticación JWT & RBAC</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Access & Refresh Tokens</p>
              </div>
              <span className="badge badge-success">Operativo</span>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Modo de Agendamiento</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Flexible con auto-sugerencia</p>
              </div>
              <span className="badge badge-info">Configurado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

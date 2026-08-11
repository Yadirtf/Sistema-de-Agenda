'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Users,
  UserCheck,
  Clock,
  RotateCcw,
  MessageSquare,
  Settings,
  LayoutDashboard,
  CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles.some((r) => r.name === 'Administrador');

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Citas', href: '/appointments', icon: Calendar },
    { name: 'Clientes', href: '/clients', icon: UserCheck },
    { name: 'Periodos', href: '/scheduling', icon: CalendarDays },
    { name: 'Seguimientos', href: '/follow-ups', icon: MessageSquare },
  ];

  if (isAdmin) {
    navItems.push(
      { name: 'Usuarios', href: '/users', icon: Users },
      { name: 'Configuración', href: '/settings', icon: Settings },
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '260px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Brand */}
        <div
          style={{
            height: '64px',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.2 }}>Agendamiento</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gestión Inteligente</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary-600)' : 'currentColor' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        {user && (
          <div
            style={{
              padding: '1rem',
              margin: '0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-500)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              {user.person?.firstName?.[0] || 'U'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.person?.firstName} {user.person?.lastName}
              </p>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.roles?.[0]?.name || 'Usuario'}
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

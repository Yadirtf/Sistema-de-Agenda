'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Menu, Sun, Moon, LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/api-client';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      logout();
      router.push('/login');
    }
  };

  return (
    <header
      style={{
        height: '64px',
        padding: '0 1.5rem',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <button
        onClick={onToggleSidebar}
        className="btn btn-ghost"
        style={{ padding: '0.5rem' }}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn btn-ghost"
          style={{ padding: '0.5rem', borderRadius: '50%' }}
          title="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Info / Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              className="badge badge-info"
              style={{ display: 'inline-flex', padding: '0.25rem 0.625rem' }}
            >
              {user.roles?.[0]?.name}
            </span>

            <button
              onClick={handleLogout}
              className="btn btn-ghost"
              style={{ color: 'var(--danger-text)', padding: '0.5rem 0.75rem' }}
              title="Cerrar sesión"
            >
              <LogOut size={18} />
              <span style={{ fontSize: '0.875rem' }}>Salir</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

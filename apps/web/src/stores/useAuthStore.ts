import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserWithRoles } from '@agendamiento/shared';

interface AuthState {
  user: UserWithRoles | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Permisos planos extraídos de todos los roles del usuario logueado */
  permissions: string[];
  setAuth: (user: UserWithRoles, accessToken: string, refreshToken: string) => void;
  updateUser: (user: UserWithRoles) => void;
  logout: () => void;
  /** Helper: verificar si el usuario tiene un permiso específico */
  hasPermission: (permission: string) => boolean;
  /** Helper: verificar si el usuario tiene un rol específico */
  hasRole: (role: string) => boolean;
}

/** Extrae los permisos únicos de todos los roles del usuario */
function extractPermissions(user: UserWithRoles): string[] {
  const perms = new Set<string>();
  user.roles?.forEach((role) => {
    role.permissions?.forEach((p) => perms.add(p.name));
  });
  return Array.from(perms);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      permissions: [],

      setAuth: (user, accessToken, refreshToken) => {
        const permissions = extractPermissions(user);
        set({ user, accessToken, refreshToken, isAuthenticated: true, permissions });
      },

      updateUser: (user) => {
        const permissions = extractPermissions(user);
        set({ user, permissions });
      },

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          permissions: [],
        }),

      hasPermission: (permission) => get().permissions.includes(permission),

      hasRole: (role) =>
        get().user?.roles?.some((r) => r.name === role) ?? false,
    }),
    {
      name: 'agendamiento-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

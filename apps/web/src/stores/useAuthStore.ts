import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserWithRoles } from '@agendamiento/shared';

interface AuthState {
  user: UserWithRoles | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserWithRoles, accessToken: string, refreshToken: string) => void;
  updateUser: (user: UserWithRoles) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      updateUser: (user) => set({ user }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'agendamiento-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

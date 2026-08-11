import { useAuthStore } from '@/stores/useAuthStore';
import { ApiResponse, ApiError } from '@agendamiento/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiClientError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const { accessToken, refreshToken, setAuth, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && refreshToken && !isRetry && !endpoint.includes('/auth/')) {
    try {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const resData: ApiResponse<{ accessToken: string; refreshToken: string }> =
          await refreshResponse.json();
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          setAuth(currentUser, resData.data.accessToken, resData.data.refreshToken);
          return fetchWithAuth<T>(endpoint, options, true);
        }
      } else {
        logout();
      }
    } catch {
      logout();
    }
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiError;
    throw new ApiClientError(
      errorData.message || 'Error en la petición',
      response.status,
      errorData.errors,
    );
  }

  // Si la respuesta incluye 'meta', es una respuesta paginada y devolvemos todo el objeto
  if (data && typeof data === 'object' && 'meta' in data) {
    return data as T;
  }

  const apiRes = data as ApiResponse<T>;
  return apiRes.data;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchWithAuth<T>(endpoint, { method: 'DELETE', ...options }),
};

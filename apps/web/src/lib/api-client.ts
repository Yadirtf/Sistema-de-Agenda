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
    ...(options.headers as Record<string, string>),
  };

  // Solo agregar Content-Type si hay un cuerpo en la petición
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

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

  // Respuestas sin cuerpo (204 No Content, 205 Reset Content)
  const hasBody =
    response.status !== 204 &&
    response.status !== 205 &&
    response.headers.get('content-length') !== '0' &&
    response.headers.get('content-type')?.includes('application/json');

  if (!response.ok) {
    // Intentar leer el error del cuerpo si lo hay
    if (hasBody) {
      const errorData = (await response.json()) as ApiError;
      throw new ApiClientError(
        errorData.message || 'Error en la petición',
        response.status,
        errorData.errors,
      );
    }
    throw new ApiClientError(
      `Error ${response.status}: ${response.statusText || 'Error en la petición'}`,
      response.status,
    );
  }

  // Sin cuerpo — devolver null (ej. DELETE 204)
  if (!hasBody) {
    return null as unknown as T;
  }

  const data = await response.json();

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

// ============================================================
// Constantes del sistema
// ============================================================

/** Nombres de los tipos de catálogo para el endpoint GET /catalogs/:type */
export const CATALOG_TYPES = {
  DOCUMENT_TYPES: 'document-types',
  ROLES: 'roles',
  PERSON_STATUSES: 'person-statuses',
  ENTRY_STATUSES: 'entry-statuses',
  PERIOD_STATUSES: 'period-statuses',
  APPOINTMENT_STATUSES: 'appointment-statuses',
  RESCHEDULING_REASONS: 'rescheduling-reasons',
  FOLLOW_UP_TYPES: 'follow-up-types',
  SCHEDULING_INTERVALS: 'scheduling-intervals',
} as const;

export type CatalogType = (typeof CATALOG_TYPES)[keyof typeof CATALOG_TYPES];

/** API endpoints base */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: '/users',
  PEOPLE: '/people',
  CLIENTS: '/clients',
  CLIENT_ENTRIES: '/client-entries',
  APPOINTMENTS: '/appointments',
  SCHEDULING_PERIODS: '/scheduling-periods',
  SCHEDULING_CONFIG: '/scheduling/config',
  SCHEDULING_INTERVALS: '/scheduling/intervals',
  RESCHEDULINGS: '/reschedulings',
  FOLLOW_UPS: '/follow-ups',
  CATALOGS: '/catalogs',
} as const;

/** Zona horaria del sistema */
export const SYSTEM_TIMEZONE = 'America/Bogota';

/** Paginación por defecto */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// Tipos base del sistema de agendamiento
// ============================================================

// --- Catálogos ---

export interface CatalogItem {
  id: number;
  name: string;
}

export interface CatalogItemWithDescription extends CatalogItem {
  description?: string | null;
}

export interface SchedulingInterval extends CatalogItem {
  days: number;
  description?: string | null;
}

// --- Permisos y Roles ---

export interface Permission {
  id: number;
  name: string;   // 'appointments:read'
  label: string;  // 'Ver citas'
  module: string; // 'appointments'
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions?: Permission[];
}

// --- Personas ---

export interface Person {
  id: number;
  documentTypeId: number;
  documentNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  statusId: number;
  createdAt: string;
  updatedAt: string;

  // Relaciones expandidas
  documentType?: CatalogItem;
  status?: CatalogItem;
}

// --- Usuarios ---

export interface User {
  id: number;
  personId: number;
  email: string;
  isActive: boolean;
  createdAt: string;

  // Relaciones expandidas
  person?: Person;
  roles?: Role[];
}

export interface UserWithRoles extends User {
  roles: Role[];
}

// --- Clientes ---

export interface Client {
  id: number;
  personId: number;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;

  // Relaciones expandidas
  person?: Person;
  schedulingConfig?: ClientSchedulingConfig | null;
  latestAppointment?: Appointment | null;
}

export interface ClientEntry {
  id: number;
  clientId: number;
  entryDate: string;
  statusId: number;
  createdAt: string;

  // Relaciones expandidas
  status?: CatalogItem;
}

export interface ClientSchedulingConfig {
  id: number;
  clientId: number;
  intervalId: number;
  notes?: string | null;
  createdAt: string;

  // Relaciones expandidas
  interval?: SchedulingInterval;
}

// --- Configuración global ---

export interface SchedulingConfig {
  id: number;
  defaultIntervalId: number;
  allowClientOverride: boolean;
  autoSuggestNext: boolean;
  respectEntryWeek: boolean;
  workingDays: number[];
  businessStartTime: string;
  businessEndTime: string;
  slotDurationMinutes: number;
  reminderDaysBefore: number;
  businessPhone?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relaciones expandidas
  defaultInterval?: SchedulingInterval;
}

// --- Periodos de agendamiento ---

export interface SchedulingPeriod {
  id: number;
  startDate: string;
  endDate: string;
  statusId: number;
  createdAt: string;

  // Relaciones expandidas
  status?: CatalogItem;
}

// --- Citas ---

export interface Appointment {
  id: number;
  clientId: number;
  professionalId?: number | null;
  clientEntryId?: number | null;
  schedulingPeriodId?: number | null;
  previousAppointmentId?: number | null;
  appointmentDate: string;
  statusId: number;
  notes?: string | null;
  confirmationToken?: string | null;
  tokenUsed: boolean;
  reminderSentAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relaciones expandidas
  client?: Client;
  professional?: Person | null;
  clientEntry?: ClientEntry | null;
  schedulingPeriod?: SchedulingPeriod | null;
  status?: CatalogItem;
}

export interface NextAppointmentSuggestion {
  suggestedDate: string;
  suggestedEnd: string;
  interval: SchedulingInterval;
  isClientOverride: boolean;
  entryWeek: number;
  weekStartDate?: string;
  weekEndDate?: string;
  firstEntryDate?: string | null;
  adjustedForEntryWeek: boolean;
  adjustedForWorkingDay: boolean;
}

export interface WeekCapacityItem {
  weekNumber: number;
  weekLabel: string;
  dayRangeLabel: string;
  clientCount: number;
  appointmentCount: number;
  status: 'optimal' | 'normal' | 'high' | 'overloaded';
}

export interface WeekCapacityResponse {
  totalActiveClients: number;
  totalAppointmentsThisMonth: number;
  currentMonthName: string;
  weeks: WeekCapacityItem[];
}

export interface DashboardStats {
  todayAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  activeClients: number;
}

export interface CompleteAppointmentResponse {
  completedAppointment: Appointment;
  nextAppointmentSuggestion: NextAppointmentSuggestion | null;
}

export interface YearlyHistoryItem {
  clientId: number;
  clientName: string;
  documentNumber: string;
  months: Record<number, {
    status: string;
    appointmentId: number;
    date: string;
  } | null>;
}

export interface YearlyHistoryResponse {
  year: number;
  data: YearlyHistoryItem[];
}

// --- Disponibilidad de Slots y Profesionales ---

export interface DaySlot {
  time: string; // "HH:MM"
  available: boolean;
  reason?: string; // "Ocupado" | "Fuera de Horario"
}

export interface DaySlotsResponse {
  date: string;
  isWorkingDay: boolean;
  workingDays: number[];
  businessStartTime: string;
  businessEndTime: string;
  slotDurationMinutes: number;
  slots: DaySlot[];
}

export interface ProfessionalItem {
  id: number; // personId
  name: string;
  documentNumber: string;
  roleName: string;
}

// --- Reagendamientos ---

export interface Rescheduling {
  id: number;
  originalAppointmentId: number;
  newAppointmentId: number;
  reasonId: number;
  performedBy?: number | null;
  createdAt: string;

  // Relaciones expandidas
  originalAppointment?: Appointment;
  newAppointment?: Appointment;
  reason?: CatalogItemWithDescription;
  performedByUser?: User | null;
}

// --- Seguimientos ---

export interface FollowUp {
  id: number;
  clientId: number;
  appointmentId?: number | null;
  performedBy?: number | null;
  typeId: number;
  description?: string | null;
  createdAt: string;

  // Relaciones expandidas
  client?: Client;
  appointment?: Appointment | null;
  performedByUser?: User | null;
  type?: CatalogItem;
}

// --- API Responses ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

// --- Auth ---

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserWithRoles;
}

export interface TokenPayload {
  sub: number;
  personId: number;       // person_id del usuario (para filtro de citas del Profesional)
  email: string;
  roles: string[];        // nombres de roles: ['Administrador', 'Asistente', ...]
  permissions: string[];  // permisos planos: ['appointments:read', 'users:create', ...]
  iat?: number;
  exp?: number;
}

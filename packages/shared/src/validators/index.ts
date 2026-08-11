import { z } from 'zod';

// ============================================================
// Schemas de validación compartidos (Zod)
// ============================================================

// --- Auth ---

export const loginSchema = z.object({
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .max(150, 'El correo no puede exceder 150 caracteres'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña no puede exceder 100 caracteres'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

// --- Personas ---

export const createPersonSchema = z.object({
  documentTypeId: z.number().int().positive('El tipo de documento es requerido'),
  documentNumber: z
    .string()
    .min(1, 'El número de documento es requerido')
    .max(50, 'El número de documento no puede exceder 50 caracteres'),
  firstName: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  middleName: z
    .string()
    .max(100, 'El segundo nombre no puede exceder 100 caracteres')
    .nullable()
    .optional(),
  lastName: z
    .string()
    .min(1, 'El apellido es requerido')
    .max(100, 'El apellido no puede exceder 100 caracteres'),
  secondLastName: z
    .string()
    .max(100, 'El segundo apellido no puede exceder 100 caracteres')
    .nullable()
    .optional(),
  birthDate: z.string().date('La fecha de nacimiento no es válida').nullable().optional(),
  phone: z
    .string()
    .max(30, 'El teléfono no puede exceder 30 caracteres')
    .nullable()
    .optional(),
  email: z
    .string()
    .email('El correo electrónico no es válido')
    .max(150, 'El correo no puede exceder 150 caracteres')
    .nullable()
    .optional(),
  statusId: z.number().int().positive('El estado es requerido'),
});

export const updatePersonSchema = createPersonSchema.partial();

// --- Clientes ---

export const createClientSchema = z.object({
  personId: z.number().int().positive('La persona es requerida').optional(),
  // Si no viene personId, se crea persona con estos datos
  person: createPersonSchema.optional(),
});

export const createClientEntrySchema = z.object({
  clientId: z.number().int().positive('El cliente es requerido'),
  entryDate: z.string().date('La fecha de ingreso no es válida'),
  statusId: z.number().int().positive('El estado es requerido'),
});

// --- Configuración de agendamiento ---

export const updateSchedulingConfigSchema = z.object({
  defaultIntervalId: z.number().int().positive().optional(),
  allowClientOverride: z.boolean().optional(),
  autoSuggestNext: z.boolean().optional(),
  respectEntryWeek: z.boolean().optional(),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  businessStartTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)')
    .optional(),
  businessEndTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)')
    .optional(),
  slotDurationMinutes: z.number().int().min(5).max(480).optional(),
});

export const upsertClientSchedulingConfigSchema = z.object({
  intervalId: z.number().int().positive('El intervalo es requerido'),
  notes: z.string().max(500).nullable().optional(),
});

// --- Citas ---

export const createAppointmentSchema = z.object({
  clientId: z.number().int().positive('El cliente es requerido'),
  professionalId: z.number().int().positive().nullable().optional(),
  clientEntryId: z.number().int().positive().nullable().optional(),
  schedulingPeriodId: z.number().int().positive().nullable().optional(),
  previousAppointmentId: z.number().int().positive().nullable().optional(),
  appointmentDate: z.string().datetime('La fecha de la cita no es válida'),
  statusId: z.number().int().positive('El estado de la cita es requerido'),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

// --- Reagendamientos ---

export const createReschedulingSchema = z.object({
  originalAppointmentId: z.number().int().positive('La cita original es requerida'),
  newAppointmentDate: z.string().datetime('La nueva fecha no es válida'),
  reasonId: z.number().int().positive('El motivo es requerido'),
  notes: z.string().max(1000).nullable().optional(),
});

// --- Seguimientos ---

export const createFollowUpSchema = z.object({
  clientId: z.number().int().positive('El cliente es requerido'),
  appointmentId: z.number().int().positive().nullable().optional(),
  typeId: z.number().int().positive('El tipo de seguimiento es requerido'),
  description: z.string().max(2000).nullable().optional(),
});

// --- Periodos ---

export const createSchedulingPeriodSchema = z.object({
  startDate: z.string().date('La fecha de inicio no es válida'),
  endDate: z.string().date('La fecha de fin no es válida'),
  statusId: z.number().int().positive('El estado es requerido'),
});

// --- Usuarios ---

export const createUserSchema = z.object({
  personId: z.number().int().positive('La persona es requerida'),
  email: z.string().email('El correo electrónico no es válido').max(150),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100),
  roleIds: z
    .array(z.number().int().positive())
    .min(1, 'Debe asignar al menos un rol'),
});

// --- Tipos inferidos ---

export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type CreatePersonDto = z.infer<typeof createPersonSchema>;
export type UpdatePersonDto = z.infer<typeof updatePersonSchema>;
export type CreateClientDto = z.infer<typeof createClientSchema>;
export type CreateClientEntryDto = z.infer<typeof createClientEntrySchema>;
export type UpdateSchedulingConfigDto = z.infer<typeof updateSchedulingConfigSchema>;
export type UpsertClientSchedulingConfigDto = z.infer<typeof upsertClientSchedulingConfigSchema>;
export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
export type CreateReschedulingDto = z.infer<typeof createReschedulingSchema>;
export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
export type CreateSchedulingPeriodDto = z.infer<typeof createSchedulingPeriodSchema>;
export type CreateUserDto = z.infer<typeof createUserSchema>;

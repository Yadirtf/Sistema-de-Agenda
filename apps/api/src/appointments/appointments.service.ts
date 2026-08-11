import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import type {
  Appointment,
  PaginatedResponse,
  NextAppointmentSuggestion,
  CompleteAppointmentResponse,
  YearlyHistoryResponse,
  YearlyHistoryItem,
} from '@agendamiento/shared';

import {
  calculateEntryWeekNumber,
  getRecommendedWeekRange,
} from '../common/helpers/client-week-helper';

/**
 * Inclusión base para todas las queries de citas.
 * Centralizado para evitar repetición y garantizar
 * que el mapper siempre recibe la misma forma.
 */
const APPOINTMENT_INCLUDE = {
  client: { include: { person: { include: { documentType: true, status: true } } } },
  professional: { include: { documentType: true, status: true } },
  clientEntry: { include: { status: true } },
  schedulingPeriod: { include: { status: true } },
  status: true,
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulingService: SchedulingService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────

  async findAll(query?: {
    clientId?: number;
    statusId?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    perPage?: number;
    search?: string;
  }): Promise<PaginatedResponse<Appointment>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (query?.clientId) where.clientId = Number(query.clientId);
    if (query?.statusId) where.statusId = Number(query.statusId);

    if (query?.search) {
      where.client = {
        person: {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { documentNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      };
    }

    if (query?.dateFrom || query?.dateTo) {
      where.appointmentDate = {};
      if (query?.dateFrom) {
        const d = new Date(query.dateFrom);
        if (!isNaN(d.getTime())) where.appointmentDate.gte = d;
      }
      if (query?.dateTo) {
        const d = new Date(query.dateTo);
        if (!isNaN(d.getTime())) where.appointmentDate.lte = d;
      }
      // Si el objeto quedó vacío por fechas inválidas, lo eliminamos
      if (Object.keys(where.appointmentDate).length === 0) {
        delete where.appointmentDate;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { appointmentDate: 'asc' },
        include: APPOINTMENT_INCLUDE,
      }),
    ]);

    return {
      success: true,
      data: items.map((a) => this.mapAppointment(a)),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findOne(id: number): Promise<Appointment> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });

    if (!appt) throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    return this.mapAppointment(appt);
  }

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    // Verificar existencia del cliente
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: { person: true },
    });
    if (!client) throw new BadRequestException(`Cliente con ID ${dto.clientId} no existe`);

    // Regla de Negocio: Un cliente no puede tener dos citas "activas" simultáneamente.
    // Se considera activa cualquier cita que NO esté en un estado final.
    const activeAppointment = await this.prisma.appointment.findFirst({
      where: {
        clientId: dto.clientId,
        status: {
          name: {
            notIn: ['Completada', 'Cancelada', 'No Asistió'],
          },
        },
      },
      include: { status: true },
    });

    if (activeAppointment) {
      throw new BadRequestException(
        `El cliente ${client.person.firstName} ${client.person.lastName} ya tiene una cita activa en estado "${activeAppointment.status.name}". Debe finalizarla o cancelarla antes de agendar una nueva.`,
      );
    }

    // Resolver el estado: si no se pasa statusId, usar 'Agendada' como estado inicial por defecto
    let resolvedStatusId = dto.statusId;
    if (!resolvedStatusId) {
      const agendadaStatus = await this.prisma.appointmentStatus.findFirst({
        where: { name: 'Agendada' },
      });
      if (!agendadaStatus) {
        throw new BadRequestException('No se encontró el estado inicial "Agendada" en la base de datos');
      }
      resolvedStatusId = Number(agendadaStatus.id);
    }

    const created = await this.prisma.appointment.create({
      data: {
        clientId: dto.clientId,
        professionalId: dto.professionalId ?? null,
        clientEntryId: dto.clientEntryId ?? null,
        schedulingPeriodId: dto.schedulingPeriodId ?? null,
        previousAppointmentId: dto.previousAppointmentId ?? null,
        appointmentDate: new Date(dto.appointmentDate),
        statusId: resolvedStatusId,
        notes: dto.notes ?? null,
        confirmationToken: randomUUID(),
      },
      include: APPOINTMENT_INCLUDE,
    });

    return this.mapAppointment(created);
  }

  async update(id: number, dto: UpdateAppointmentDto): Promise<Appointment> {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
      include: { status: true },
    });

    if (!existing) throw new NotFoundException(`Cita con ID ${id} no encontrada`);

    const finalStatuses = ['Completada', 'Cancelada', 'No Asistió'];
    if (existing.status && finalStatuses.includes(existing.status.name)) {
      throw new BadRequestException(
        'No se puede actualizar una cita que ya ha sido finalizada (Completada, Cancelada o No Asistió)',
      );
    }

    const data: any = {};
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.professionalId !== undefined) data.professionalId = dto.professionalId;
    if (dto.clientEntryId !== undefined) data.clientEntryId = dto.clientEntryId;
    if (dto.schedulingPeriodId !== undefined) data.schedulingPeriodId = dto.schedulingPeriodId;
    if (dto.appointmentDate !== undefined) data.appointmentDate = new Date(dto.appointmentDate);
    if (dto.statusId !== undefined) data.statusId = dto.statusId;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.appointment.update({
      where: { id },
      data,
      include: APPOINTMENT_INCLUDE,
    });

    return this.mapAppointment(updated);
  }

  async getYearlyHistory(query: {
    year: number;
    clientId?: number;
    search?: string;
  }): Promise<YearlyHistoryResponse> {
    const year = Number(query.year) || new Date().getFullYear();
    // Usar offset de Bogotá para delimitar el año correctamente
    const startDate = new Date(`${year}-01-01T00:00:00.000-05:00`);
    const endDate = new Date(`${year}-12-31T23:59:59.999-05:00`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('El año proporcionado no es válido');
    }

    const where: any = {
      appointmentDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        name: {
          in: ['Sin agendar', 'Completada', 'Cancelada', 'No Asistió'],
        },
      },
    };

    if (query.clientId) where.clientId = Number(query.clientId);
    if (query.search) {
      where.client = {
        person: {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { documentNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: {
        client: { include: { person: true } },
        status: true,
      },
      orderBy: { appointmentDate: 'asc' },
    });

    const clientHistoryMap = new Map<number, YearlyHistoryItem>();

    for (const appt of appointments) {
      const clientId = Number(appt.clientId);
      if (!clientHistoryMap.has(clientId)) {
        const person = appt.client!.person;
        clientHistoryMap.set(clientId, {
          clientId,
          clientName: `${person.firstName} ${person.lastName}`,
          documentNumber: person.documentNumber,
          months: {
            1: null, 2: null, 3: null, 4: null, 5: null, 6: null,
            7: null, 8: null, 9: null, 10: null, 11: null, 12: null,
          },
        });
      }

      const historyItem = clientHistoryMap.get(clientId)!;
      const month = new Date(appt.appointmentDate).getMonth() + 1;

      historyItem.months[month] = {
        status: appt.status.name,
        appointmentId: Number(appt.id),
        date: appt.appointmentDate.toISOString(),
      };
    }

    return {
      year,
      data: Array.from(clientHistoryMap.values()),
    };
  }

  /**
   * Actualiza el estado de una cita y registra una nota en el historial (FollowUp).
   */
  async updateStatus(
    id: number,
    statusId: number,
    note?: string,
    userId?: number,
  ): Promise<CompleteAppointmentResponse> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        status: true,
        client: true,
      },
    });

    if (!appt) throw new NotFoundException(`Cita con ID ${id} no encontrada`);

    // 1. Actualizar el estado de la cita
    const updatedAppt = await this.prisma.appointment.update({
      where: { id },
      data: { statusId },
      include: APPOINTMENT_INCLUDE,
    });

    // 2. Registrar el cambio en FollowUp si hay una nota o para dejar constancia
    const followUpType = await this.prisma.followUpType.findFirst({
      where: { name: 'Cambio de Estado' },
    });

    if (followUpType) {
      const newStatus = await this.prisma.appointmentStatus.findUnique({ where: { id: BigInt(statusId) } });
      const statusName = newStatus?.name || `ID ${statusId}`;
      const description = note
        ? `Cambio de estado a "${statusName}". Nota: ${note}`
        : `Cambio de estado a "${statusName}" sin nota adicional.`;

      await this.prisma.followUp.create({
        data: {
          clientId: appt.clientId,
          appointmentId: id,
          performedBy: userId || null,
          typeId: followUpType.id,
          description,
        },
      });
    }

    // 3. Si el estado es "Completada", manejar la auto-sugerencia
    const completedStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: 'Completada' },
    });

    let suggestion: NextAppointmentSuggestion | null = null;
    if (completedStatus && BigInt(statusId) === completedStatus.id) {
      // Recargar la cita con las relaciones necesarias para el cálculo de sugerencia
      const fullAppt = await this.prisma.appointment.findUnique({
        where: { id },
        include: {
          ...APPOINTMENT_INCLUDE,
          client: {
            include: {
              person: { include: { documentType: true, status: true } },
              entries: { orderBy: { entryDate: 'asc' }, take: 1 },
              schedulingConfig: { include: { interval: true } },
            },
          },
        },
      });
      suggestion = await this.calculateNextSuggestion(fullAppt);
    }

    return {
      completedAppointment: this.mapAppointment(updatedAppt),
      nextAppointmentSuggestion: suggestion,
    };
  }

  // ─── Completar cita + Auto-sugerencia ──────────────────────

  /**
   * Marca una cita como "Completada" (statusId=3 en el seed)
   * y calcula la sugerencia de la próxima cita si la config global lo permite.
   *
   * Algoritmo de auto-sugerencia:
   * 1. Obtener el intervalo (cliente override > global default).
   * 2. Sumar los días del intervalo a la fecha de la cita completada.
   * 3. Si respectEntryWeek=true, ajustar al mismo día de la semana del mes
   *    en que el cliente hizo su ingreso original.
   * 4. Ajustar a un día laboral válido (si cae en no-laboral, mover adelante).
   * 5. Asignar horario dentro del rango [businessStartTime, businessEndTime].
   */
  async completeAppointment(id: number): Promise<CompleteAppointmentResponse> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        ...APPOINTMENT_INCLUDE,
        client: {
          include: {
            person: { include: { documentType: true, status: true } },
            entries: { orderBy: { entryDate: 'asc' }, take: 1 },
            schedulingConfig: { include: { interval: true } },
          },
        },
      },
    });

    if (!appt) throw new NotFoundException(`Cita con ID ${id} no encontrada`);

    // Buscar el ID del status "Completada"
    const completedStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: 'Completada' },
    });

    if (!completedStatus) {
      throw new BadRequestException('No se encontró el estado "Completada" en la base de datos');
    }

    // Actualizar el status de la cita
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { statusId: completedStatus.id },
      include: APPOINTMENT_INCLUDE,
    });

    // Calcular la sugerencia de la próxima cita
    const suggestion = await this.calculateNextSuggestion(appt);

    return {
      completedAppointment: this.mapAppointment(updated),
      nextAppointmentSuggestion: suggestion,
    };
  }

  async getPendingReminders(): Promise<Appointment[]> {
    const config = await this.schedulingService.getConfig();
    const days = config.reminderDaysBefore || 1;

    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);

    // Buscar citas agendadas dentro del rango que no hayan sido notificadas
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { name: 'Agendada' },
        appointmentDate: {
          gte: now,
          lte: targetDate,
        },
        reminderSentAt: null,
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { appointmentDate: 'asc' },
    });

    return appointments.map((a) => this.mapAppointment(a));
  }

  async markReminderAsSent(id: number): Promise<void> {
    await this.prisma.appointment.update({
      where: { id },
      data: { reminderSentAt: new Date() },
    });
  }

  async findByToken(token: string): Promise<any> {
    const appt = await this.prisma.appointment.findUnique({
      where: { confirmationToken: token },
      include: APPOINTMENT_INCLUDE,
    });

    if (!appt) throw new NotFoundException('Enlace de confirmación inválido');
    if (appt.tokenUsed) throw new BadRequestException('Este enlace ya ha sido utilizado');

    const config = await this.schedulingService.getConfig();

    return {
      appointment: this.mapAppointment(appt),
      businessPhone: config.businessPhone,
    };
  }

  async processConfirmation(token: string, action: 'confirm' | 'cancel'): Promise<void> {
    const result = await this.findByToken(token);
    const appt = result.appointment;

    const statusName = action === 'confirm' ? 'Confirmada' : 'Cancelada';
    const targetStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: statusName },
    });

    if (!targetStatus) throw new BadRequestException(`Estado ${statusName} no encontrado`);

    await this.prisma.$transaction([
      this.prisma.appointment.update({
        where: { id: BigInt(appt.id) },
        data: {
          statusId: targetStatus.id,
          tokenUsed: true,
        },
      }),
      this.prisma.followUp.create({
        data: {
          clientId: BigInt(appt.clientId),
          appointmentId: BigInt(appt.id),
          typeId: (await this.prisma.followUpType.findFirst({ where: { name: 'Cambio de Estado' } }))?.id || 1n,
          description: `Cita ${action === 'confirm' ? 'Confirmada' : 'Cancelada'} por el cliente mediante enlace público.`,
        },
      }),
    ]);
  }

  /**
   * Calcula la sugerencia de próxima cita para un cliente dado,
   * basándose en su última cita completada o la fecha actual.
   */
  async suggestNext(clientId: number): Promise<NextAppointmentSuggestion | null> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        entries: { orderBy: { entryDate: 'asc' }, take: 1 },
        schedulingConfig: { include: { interval: true } },
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          take: 1,
          include: { status: true },
        },
      },
    });

    if (!client) throw new NotFoundException(`Cliente con ID ${clientId} no encontrado`);

    const lastAppt = client.appointments[0];
    if (!lastAppt) {
      // No tiene citas previas, sugerir desde hoy
      return this.calculateNextSuggestion(null, client);
    }

    return this.calculateNextSuggestion(lastAppt, client);
  }

  // ─── Lógica interna de auto-sugerencia ─────────────────────

  private async calculateNextSuggestion(
    lastAppt: any,
    clientData?: any,
  ): Promise<NextAppointmentSuggestion | null> {
    const config = await this.schedulingService.getConfig();

    if (!config.autoSuggestNext) return null;

    // Resolver el cliente
    const client = clientData ?? lastAppt?.client;
    if (!client) return null;

    // Determinar intervalo: override del cliente > default global
    const clientConfig = client.schedulingConfig;
    const isClientOverride = !!clientConfig;
    const interval = isClientOverride
      ? clientConfig.interval
      : config.defaultInterval;

    if (!interval) return null;

    // Fecha base: fecha de la última cita, o fecha actual si no hay cita previa
    const baseDate = lastAppt
      ? new Date(lastAppt.appointmentDate)
      : new Date();

    // Paso 1: sumar días del intervalo
    const suggestedDate = new Date(baseDate);
    suggestedDate.setDate(suggestedDate.getDate() + interval.days);

    // Paso 2: ajustar por semana de ingreso (si está habilitado)
    let entryWeek = 1;
    let adjustedForEntryWeek = false;
    const firstEntry = client.entries?.[0];
    let firstEntryDateStr: string | null = null;

    if (firstEntry) {
      const entryDate = new Date(firstEntry.entryDate);
      firstEntryDateStr = entryDate.toISOString().split('T')[0];
      entryWeek = calculateEntryWeekNumber(entryDate);

      if (config.respectEntryWeek) {
        // Calcular día aproximado de la semana objetivo en el mes sugerido
        const targetDay = (entryWeek - 1) * 7 + (entryDate.getDay() || 7);
        const currentDay = suggestedDate.getDate();

        if (Math.abs(currentDay - targetDay) > 3 && targetDay > 0 && targetDay <= 28) {
          suggestedDate.setDate(targetDay);
          adjustedForEntryWeek = true;
        }
      }
    }

    // Paso 3: ajustar a día laboral válido
    let adjustedForWorkingDay = false;
    const maxIterations = 7; // Evitar loop infinito
    for (let i = 0; i < maxIterations; i++) {
      const dayOfWeek = suggestedDate.getDay();
      if (config.workingDays.includes(dayOfWeek)) break;
      suggestedDate.setDate(suggestedDate.getDate() + 1);
      adjustedForWorkingDay = true;
    }

    // Paso 4: asignar hora de inicio del negocio
    const [startH, startM] = config.businessStartTime.split(':').map(Number);
    suggestedDate.setHours(startH, startM, 0, 0);

    const suggestedEnd = new Date(suggestedDate);
    suggestedEnd.setMinutes(suggestedEnd.getMinutes() + config.slotDurationMinutes);

    const weekRange = getRecommendedWeekRange(suggestedDate, entryWeek);

    return {
      suggestedDate: suggestedDate.toISOString(),
      suggestedEnd: suggestedEnd.toISOString(),
      interval: {
        id: Number(interval.id),
        name: interval.name,
        days: interval.days,
        description: interval.description ?? null,
      },
      isClientOverride,
      entryWeek,
      weekStartDate: weekRange.startDateStr,
      weekEndDate: weekRange.endDateStr,
      firstEntryDate: firstEntryDateStr,
      adjustedForEntryWeek,
      adjustedForWorkingDay,
    };
  }

  // ─── Mapper ────────────────────────────────────────────────

  private mapAppointment(raw: any): Appointment {
    return {
      id: Number(raw.id),
      clientId: Number(raw.clientId),
      professionalId: raw.professionalId ? Number(raw.professionalId) : null,
      clientEntryId: raw.clientEntryId ? Number(raw.clientEntryId) : null,
      schedulingPeriodId: raw.schedulingPeriodId ? Number(raw.schedulingPeriodId) : null,
      previousAppointmentId: raw.previousAppointmentId ? Number(raw.previousAppointmentId) : null,
      appointmentDate: raw.appointmentDate.toISOString(),
      statusId: Number(raw.statusId),
      notes: raw.notes,
      confirmationToken: raw.confirmationToken,
      tokenUsed: raw.tokenUsed,
      reminderSentAt: raw.reminderSentAt ? raw.reminderSentAt.toISOString() : null,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      client: raw.client
        ? {
            id: Number(raw.client.id),
            personId: Number(raw.client.personId),
            createdAt: raw.client.createdAt.toISOString(),
            person: raw.client.person
              ? {
                  id: Number(raw.client.person.id),
                  documentTypeId: Number(raw.client.person.documentTypeId),
                  documentNumber: raw.client.person.documentNumber,
                  firstName: raw.client.person.firstName,
                  middleName: raw.client.person.middleName,
                  lastName: raw.client.person.lastName,
                  secondLastName: raw.client.person.secondLastName,
                  birthDate: raw.client.person.birthDate?.toISOString() ?? null,
                  phone: raw.client.person.phone,
                  email: raw.client.person.email,
                  statusId: Number(raw.client.person.statusId),
                  createdAt: raw.client.person.createdAt.toISOString(),
                  updatedAt: raw.client.person.updatedAt.toISOString(),
                  documentType: raw.client.person.documentType
                    ? { id: Number(raw.client.person.documentType.id), name: raw.client.person.documentType.name }
                    : undefined,
                  status: raw.client.person.status
                    ? { id: Number(raw.client.person.status.id), name: raw.client.person.status.name }
                    : undefined,
                }
              : undefined,
          }
        : undefined,
      professional: raw.professional
        ? {
            id: Number(raw.professional.id),
            documentTypeId: Number(raw.professional.documentTypeId),
            documentNumber: raw.professional.documentNumber,
            firstName: raw.professional.firstName,
            middleName: raw.professional.middleName,
            lastName: raw.professional.lastName,
            secondLastName: raw.professional.secondLastName,
            birthDate: raw.professional.birthDate?.toISOString() ?? null,
            phone: raw.professional.phone,
            email: raw.professional.email,
            statusId: Number(raw.professional.statusId),
            createdAt: raw.professional.createdAt.toISOString(),
            updatedAt: raw.professional.updatedAt.toISOString(),
          }
        : null,
      clientEntry: raw.clientEntry
        ? {
            id: Number(raw.clientEntry.id),
            clientId: Number(raw.clientEntry.clientId),
            entryDate: raw.clientEntry.entryDate.toISOString(),
            statusId: Number(raw.clientEntry.statusId),
            createdAt: raw.clientEntry.createdAt.toISOString(),
            status: raw.clientEntry.status
              ? { id: Number(raw.clientEntry.status.id), name: raw.clientEntry.status.name }
              : undefined,
          }
        : null,
      schedulingPeriod: raw.schedulingPeriod
        ? {
            id: Number(raw.schedulingPeriod.id),
            startDate: raw.schedulingPeriod.startDate.toISOString(),
            endDate: raw.schedulingPeriod.endDate.toISOString(),
            statusId: Number(raw.schedulingPeriod.statusId),
            createdAt: raw.schedulingPeriod.createdAt.toISOString(),
            status: raw.schedulingPeriod.status
              ? { id: Number(raw.schedulingPeriod.status.id), name: raw.schedulingPeriod.status.name }
              : undefined,
          }
        : null,
      status: raw.status
        ? { id: Number(raw.status.id), name: raw.status.name }
        : undefined,
    };
  }
}

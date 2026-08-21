import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service'; // Still needed for some direct calls if repository doesn't have them
import { SchedulingService } from '../scheduling/scheduling.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentMapper } from './mappers/appointment.mapper';
import { AppointmentStatusChangedEvent } from './events/appointment-status-changed.event';
import { calculateNextSuggestionLogic } from '../scheduling/logic/scheduling.logic';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import type {
  Appointment,
  PaginatedResponse,
  NextAppointmentSuggestion,
  CompleteAppointmentResponse,
  YearlyHistoryResponse,
  YearlyHistoryItem,
  DaySlot,
  DaySlotsResponse,
  ProfessionalItem,
} from '@agendamiento/shared';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: AppointmentsRepository,
    private readonly schedulingService: SchedulingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

    const where: any = {
      client: { isDeleted: false }
    };
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
      if (Object.keys(where.appointmentDate).length === 0) {
        delete where.appointmentDate;
      }
    }

    const { items, total } = await this.repository.findAll(where, skip, perPage);

    return {
      success: true,
      data: items.map((a) => AppointmentMapper.toDto(a)),
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findOne(id: number): Promise<Appointment> {
    const appt = await this.repository.findById(id);
    if (!appt || appt.client?.isDeleted) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada o pertenece a un cliente en la papelera`);
    }
    return AppointmentMapper.toDto(appt);
  }

  async create(dto: CreateAppointmentDto): Promise<Appointment> {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: { person: true },
    });
    if (!client) throw new BadRequestException(`Cliente con ID ${dto.clientId} no existe`);

    if (client.isDeleted) {
      throw new BadRequestException(
        `No se puede agendar una cita para el cliente ${client.person.firstName} ${client.person.lastName} porque se encuentra en la papelera de reciclaje.`,
      );
    }

    const activeAppointment = await this.repository.findFirstActive(dto.clientId);
    if (activeAppointment) {
      throw new BadRequestException(
        `El cliente ${client.person.firstName} ${client.person.lastName} ya tiene una cita activa en estado "${activeAppointment.status.name}". Debe finalizarla o cancelarla antes de agendar una nueva.`,
      );
    }

    const appointmentDateObj = new Date(dto.appointmentDate);

    // 1. Validar que el cliente no tenga ya una cita en esta misma fecha y hora
    const clientSameTime = await this.prisma.appointment.findFirst({
      where: {
        clientId: BigInt(dto.clientId),
        appointmentDate: appointmentDateObj,
        status: {
          name: { notIn: ['Cancelada', 'No Asistió'] },
        },
      },
    });
    if (clientSameTime) {
      throw new BadRequestException('El cliente ya tiene una cita programada para esta misma fecha y hora.');
    }

    // 2. Si se asigna profesional, validar que no tenga otra cita asignada en este mismo horario
    if (dto.professionalId) {
      const profSameTime = await this.prisma.appointment.findFirst({
        where: {
          professionalId: BigInt(dto.professionalId),
          appointmentDate: appointmentDateObj,
          status: {
            name: { notIn: ['Cancelada', 'No Asistió'] },
          },
        },
      });
      if (profSameTime) {
        throw new BadRequestException('El profesional seleccionado ya tiene una cita asignada en este horario.');
      }
    }

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

    const created = await this.repository.create({
      clientId: dto.clientId,
      professionalId: dto.professionalId ?? null,
      clientEntryId: dto.clientEntryId ?? null,
      schedulingPeriodId: dto.schedulingPeriodId ?? null,
      previousAppointmentId: dto.previousAppointmentId ?? null,
      appointmentDate: new Date(dto.appointmentDate),
      statusId: resolvedStatusId,
      notes: dto.notes ?? null,
      confirmationToken: randomUUID(),
    });

    const appointmentDto = AppointmentMapper.toDto(created);

    // Emitir evento de creación
    this.eventEmitter.emit('appointment.created', appointmentDto);

    return appointmentDto;
  }

  async update(id: number, dto: UpdateAppointmentDto): Promise<Appointment> {
    const existing = await this.repository.findById(id);
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

    const updated = await this.repository.update(id, data);
    const appointmentDto = AppointmentMapper.toDto(updated);

    // Emitir evento de actualización
    this.eventEmitter.emit('appointment.updated', appointmentDto);

    return appointmentDto;
  }

  async getYearlyHistory(query: {
    year: number;
    clientId?: number;
    search?: string;
  }): Promise<YearlyHistoryResponse> {
    const year = Number(query.year) || new Date().getFullYear();
    const startDate = new Date(`${year}-01-01T00:00:00.000-05:00`);
    const endDate = new Date(`${year}-12-31T23:59:59.999-05:00`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('El año proporcionado no es válido');
    }

    const where: any = {
      appointmentDate: { gte: startDate, lte: endDate },
      status: {
        name: { in: ['Sin agendar', 'Completada', 'Cancelada', 'No Asistió'] },
      },
      client: { isDeleted: false },
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

    const appointments = await this.repository.findYearly(where);
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

    return { year, data: Array.from(clientHistoryMap.values()) };
  }

  async updateStatus(
    id: number,
    statusId: number,
    note?: string,
    userId?: number,
  ): Promise<CompleteAppointmentResponse> {
    const appt = await this.repository.findById(id);
    if (!appt) throw new NotFoundException(`Cita con ID ${id} no encontrada`);

    const updatedAppt = await this.repository.update(id, { statusId });
    const newStatus = await this.prisma.appointmentStatus.findUnique({ where: { id: BigInt(statusId) } });

    // Emitir evento para que otros módulos (como FollowUps) reaccionen
    this.eventEmitter.emit(
      'appointment.status.changed',
      new AppointmentStatusChangedEvent(
        id,
        Number(appt.clientId),
        statusId,
        newStatus?.name || `ID ${statusId}`,
        note,
        userId,
      ),
    );

    let suggestion: NextAppointmentSuggestion | null = null;
    if (newStatus?.name === 'Completada') {
      const fullAppt = await this.repository.findFullForSuggestion(id);
      const config = await this.schedulingService.getConfig();
      suggestion = calculateNextSuggestionLogic({ lastAppt: fullAppt, client: fullAppt?.client, config });
    }

    return {
      completedAppointment: AppointmentMapper.toDto(updatedAppt),
      nextAppointmentSuggestion: suggestion,
    };
  }

  async completeAppointment(id: number): Promise<CompleteAppointmentResponse> {
    const completedStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: 'Completada' },
    });
    if (!completedStatus) throw new BadRequestException('No se encontró el estado "Completada"');

    return this.updateStatus(id, Number(completedStatus.id));
  }

  async getPendingReminders(): Promise<Appointment[]> {
    const config = await this.schedulingService.getConfig();
    const days = config.reminderDaysBefore || 1;
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const appointments = await this.repository.findPendingReminders(now, targetDate, twentyFourHoursAgo);
    return appointments.map((a) => AppointmentMapper.toDto(a));
  }

  async markReminderAsSent(id: number): Promise<void> {
    await this.repository.update(id, { reminderSentAt: new Date() });
  }

  async findByToken(token: string): Promise<any> {
    const appt = await this.repository.findByToken(token);
    if (!appt) throw new NotFoundException('Enlace de confirmación inválido');
    if (appt.tokenUsed) throw new BadRequestException('Este enlace ya ha sido utilizado');

    const config = await this.schedulingService.getConfig();
    return {
      appointment: AppointmentMapper.toDto(appt),
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

    await this.repository.runTransaction([
      this.prisma.appointment.update({
        where: { id: BigInt(appt.id) },
        data: { statusId: targetStatus.id, tokenUsed: true },
      }),
      // Nota: El FollowUp se creará mediante el evento si decidimos emitirlo aquí también
    ]);

    this.eventEmitter.emit(
      'appointment.status.changed',
      new AppointmentStatusChangedEvent(
        Number(appt.id),
        Number(appt.clientId),
        Number(targetStatus.id),
        statusName,
        `Cita ${action === 'confirm' ? 'Confirmada' : 'Cancelada'} por el cliente mediante enlace público.`,
      ),
    );
  }

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
    const config = await this.schedulingService.getConfig();

    return calculateNextSuggestionLogic({ lastAppt, client, config });
  }

  async getProfessionals(): Promise<ProfessionalItem[]> {
    const users = await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: { in: ['Profesional', 'Administrador'] },
            },
          },
        },
        person: {
          status: { name: 'Activo' },
        },
      },
      include: {
        person: true,
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: {
        person: { firstName: 'asc' },
      },
    });

    return users.map((u) => ({
      id: Number(u.person.id),
      name: `${u.person.firstName} ${u.person.lastName}`,
      documentNumber: u.person.documentNumber,
      roleName: u.userRoles.map((ur) => ur.role.name).join(', '),
    }));
  }

  async getDaySlots(
    dateStr: string,
    professionalId?: number,
    clientId?: number,
  ): Promise<DaySlotsResponse> {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('El formato de fecha debe ser YYYY-MM-DD');
    }

    const config = await this.schedulingService.getConfig();
    const startTimeStr = config.businessStartTime || '08:00';
    const endTimeStr = config.businessEndTime || '18:00';
    const slotDuration = config.slotDurationMinutes || 30;
    const workingDays = config.workingDays || [1, 2, 3, 4, 5];

    // Rango del día en hora de Bogotá (-05:00)
    const dayStart = new Date(`${dateStr}T00:00:00.000-05:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999-05:00`);

    if (isNaN(dayStart.getTime())) {
      throw new BadRequestException('Fecha no válida');
    }

    // dayOfWeek: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const dayOfWeek = dayStart.getDay();
    const isWorkingDay = workingDays.includes(dayOfWeek);

    // Parsear horas
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Generar lista de horas
    const timeSlots: string[] = [];
    for (let m = startMinutes; m < endMinutes; m += slotDuration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      timeSlots.push(
        `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      );
    }

    // Consultar citas activas del día
    const activeAppointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          name: { notIn: ['Cancelada', 'No Asistió'] },
        },
        client: { isDeleted: false },
      },
      select: {
        id: true,
        appointmentDate: true,
        clientId: true,
        professionalId: true,
      },
    });

    // Mapear citas por hora HH:MM (en hora de Bogotá -05:00)
    const appointmentsByTime = new Map<string, typeof activeAppointments>();
    for (const appt of activeAppointments) {
      const d = new Date(appt.appointmentDate);
      const timeString = d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Bogota',
      });
      if (!appointmentsByTime.has(timeString)) {
        appointmentsByTime.set(timeString, []);
      }
      appointmentsByTime.get(timeString)!.push(appt);
    }

    // Contar total de profesionales activos para calcular si todos están ocupados cuando no se filtra por uno específico
    const totalProfessionalsCount = await this.prisma.user.count({
      where: {
        userRoles: {
          some: {
            role: { name: 'Profesional' },
          },
        },
        person: { status: { name: 'Activo' } },
      },
    });

    const slots: DaySlot[] = timeSlots.map((time) => {
      const apptsAtTime = appointmentsByTime.get(time) || [];

      // 1. Validar si el cliente actual ya tiene cita a esta hora
      if (clientId && apptsAtTime.some((a) => Number(a.clientId) === clientId)) {
        return {
          time,
          available: false,
          reason: 'El cliente ya tiene cita a esta hora',
        };
      }

      // 2. Si se seleccionó un profesional específico
      if (professionalId) {
        const isProfBusy = apptsAtTime.some(
          (a) => Number(a.professionalId) === professionalId,
        );
        if (isProfBusy) {
          return {
            time,
            available: false,
            reason: 'Ocupado',
          };
        }
      } else {
        // 3. Si no se seleccionó profesional específico:
        if (totalProfessionalsCount > 0 && apptsAtTime.length >= totalProfessionalsCount) {
          return {
            time,
            available: false,
            reason: 'Ocupado',
          };
        } else if (totalProfessionalsCount === 0 && apptsAtTime.length > 0) {
          return {
            time,
            available: false,
            reason: 'Ocupado',
          };
        }
      }

      return {
        time,
        available: true,
      };
    });

    return {
      date: dateStr,
      isWorkingDay,
      workingDays,
      businessStartTime: startTimeStr,
      businessEndTime: endTimeStr,
      slotDurationMinutes: slotDuration,
      slots,
    };
  }
}


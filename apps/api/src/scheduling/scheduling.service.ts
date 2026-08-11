import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';
import { CreateSchedulingPeriodDto } from './dto/create-scheduling-period.dto';
import type {
  SchedulingConfig,
  SchedulingPeriod,
  PaginatedResponse,
  WeekCapacityResponse,
  WeekCapacityItem,
} from '@agendamiento/shared';
import {
  calculateEntryWeekNumber,
  getRecommendedWeekRange,
} from '../common/helpers/client-week-helper';

/**
 * Servicio responsable de la configuración global de agendamiento
 * y la gestión de periodos de agenda.
 *
 * La configuración global define reglas por defecto: intervalo,
 * días laborales, horarios, y flags (auto-sugerencia, semana de ingreso).
 *
 * Los periodos son rangos de fechas que agrupan citas de forma lógica
 * (p.ej. "Agosto 2026", "Semana 32").
 */
@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Configuración global ──────────────────────────────────

  async getConfig(): Promise<SchedulingConfig> {
    const config = await this.prisma.schedulingConfig.findFirst({
      include: { defaultInterval: true },
    });

    if (!config) {
      throw new NotFoundException('No existe configuración de agendamiento. Ejecute el seed.');
    }

    return this.mapConfig(config);
  }

  async updateConfig(dto: UpdateSchedulingConfigDto): Promise<SchedulingConfig> {
    const existing = await this.prisma.schedulingConfig.findFirst();

    if (!existing) {
      throw new NotFoundException('No existe configuración de agendamiento.');
    }

    const updated = await this.prisma.schedulingConfig.update({
      where: { id: existing.id },
      data: {
        ...(dto.defaultIntervalId !== undefined && { defaultIntervalId: dto.defaultIntervalId }),
        ...(dto.allowClientOverride !== undefined && { allowClientOverride: dto.allowClientOverride }),
        ...(dto.autoSuggestNext !== undefined && { autoSuggestNext: dto.autoSuggestNext }),
        ...(dto.respectEntryWeek !== undefined && { respectEntryWeek: dto.respectEntryWeek }),
        ...(dto.workingDays !== undefined && { workingDays: dto.workingDays }),
        ...(dto.businessStartTime !== undefined && {
          businessStartTime: this.parseTime(dto.businessStartTime),
        }),
        ...(dto.businessEndTime !== undefined && {
          businessEndTime: this.parseTime(dto.businessEndTime),
        }),
        ...(dto.slotDurationMinutes !== undefined && { slotDurationMinutes: dto.slotDurationMinutes }),
      },
      include: { defaultInterval: true },
    });

    return this.mapConfig(updated);
  }

  // ─── Capacidad por Semanas del Mes ───────────────────────

  async getWeekCapacity(): Promise<WeekCapacityResponse> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // Obtener todos los ingresos iniciales de clientes para saber su semana de ingreso
    const entries = await this.prisma.clientEntry.findMany({
      select: {
        clientId: true,
        entryDate: true,
      },
      orderBy: { entryDate: 'asc' },
    });

    // Mapear cada cliente a su primera semana de ingreso
    const clientEntryWeekMap = new Map<number, number>();
    entries.forEach((e) => {
      if (!clientEntryWeekMap.has(Number(e.clientId))) {
        const weekNum = calculateEntryWeekNumber(new Date(e.entryDate));
        clientEntryWeekMap.set(Number(e.clientId), weekNum);
      }
    });

    const clientCountByWeek = [0, 0, 0, 0, 0]; // 1-indexed (index 1 to 4)
    clientEntryWeekMap.forEach((weekNum) => {
      if (weekNum >= 1 && weekNum <= 4) {
        clientCountByWeek[weekNum]++;
      }
    });

    // Obtener citas del mes actual
    const appointmentsThisMonth = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        appointmentDate: true,
      },
    });

    const apptCountByWeek = [0, 0, 0, 0, 0];
    appointmentsThisMonth.forEach((a) => {
      const weekNum = calculateEntryWeekNumber(new Date(a.appointmentDate));
      if (weekNum >= 1 && weekNum <= 4) {
        apptCountByWeek[weekNum]++;
      }
    });

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    const weeks: WeekCapacityItem[] = [1, 2, 3, 4].map((w) => {
      const range = getRecommendedWeekRange(now, w);
      const clientCount = clientCountByWeek[w];
      const apptCount = apptCountByWeek[w];

      let status: 'optimal' | 'normal' | 'high' | 'overloaded' = 'optimal';
      if (clientCount > 25) status = 'overloaded';
      else if (clientCount > 15) status = 'high';
      else if (clientCount > 5) status = 'normal';

      return {
        weekNumber: w,
        weekLabel: `Semana ${w}`,
        dayRangeLabel: range.label.replace(`Semana ${w} (`, '').replace(')', ''),
        clientCount,
        appointmentCount: apptCount,
        status,
      };
    });

    return {
      totalActiveClients: clientEntryWeekMap.size,
      totalAppointmentsThisMonth: appointmentsThisMonth.length,
      currentMonthName: `${monthNames[currentMonth]} ${currentYear}`,
      weeks,
    };
  }

  // ─── Periodos ──────────────────────────────────────────────

  async findAllPeriods(query?: {
    statusId?: number;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<SchedulingPeriod>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (query?.statusId) where.statusId = Number(query.statusId);

    const [total, items] = await Promise.all([
      this.prisma.schedulingPeriod.count({ where }),
      this.prisma.schedulingPeriod.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { startDate: 'desc' },
        include: { status: true },
      }),
    ]);

    const data: SchedulingPeriod[] = items.map((p) => this.mapPeriod(p));

    return {
      success: true,
      data,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async findPeriodById(id: number): Promise<SchedulingPeriod> {
    const period = await this.prisma.schedulingPeriod.findUnique({
      where: { id },
      include: { status: true },
    });

    if (!period) {
      throw new NotFoundException(`Periodo con ID ${id} no encontrado`);
    }

    return this.mapPeriod(period);
  }

  async createPeriod(dto: CreateSchedulingPeriodDto): Promise<SchedulingPeriod> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    const created = await this.prisma.schedulingPeriod.create({
      data: {
        startDate,
        endDate,
        statusId: dto.statusId,
      },
      include: { status: true },
    });

    return this.mapPeriod(created);
  }

  async updatePeriodStatus(id: number, statusId: number): Promise<SchedulingPeriod> {
    await this.findPeriodById(id);

    const updated = await this.prisma.schedulingPeriod.update({
      where: { id },
      data: { statusId },
      include: { status: true },
    });

    return this.mapPeriod(updated);
  }

  // ─── Helpers privados ──────────────────────────────────────

  /** Convierte "HH:MM" a un Date con hora UTC para persistir en Prisma @db.Time */
  private parseTime(timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(1970, 0, 1, h, m, 0);
    return d;
  }

  /** Formatea un Date de Prisma @db.Time a "HH:MM" */
  private formatTime(date: Date): string {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private mapConfig(raw: any): SchedulingConfig {
    return {
      id: Number(raw.id),
      defaultIntervalId: Number(raw.defaultIntervalId),
      allowClientOverride: raw.allowClientOverride,
      autoSuggestNext: raw.autoSuggestNext,
      respectEntryWeek: raw.respectEntryWeek,
      workingDays: raw.workingDays,
      businessStartTime: this.formatTime(raw.businessStartTime),
      businessEndTime: this.formatTime(raw.businessEndTime),
      slotDurationMinutes: raw.slotDurationMinutes,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      defaultInterval: raw.defaultInterval
        ? {
            id: Number(raw.defaultInterval.id),
            name: raw.defaultInterval.name,
            days: raw.defaultInterval.days,
            description: raw.defaultInterval.description,
          }
        : undefined,
    };
  }

  private mapPeriod(raw: any): SchedulingPeriod {
    return {
      id: Number(raw.id),
      startDate: raw.startDate.toISOString(),
      endDate: raw.endDate.toISOString(),
      statusId: Number(raw.statusId),
      createdAt: raw.createdAt.toISOString(),
      status: raw.status
        ? { id: Number(raw.status.id), name: raw.status.name }
        : undefined,
    };
  }
}

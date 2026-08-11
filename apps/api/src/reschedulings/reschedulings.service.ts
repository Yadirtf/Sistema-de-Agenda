import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReschedulingDto } from './dto/create-rescheduling.dto';
import { Rescheduling, PaginatedResponse } from '@agendamiento/shared';

@Injectable()
export class ReschedulingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<Rescheduling>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const [total, items] = await Promise.all([
      this.prisma.rescheduling.count(),
      this.prisma.rescheduling.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          originalAppointment: { include: { client: { include: { person: true } } } },
          newAppointment: true,
          reason: true,
          performedByUser: { include: { person: true } },
        },
      }),
    ]);

    const data: Rescheduling[] = items.map((r) => this.mapRescheduling(r));

    return {
      success: true,
      data,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async reschedule(dto: CreateReschedulingDto, userId?: number): Promise<Rescheduling> {
    const originalAppt = await this.prisma.appointment.findUnique({
      where: { id: dto.originalAppointmentId },
    });

    if (!originalAppt) {
      throw new NotFoundException(`La cita original con ID ${dto.originalAppointmentId} no existe`);
    }

    const cancelledStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: 'Cancelada' },
    });
    const confirmedStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: 'Confirmada' },
    });

    if (!cancelledStatus || !confirmedStatus) {
      throw new BadRequestException('Estados de cita no configurados en la base de datos');
    }

    const rescheduling = await this.prisma.$transaction(async (tx) => {
      // 1. Cancelar cita original
      await tx.appointment.update({
        where: { id: originalAppt.id },
        data: { statusId: cancelledStatus.id },
      });

      // 2. Crear nueva cita en la nueva fecha
      const newAppt = await tx.appointment.create({
        data: {
          clientId: originalAppt.clientId,
          professionalId: originalAppt.professionalId,
          clientEntryId: originalAppt.clientEntryId,
          schedulingPeriodId: originalAppt.schedulingPeriodId,
          previousAppointmentId: originalAppt.id,
          appointmentDate: new Date(dto.newAppointmentDate),
          statusId: confirmedStatus.id,
          notes: dto.notes ?? originalAppt.notes,
        },
      });

      // 3. Registrar auditoría de reagendamiento
      const resched = await tx.rescheduling.create({
        data: {
          originalAppointmentId: originalAppt.id,
          newAppointmentId: newAppt.id,
          reasonId: dto.reasonId,
          performedBy: userId ?? null,
        },
        include: {
          originalAppointment: { include: { client: { include: { person: true } } } },
          newAppointment: true,
          reason: true,
          performedByUser: { include: { person: true } },
        },
      });

      return resched;
    });

    return this.mapRescheduling(rescheduling);
  }

  private mapRescheduling(raw: any): Rescheduling {
    return {
      id: Number(raw.id),
      originalAppointmentId: Number(raw.originalAppointmentId),
      newAppointmentId: Number(raw.newAppointmentId),
      reasonId: Number(raw.reasonId),
      performedBy: raw.performedBy ? Number(raw.performedBy) : null,
      createdAt: raw.createdAt.toISOString(),
      reason: raw.reason
        ? {
            id: Number(raw.reason.id),
            name: raw.reason.name,
            description: raw.reason.description,
          }
        : undefined,
    };
  }
}

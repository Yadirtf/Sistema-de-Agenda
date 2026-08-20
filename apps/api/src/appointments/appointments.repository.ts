import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const APPOINTMENT_INCLUDE = {
  client: { include: { person: { include: { documentType: true, status: true } } } },
  professional: { include: { documentType: true, status: true } },
  clientEntry: { include: { status: true } },
  schedulingPeriod: { include: { status: true } },
  status: true,
} as const;

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(where: any, skip: number, take: number) {
    const [total, items] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { appointmentDate: 'asc' },
        include: APPOINTMENT_INCLUDE,
      }),
    ]);
    return { items, total };
  }

  async findById(id: number) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async findFirstActive(clientId: number) {
    return this.prisma.appointment.findFirst({
      where: {
        clientId,
        status: {
          name: {
            notIn: ['Completada', 'Cancelada', 'No Asistió'],
          },
        },
      },
      include: { status: true },
    });
  }

  async create(data: any) {
    return this.prisma.appointment.create({
      data,
      include: APPOINTMENT_INCLUDE,
    });
  }

  async update(id: number, data: any) {
    return this.prisma.appointment.update({
      where: { id },
      data,
      include: APPOINTMENT_INCLUDE,
    });
  }

  async findByToken(token: string) {
    return this.prisma.appointment.findUnique({
      where: { confirmationToken: token },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async findYearly(where: any) {
    return this.prisma.appointment.findMany({
      where,
      include: {
        client: { include: { person: true } },
        status: true,
      },
      orderBy: { appointmentDate: 'asc' },
    });
  }

  async findPendingReminders(now: Date, targetDate: Date, twentyFourHoursAgo: Date) {
    return this.prisma.appointment.findMany({
      where: {
        status: { name: 'Agendada' },
        appointmentDate: {
          gte: now,
        },
        client: { isDeleted: false },
        OR: [
          // 1. Citas próximas pendientes de notificar
          {
            reminderSentAt: null,
            appointmentDate: {
              gte: now,
              lte: targetDate,
            },
          },
          // 2. Citas notificadas en las últimas 24h cuya fecha aún no ha pasado
          {
            reminderSentAt: {
              gte: twentyFourHoursAgo,
            },
            appointmentDate: {
              gte: now,
            },
          },
        ],
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { appointmentDate: 'asc' },
    });
  }

  async findFullForSuggestion(id: number) {
    return this.prisma.appointment.findUnique({
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
  }

  async findExpiredAppointments(thresholdDate: Date) {
    return this.prisma.appointment.findMany({
      where: {
        status: {
          name: { in: ['Agendada', 'Confirmada'] },
        },
        appointmentDate: {
          lt: thresholdDate,
        },
        client: { isDeleted: false },
      },
      include: APPOINTMENT_INCLUDE,
    });
  }

  async runTransaction(operations: any[]) {
    return this.prisma.$transaction(operations);
  }
}

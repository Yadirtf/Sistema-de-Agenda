import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStats } from '@agendamiento/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [todayAppointments, confirmedAppointments, pendingAppointments, activeClients] = await Promise.all([
      // Citas de hoy (solo clientes no eliminados)
      this.prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          client: { isDeleted: false },
        },
      }),
      // Confirmadas
      this.prisma.appointment.count({
        where: {
          status: {
            name: 'Confirmada',
          },
          client: { isDeleted: false },
        },
      }),
      // Pendientes (Agendadas)
      this.prisma.appointment.count({
        where: {
          status: {
            name: 'Agendada',
          },
          client: { isDeleted: false },
        },
      }),
      // Clientes Activos (no eliminados)
      this.prisma.client.count({
        where: {
          isDeleted: false,
          person: {
            status: {
              name: 'Activo',
            },
          },
        },
      }),
    ]);

    return {
      todayAppointments,
      confirmedAppointments,
      pendingAppointments,
      activeClients,
    };
  }
}

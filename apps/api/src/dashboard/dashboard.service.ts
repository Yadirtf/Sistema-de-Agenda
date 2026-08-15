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
      // Citas de hoy
      this.prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      // Confirmadas (pueden ser de cualquier fecha, o solo próximas? Según el KPI actual parece global o de hoy)
      // Vamos a filtrar por "Confirmada" globalmente para reflejar el estado actual
      this.prisma.appointment.count({
        where: {
          status: {
            name: 'Confirmada',
          },
        },
      }),
      // Pendientes (Agendadas)
      this.prisma.appointment.count({
        where: {
          status: {
            name: 'Agendada',
          },
        },
      }),
      // Clientes Activos
      this.prisma.client.count({
        where: {
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

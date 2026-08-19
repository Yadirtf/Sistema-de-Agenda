import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentStatusChangedEvent } from './events/appointment-status-changed.event';

@Injectable()
export class AppointmentsTasksService {
  private readonly logger = new Logger(AppointmentsTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: AppointmentsRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleNoShowAppointments() {
    /**
     * LÓGICA DE NEGOCIO:
     * Una cita se marca como "No Asistió" si han pasado más de X minutos desde su FECHA Y HORA PROGRAMADA.
     * Ejemplo: Cita a las 2:00 PM. Con umbral de 30 min, se marcará a partir de las 2:31 PM si sigue 'Agendada' o 'Confirmada'.
     * Esto permite un margen de espera para clientes que llegan tarde (5, 10, 15... hasta 30 min).
     */
    const thresholdMinutes = this.configService.get<number>('APPOINTMENT_NO_SHOW_THRESHOLD_MINUTES', 1);

    const now = new Date();
    // thresholdDate representa el tiempo máximo en el pasado que una cita puede tener para NO ser considerada "No show"
    const thresholdDate = new Date(now.getTime() - thresholdMinutes * 60 * 1000);

    this.logger.debug(
      `Verificando citas que iniciaron antes de las ${thresholdDate.toLocaleTimeString('es-CO')} ` +
      `y que aún no han asistido (Umbral de gracia: ${thresholdMinutes} min).`
    );

    const expiredAppointments = await this.repository.findExpiredAppointments(thresholdDate);

    if (expiredAppointments.length === 0) {
      return;
    }

    this.logger.log(`Se encontraron ${expiredAppointments.length} citas para marcar como "No Asistió"`);

    const noShowStatus = await this.prisma.appointmentStatus.findFirst({
      where: { name: 'No Asistió' },
    });

    if (!noShowStatus) {
      this.logger.error('No se encontró el estado "No Asistió" en la base de datos');
      return;
    }

    for (const appt of expiredAppointments) {
      try {
        await this.prisma.appointment.update({
          where: { id: appt.id },
          data: { statusId: noShowStatus.id },
        });

        this.logger.log(`Cita ID ${appt.id} marcada como "No Asistió" automáticamente`);

        // Emitir evento para actualización en tiempo real y seguimientos
        this.eventEmitter.emit(
          'appointment.status.changed',
          new AppointmentStatusChangedEvent(
            Number(appt.id),
            Number(appt.clientId),
            Number(noShowStatus.id),
            'No Asistió',
            'Cita marcada automáticamente como "No Asistió" por el sistema tras superar el tiempo de espera.',
            undefined,
          ),
        );
      } catch (error) {
        this.logger.error(`Error al actualizar cita ID ${appt.id}: ${error.message}`);
      }
    }
  }
}

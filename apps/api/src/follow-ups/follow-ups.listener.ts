import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatusChangedEvent } from '../appointments/events/appointment-status-changed.event';

@Injectable()
export class FollowUpsListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('appointment.status.changed')
  async handleAppointmentStatusChanged(event: AppointmentStatusChangedEvent) {
    const followUpType = await this.prisma.followUpType.findFirst({
      where: { name: 'Cambio de Estado' },
    });

    if (!followUpType) return;

    const description = event.note
      ? `Cambio de estado a "${event.statusName}". Nota: ${event.note}`
      : `Cambio de estado a "${event.statusName}" sin nota adicional.`;

    await this.prisma.followUp.create({
      data: {
        clientId: BigInt(event.clientId),
        appointmentId: BigInt(event.appointmentId),
        performedBy: event.userId ? BigInt(event.userId) : null,
        typeId: followUpType.id,
        description,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ServerEvent {
  data: {
    type: string;
    payload?: any;
  };
}

@Injectable()
export class EventsService {
  private readonly eventSubject = new Subject<any>();

  /**
   * Suscribe a un cliente al flujo de eventos
   */
  subscribe(): Observable<ServerEvent> {
    return this.eventSubject.asObservable().pipe(
      map((event) => ({
        data: event,
      })),
    );
  }

  /**
   * Escucha el cambio de estado de una cita
   */
  @OnEvent('appointment.status.changed')
  handleAppointmentStatusChanged(payload: any) {
    this.eventSubject.next({
      type: 'appointment.updated',
      payload,
    });
  }

  /**
   * Escucha la creación de una nueva cita
   */
  @OnEvent('appointment.created')
  handleAppointmentCreated(payload: any) {
    this.eventSubject.next({
      type: 'appointment.created',
      payload,
    });
  }

  /**
   * Escucha actualizaciones generales de citas
   */
  @OnEvent('appointment.updated')
  handleAppointmentUpdated(payload: any) {
    this.eventSubject.next({
      type: 'appointment.updated',
      payload,
    });
  }

  /**
   * Escucha la creación de un nuevo cliente
   */
  @OnEvent('client.created')
  handleClientCreated(payload: any) {
    this.eventSubject.next({
      type: 'client.created',
      payload,
    });
  }
}

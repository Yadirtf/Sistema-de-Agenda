import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { EventsService } from './events.service';
import { Public } from '../decorators/public.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public() // Permitimos acceso público o manejado por token si se prefiere, por ahora público para simplificar
  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return this.eventsService.subscribe() as unknown as Observable<MessageEvent>;
  }
}

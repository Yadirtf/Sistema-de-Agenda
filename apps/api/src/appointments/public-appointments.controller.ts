import { Controller, Get, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('public/appointments')
export class PublicAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('validate/:token')
  async validate(@Param('token') token: string) {
    return this.appointmentsService.findByToken(token);
  }

  @Patch('process/:token')
  async process(
    @Param('token') token: string,
    @Body('action') action: 'confirm' | 'cancel',
  ) {
    if (!['confirm', 'cancel'].includes(action)) {
      throw new BadRequestException('Acción inválida');
    }
    return this.appointmentsService.processConfirmation(token, action);
  }
}

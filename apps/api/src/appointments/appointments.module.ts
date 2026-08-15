import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsController } from './appointments.controller';
import { PublicAppointmentsController } from './public-appointments.controller';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [SchedulingModule],
  controllers: [AppointmentsController, PublicAppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService, AppointmentsRepository],
})
export class AppointmentsModule {}

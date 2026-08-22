import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ForbiddenException } from '@nestjs/common';
import { TokenPayload } from '@agendamiento/shared';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  async findAll(
    @CurrentUser() currentUser: TokenPayload,
    @Query('clientId') clientId?: string,
    @Query('statusId') statusId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('search') search?: string,
  ) {
    const isProfessional = currentUser.roles.includes('Profesional');
    return this.appointmentsService.findAll({
      clientId: clientId ? parseInt(clientId, 10) : undefined,
      statusId: statusId ? parseInt(statusId, 10) : undefined,
      dateFrom,
      dateTo,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
      search,
      // Si el usuario es Profesional, forzar el filtro por su personId
      professionalPersonId: isProfessional ? currentUser.personId : undefined,
    });
  }

  @Get('suggest-next/:clientId')
  async suggestNext(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.appointmentsService.suggestNext(clientId);
  }

  @Get('slots')
  async getDaySlots(
    @Query('date') date: string,
    @Query('professionalId') professionalId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.appointmentsService.getDaySlots(
      date,
      professionalId ? parseInt(professionalId, 10) : undefined,
      clientId ? parseInt(clientId, 10) : undefined,
    );
  }

  @Get('professionals')
  async getProfessionals() {
    return this.appointmentsService.getProfessionals();
  }

  @Get('pending-reminders')
  async getPendingReminders() {
    return this.appointmentsService.getPendingReminders();
  }

  @Patch(':id/reminder-sent')
  async markReminderAsSent(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.markReminderAsSent(id);
  }

  @Get('yearly-history')
  async getYearlyHistory(
    @Query('year') year: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.appointmentsService.getYearlyHistory({
      year: year ? parseInt(year, 10) : new Date().getFullYear(),
      clientId: clientId ? parseInt(clientId, 10) : undefined,
      search,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const isProfessional = currentUser.roles.includes('Profesional');

    if (isProfessional) {
      // El Profesional solo puede marcar como Completada (3) o No Asistió (5)
      const ALLOWED_STATUS_IDS = [3, 5];
      if (!ALLOWED_STATUS_IDS.includes(dto.statusId)) {
        throw new ForbiddenException(
          'El profesional solo puede marcar una cita como Completada o No Asistió',
        );
      }
    }

    return this.appointmentsService.updateStatus(
      id,
      dto.statusId,
      dto.note,
      currentUser.sub,
    );
  }

  @Patch(':id/complete')
  async complete(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.completeAppointment(id);
  }
}

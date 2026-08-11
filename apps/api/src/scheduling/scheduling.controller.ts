import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';
import { CreateSchedulingPeriodDto } from './dto/create-scheduling-period.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ─── Configuración global ──────────────────────────────────

  @Get('config')
  async getConfig() {
    return this.schedulingService.getConfig();
  }

  @Put('config')
  @Roles('Administrador')
  async updateConfig(@Body() dto: UpdateSchedulingConfigDto) {
    return this.schedulingService.updateConfig(dto);
  }

  // ─── Capacidad por Semanas ────────────────────────────────

  @Get('week-capacity')
  async getWeekCapacity() {
    return this.schedulingService.getWeekCapacity();
  }

  // ─── Periodos ──────────────────────────────────────────────

  @Get('periods')
  async findAllPeriods(
    @Query('statusId') statusId?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.schedulingService.findAllPeriods({
      statusId: statusId ? parseInt(statusId, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Get('periods/:id')
  async findPeriodById(@Param('id', ParseIntPipe) id: number) {
    return this.schedulingService.findPeriodById(id);
  }

  @Post('periods')
  @Roles('Administrador')
  async createPeriod(@Body() dto: CreateSchedulingPeriodDto) {
    return this.schedulingService.createPeriod(dto);
  }

  @Patch('periods/:id/status')
  @Roles('Administrador')
  async updatePeriodStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('statusId', ParseIntPipe) statusId: number,
  ) {
    return this.schedulingService.updatePeriodStatus(id, statusId);
  }
}

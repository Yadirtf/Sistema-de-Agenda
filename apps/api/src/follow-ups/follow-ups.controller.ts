import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  async findAll(
    @Query('clientId') clientId?: string,
    @Query('appointmentId') appointmentId?: string,
    @Query('typeId') typeId?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.followUpsService.findAll({
      clientId: clientId ? parseInt(clientId, 10) : undefined,
      appointmentId: appointmentId ? parseInt(appointmentId, 10) : undefined,
      typeId: typeId ? parseInt(typeId, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Post()
  async create(
    @Body() dto: CreateFollowUpDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.followUpsService.create(dto, userId);
  }
}

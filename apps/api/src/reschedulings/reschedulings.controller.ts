import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ReschedulingsService } from './reschedulings.service';
import { CreateReschedulingDto } from './dto/create-rescheduling.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reschedulings')
export class ReschedulingsController {
  constructor(private readonly reschedulingsService: ReschedulingsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.reschedulingsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Post()
  async reschedule(
    @Body() dto: CreateReschedulingDto,
    @CurrentUser('sub') userId: number,
  ) {
    return this.reschedulingsService.reschedule(dto, userId);
  }
}

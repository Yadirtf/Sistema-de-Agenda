import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientEntryDto } from './dto/create-client-entry.dto';
import { UpsertClientSchedulingConfigDto } from './dto/upsert-client-scheduling-config.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.clientsService.findAll({
      search,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.remove(id);
  }

  @Get(':id/entries')
  async getEntries(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.getEntries(id);
  }

  @Post(':id/entries')
  async addEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClientEntryDto,
  ) {
    return this.clientsService.addEntry(id, dto);
  }

  @Put(':id/scheduling-config')
  async upsertSchedulingConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertClientSchedulingConfigDto,
  ) {
    return this.clientsService.upsertSchedulingConfig(id, dto);
  }
}

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
    @Query('statusId') statusId?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.clientsService.findAll({
      search,
      statusId: statusId ? parseInt(statusId, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }

  @Get('bin/deleted')
  async findDeleted() {
    return this.clientsService.findDeleted();
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

  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.restore(id);
  }

  @Delete('bin/empty')
  @HttpCode(HttpStatus.NO_CONTENT)
  async emptyBin() {
    return this.clientsService.emptyBin();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.remove(id);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async permanentRemove(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.permanentRemove(id);
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

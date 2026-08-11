import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PeopleService } from '../people/people.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateClientEntryDto } from './dto/create-client-entry.dto';
import { UpsertClientSchedulingConfigDto } from './dto/upsert-client-scheduling-config.dto';
import { Client, ClientEntry, ClientSchedulingConfig, PaginatedResponse } from '@agendamiento/shared';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly peopleService: PeopleService,
  ) {}

  async findAll(query?: {
    search?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<Client>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (query?.search) {
      const search = query.search.trim();
      where.person = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          person: {
            include: {
              documentType: true,
              status: true,
            },
          },
          schedulingConfig: {
            include: {
              interval: true,
            },
          },
        },
      }),
    ]);

    const data: Client[] = items.map((client) => ({
      id: Number(client.id),
      personId: Number(client.personId),
      createdAt: client.createdAt.toISOString(),
      person: {
        id: Number(client.person.id),
        documentTypeId: Number(client.person.documentTypeId),
        documentNumber: client.person.documentNumber,
        firstName: client.person.firstName,
        middleName: client.person.middleName,
        lastName: client.person.lastName,
        secondLastName: client.person.secondLastName,
        birthDate: client.person.birthDate ? client.person.birthDate.toISOString() : null,
        phone: client.person.phone,
        email: client.person.email,
        statusId: Number(client.person.statusId),
        createdAt: client.person.createdAt.toISOString(),
        updatedAt: client.person.updatedAt.toISOString(),
        documentType: {
          id: Number(client.person.documentType.id),
          name: client.person.documentType.name,
        },
        status: {
          id: Number(client.person.status.id),
          name: client.person.status.name,
        },
      },
      schedulingConfig: client.schedulingConfig
        ? {
            id: Number(client.schedulingConfig.id),
            clientId: Number(client.schedulingConfig.clientId),
            intervalId: Number(client.schedulingConfig.intervalId),
            notes: client.schedulingConfig.notes,
            createdAt: client.schedulingConfig.createdAt.toISOString(),
            interval: {
              id: Number(client.schedulingConfig.interval.id),
              name: client.schedulingConfig.interval.name,
              days: client.schedulingConfig.interval.days,
              description: client.schedulingConfig.interval.description,
            },
          }
        : null,
    }));

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            documentType: true,
            status: true,
          },
        },
        schedulingConfig: {
          include: {
            interval: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return {
      id: Number(client.id),
      personId: Number(client.personId),
      createdAt: client.createdAt.toISOString(),
      person: {
        id: Number(client.person.id),
        documentTypeId: Number(client.person.documentTypeId),
        documentNumber: client.person.documentNumber,
        firstName: client.person.firstName,
        middleName: client.person.middleName,
        lastName: client.person.lastName,
        secondLastName: client.person.secondLastName,
        birthDate: client.person.birthDate ? client.person.birthDate.toISOString() : null,
        phone: client.person.phone,
        email: client.person.email,
        statusId: Number(client.person.statusId),
        createdAt: client.person.createdAt.toISOString(),
        updatedAt: client.person.updatedAt.toISOString(),
        documentType: {
          id: Number(client.person.documentType.id),
          name: client.person.documentType.name,
        },
        status: {
          id: Number(client.person.status.id),
          name: client.person.status.name,
        },
      },
      schedulingConfig: client.schedulingConfig
        ? {
            id: Number(client.schedulingConfig.id),
            clientId: Number(client.schedulingConfig.clientId),
            intervalId: Number(client.schedulingConfig.intervalId),
            notes: client.schedulingConfig.notes,
            createdAt: client.schedulingConfig.createdAt.toISOString(),
            interval: {
              id: Number(client.schedulingConfig.interval.id),
              name: client.schedulingConfig.interval.name,
              days: client.schedulingConfig.interval.days,
              description: client.schedulingConfig.interval.description,
            },
          }
        : null,
    };
  }

  async create(dto: CreateClientDto): Promise<Client> {
    let targetPersonId: number;

    if (dto.personId) {
      targetPersonId = dto.personId;
    } else if (dto.person) {
      const createdPerson = await this.peopleService.create(dto.person);
      targetPersonId = createdPerson.id;
    } else {
      throw new BadRequestException('Debe especificar un personId o los datos para crear una nueva persona');
    }

    const existingClient = await this.prisma.client.findUnique({
      where: { personId: targetPersonId },
    });

    if (existingClient) {
      throw new ConflictException('Esta persona ya está registrada como cliente');
    }

    const created = await this.prisma.client.create({
      data: {
        personId: targetPersonId,
      },
    });

    return this.findOne(Number(created.id));
  }

  async addEntry(clientId: number, dto: CreateClientEntryDto): Promise<ClientEntry> {
    await this.findOne(clientId);

    const entry = await this.prisma.clientEntry.create({
      data: {
        clientId,
        entryDate: new Date(dto.entryDate),
        statusId: dto.statusId,
      },
      include: {
        status: true,
      },
    });

    return {
      id: Number(entry.id),
      clientId: Number(entry.clientId),
      entryDate: entry.entryDate.toISOString(),
      statusId: Number(entry.statusId),
      createdAt: entry.createdAt.toISOString(),
      status: {
        id: Number(entry.status.id),
        name: entry.status.name,
      },
    };
  }

  async getEntries(clientId: number): Promise<ClientEntry[]> {
    await this.findOne(clientId);

    const entries = await this.prisma.clientEntry.findMany({
      where: { clientId },
      orderBy: { entryDate: 'desc' },
      include: {
        status: true,
      },
    });

    return entries.map((entry) => ({
      id: Number(entry.id),
      clientId: Number(entry.clientId),
      entryDate: entry.entryDate.toISOString(),
      statusId: Number(entry.statusId),
      createdAt: entry.createdAt.toISOString(),
      status: {
        id: Number(entry.status.id),
        name: entry.status.name,
      },
    }));
  }

  async upsertSchedulingConfig(
    clientId: number,
    dto: UpsertClientSchedulingConfigDto,
  ): Promise<ClientSchedulingConfig> {
    await this.findOne(clientId);

    const updated = await this.prisma.clientSchedulingConfig.upsert({
      where: { clientId },
      create: {
        clientId,
        intervalId: dto.intervalId,
        notes: dto.notes,
      },
      update: {
        intervalId: dto.intervalId,
        notes: dto.notes,
      },
      include: {
        interval: true,
      },
    });

    return {
      id: Number(updated.id),
      clientId: Number(updated.clientId),
      intervalId: Number(updated.intervalId),
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      interval: {
        id: Number(updated.interval.id),
        name: updated.interval.name,
        days: updated.interval.days,
        description: updated.interval.description,
      },
    };
  }
}

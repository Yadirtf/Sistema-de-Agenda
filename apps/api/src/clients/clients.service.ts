import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PeopleService } from '../people/people.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientEntryDto } from './dto/create-client-entry.dto';
import { UpsertClientSchedulingConfigDto } from './dto/upsert-client-scheduling-config.dto';
import { Client, ClientEntry, ClientSchedulingConfig, PaginatedResponse } from '@agendamiento/shared';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly peopleService: PeopleService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(query?: {
    search?: string;
    statusId?: number;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<Client>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = { isDeleted: false };

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

    if (query?.statusId) {
      where.appointments = {
        some: {
          statusId: query.statusId,
        },
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
          appointments: {
            orderBy: { appointmentDate: 'desc' },
            take: 1,
            include: {
              status: true,
              professional: { include: { status: true, documentType: true } },
            },
          },
        },
      }),
    ]);

    const data: Client[] = items.map((client) => {
      const latestAppt = client.appointments?.[0];

      const mappedPerson = {
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
      };

      const mappedClient: Client = {
        id: Number(client.id),
        personId: Number(client.personId),
        isDeleted: client.isDeleted,
        deletedAt: client.deletedAt ? client.deletedAt.toISOString() : null,
        createdAt: client.createdAt.toISOString(),
        person: mappedPerson,
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

      if (latestAppt) {
        mappedClient.latestAppointment = {
          id: Number(latestAppt.id),
          clientId: Number(latestAppt.clientId),
          professionalId: latestAppt.professionalId ? Number(latestAppt.professionalId) : null,
          appointmentDate: latestAppt.appointmentDate.toISOString(),
          statusId: Number(latestAppt.statusId),
          notes: latestAppt.notes,
          confirmationToken: latestAppt.confirmationToken,
          tokenUsed: latestAppt.tokenUsed,
          reminderSentAt: latestAppt.reminderSentAt ? latestAppt.reminderSentAt.toISOString() : null,
          createdAt: latestAppt.createdAt.toISOString(),
          updatedAt: latestAppt.updatedAt.toISOString(),
          status: {
            id: Number(latestAppt.status.id),
            name: latestAppt.status.name,
          },
          client: {
            id: mappedClient.id,
            personId: mappedClient.personId,
            createdAt: mappedClient.createdAt,
            person: mappedPerson,
          },
        };
      }

      return mappedClient;
    });

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
      where: { id: BigInt(id) },
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
      isDeleted: client.isDeleted,
      deletedAt: client.deletedAt ? client.deletedAt.toISOString() : null,
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

    const clientDto = await this.findOne(Number(created.id));

    // Emitir evento de creación de cliente
    this.eventEmitter.emit('client.created', clientDto);

    return clientDto;
  }

  async addEntry(clientId: number, dto: CreateClientEntryDto): Promise<ClientEntry> {
    await this.findOne(clientId);

    const entry = await this.prisma.clientEntry.create({
      data: {
        clientId: BigInt(clientId),
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
      where: { clientId: BigInt(clientId) },
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
      where: { clientId: BigInt(clientId) },
      create: {
        clientId: BigInt(clientId),
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

  async update(id: number, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    if (dto.person) {
      await this.peopleService.update(Number(client.personId), dto.person);
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.client.update({
      where: { id: BigInt(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Emitir evento de actualización para que el frontend sepa que el cliente ya no está en la lista principal
    this.eventEmitter.emit('client.updated', { id });
  }

  async findDeleted(): Promise<Client[]> {
    const items = await this.prisma.client.findMany({
      where: { isDeleted: true },
      orderBy: { deletedAt: 'desc' },
      include: {
        person: {
          include: {
            documentType: true,
            status: true,
          },
        },
      },
    });

    return items.map((client) => ({
      id: Number(client.id),
      personId: Number(client.personId),
      createdAt: client.createdAt.toISOString(),
      deletedAt: client.deletedAt?.toISOString(),
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
    }));
  }

  async restore(id: number): Promise<Client> {
    await this.prisma.client.update({
      where: { id: BigInt(id) },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });
    return this.findOne(id);
  }

  async permanentRemove(id: number): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, personId: true, isDeleted: true },
    });

    if (!client) throw new NotFoundException(`Cliente con ID ${id} no encontrado`);

    if (!client.isDeleted) {
      throw new BadRequestException(
        `El cliente ${id} no está en la papelera. Muévelo primero a la papelera antes de eliminarlo permanentemente.`,
      );
    }

    const clientId = client.id;
    const personId = client.personId;

    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Eliminar seguimientos del cliente
        await tx.followUp.deleteMany({ where: { clientId } });

        // 2. Identificar todas las citas del cliente
        const appointments = await tx.appointment.findMany({
          where: { clientId },
          select: { id: true },
        });
        const appointmentIds = appointments.map((a) => a.id);

        if (appointmentIds.length > 0) {
          // 3. Romper la cadena de citas (autoreferencias)
          await tx.appointment.updateMany({
            where: { id: { in: appointmentIds } },
            data: { previousAppointmentId: null },
          });

          // 4. Eliminar reagendamientos vinculados a estas citas
          await tx.rescheduling.deleteMany({
            where: {
              OR: [
                { originalAppointmentId: { in: appointmentIds } },
                { newAppointmentId: { in: appointmentIds } },
              ],
            },
          });

          // 5. Eliminar las citas
          await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
        }

        // 6. Eliminar ingresos del cliente
        await tx.clientEntry.deleteMany({ where: { clientId } });

        // 7. Eliminar configuración de agendamiento
        await tx.clientSchedulingConfig.deleteMany({ where: { clientId } });

        // 8. Eliminar el registro de cliente
        await tx.client.delete({ where: { id: clientId } });

        // 9. Eliminar la persona solo si no es usuario del sistema ni profesional activo
        const user = await tx.user.findUnique({ where: { personId } });
        const isProfessional = await tx.appointment.findFirst({ where: { professionalId: personId } });

        if (!user && !isProfessional) {
          await tx.people.delete({ where: { id: personId } });
        }
      });
    } catch (error) {
      console.error(`[ClientsService] Error en permanentRemove(${id}):`, error);
      throw new BadRequestException(
        `No se pudo eliminar permanentemente el cliente ${id}. Verifique que no tenga registros relacionados bloqueantes.`,
      );
    }
  }

  async emptyBin(): Promise<void> {
    const deletedClients = await this.prisma.client.findMany({
      where: { isDeleted: true },
      select: { id: true },
    });

    // Ejecutar en serie para evitar bloqueos pesados en la base de datos si la papelera es muy grande,
    // pero asegurando que cada uno se procese correctamente.
    for (const client of deletedClients) {
      try {
        await this.permanentRemove(Number(client.id));
      } catch (error) {
        console.error(`Error eliminando cliente ${client.id} al vaciar papelera:`, error);
      }
    }
  }
}

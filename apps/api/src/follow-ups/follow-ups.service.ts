import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUp, PaginatedResponse } from '@agendamiento/shared';

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    clientId?: number;
    appointmentId?: number;
    typeId?: number;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<FollowUp>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = {
      client: { isDeleted: false },
    };
    if (query?.clientId) where.clientId = Number(query.clientId);
    if (query?.appointmentId) where.appointmentId = Number(query.appointmentId);
    if (query?.typeId) where.typeId = Number(query.typeId);

    const [total, items] = await Promise.all([
      this.prisma.followUp.count({ where }),
      this.prisma.followUp.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { include: { person: true } },
          type: true,
          performedByUser: { include: { person: true } },
        },
      }),
    ]);

    const data: FollowUp[] = items.map((item) => this.mapFollowUp(item));

    return {
      success: true,
      data,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  async create(dto: CreateFollowUpDto, userId?: number): Promise<FollowUp> {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${dto.clientId} no encontrado`);
    }

    const created = await this.prisma.followUp.create({
      data: {
        clientId: dto.clientId,
        appointmentId: dto.appointmentId ?? null,
        performedBy: userId ?? null,
        typeId: dto.typeId,
        description: dto.description ?? null,
      },
      include: {
        client: { include: { person: true } },
        type: true,
        performedByUser: { include: { person: true } },
      },
    });

    return this.mapFollowUp(created);
  }

  private mapFollowUp(raw: any): FollowUp {
    return {
      id: Number(raw.id),
      clientId: Number(raw.clientId),
      appointmentId: raw.appointmentId ? Number(raw.appointmentId) : null,
      performedBy: raw.performedBy ? Number(raw.performedBy) : null,
      typeId: Number(raw.typeId),
      description: raw.description,
      createdAt: raw.createdAt.toISOString(),
      client: raw.client
        ? {
            id: Number(raw.client.id),
            personId: Number(raw.client.personId),
            createdAt: raw.client.createdAt.toISOString(),
            person: raw.client.person
              ? {
                  id: Number(raw.client.person.id),
                  documentTypeId: Number(raw.client.person.documentTypeId),
                  documentNumber: raw.client.person.documentNumber,
                  firstName: raw.client.person.firstName,
                  middleName: raw.client.person.middleName,
                  lastName: raw.client.person.lastName,
                  secondLastName: raw.client.person.secondLastName,
                  birthDate: raw.client.person.birthDate?.toISOString() ?? null,
                  phone: raw.client.person.phone,
                  email: raw.client.person.email,
                  statusId: Number(raw.client.person.statusId),
                  createdAt: raw.client.person.createdAt.toISOString(),
                  updatedAt: raw.client.person.updatedAt.toISOString(),
                }
              : undefined,
          }
        : undefined,
      type: raw.type
        ? { id: Number(raw.type.id), name: raw.type.name }
        : undefined,
    };
  }
}

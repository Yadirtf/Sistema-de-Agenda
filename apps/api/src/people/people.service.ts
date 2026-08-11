import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { Person, PaginatedResponse } from '@agendamiento/shared';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    search?: string;
    documentTypeId?: number;
    statusId?: number;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<Person>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (query?.documentTypeId) {
      where.documentTypeId = Number(query.documentTypeId);
    }

    if (query?.statusId) {
      where.statusId = Number(query.statusId);
    }

    if (query?.search) {
      const search = query.search.trim();
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.people.count({ where }),
      this.prisma.people.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { lastName: 'asc' },
        include: {
          documentType: true,
          status: true,
        },
      }),
    ]);

    const data: Person[] = items.map((item) => ({
      id: Number(item.id),
      documentTypeId: Number(item.documentTypeId),
      documentNumber: item.documentNumber,
      firstName: item.firstName,
      middleName: item.middleName,
      lastName: item.lastName,
      secondLastName: item.secondLastName,
      birthDate: item.birthDate ? item.birthDate.toISOString() : null,
      phone: item.phone,
      email: item.email,
      statusId: Number(item.statusId),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      documentType: {
        id: Number(item.documentType.id),
        name: item.documentType.name,
      },
      status: {
        id: Number(item.status.id),
        name: item.status.name,
      },
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

  async findOne(id: number): Promise<Person> {
    const item = await this.prisma.people.findUnique({
      where: { id },
      include: {
        documentType: true,
        status: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Persona con ID ${id} no encontrada`);
    }

    return {
      id: Number(item.id),
      documentTypeId: Number(item.documentTypeId),
      documentNumber: item.documentNumber,
      firstName: item.firstName,
      middleName: item.middleName,
      lastName: item.lastName,
      secondLastName: item.secondLastName,
      birthDate: item.birthDate ? item.birthDate.toISOString() : null,
      phone: item.phone,
      email: item.email,
      statusId: Number(item.statusId),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      documentType: {
        id: Number(item.documentType.id),
        name: item.documentType.name,
      },
      status: {
        id: Number(item.status.id),
        name: item.status.name,
      },
    };
  }

  async create(dto: CreatePersonDto): Promise<Person> {
    // Validar duplicado de documento
    const existing = await this.prisma.people.findUnique({
      where: {
        documentTypeId_documentNumber: {
          documentTypeId: dto.documentTypeId,
          documentNumber: dto.documentNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe una persona registrada con este tipo y número de documento');
    }

    const created = await this.prisma.people.create({
      data: {
        documentTypeId: dto.documentTypeId,
        documentNumber: dto.documentNumber,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        secondLastName: dto.secondLastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        phone: dto.phone,
        email: dto.email,
        statusId: dto.statusId,
      },
      include: {
        documentType: true,
        status: true,
      },
    });

    return this.findOne(Number(created.id));
  }

  async update(id: number, dto: UpdatePersonDto): Promise<Person> {
    await this.findOne(id);

    if (dto.documentTypeId && dto.documentNumber) {
      const existing = await this.prisma.people.findUnique({
        where: {
          documentTypeId_documentNumber: {
            documentTypeId: dto.documentTypeId,
            documentNumber: dto.documentNumber,
          },
        },
      });

      if (existing && Number(existing.id) !== id) {
        throw new ConflictException('Ya existe otra persona registrada con este documento');
      }
    }

    await this.prisma.people.update({
      where: { id },
      data: {
        documentTypeId: dto.documentTypeId,
        documentNumber: dto.documentNumber,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        secondLastName: dto.secondLastName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        phone: dto.phone,
        email: dto.email,
        statusId: dto.statusId,
      },
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.people.delete({ where: { id } });
  }
}

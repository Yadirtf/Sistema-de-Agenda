import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserWithRoles, PaginatedResponse } from '@agendamiento/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    search?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatedResponse<UserWithRoles>> {
    const page = Number(query?.page) || 1;
    const perPage = Number(query?.perPage) || 20;
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (query?.search) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { person: { firstName: { contains: search, mode: 'insensitive' } } },
        { person: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
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
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ]);

    const data: UserWithRoles[] = items.map((user) => ({
      id: Number(user.id),
      personId: Number(user.personId),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      person: {
        id: Number(user.person.id),
        documentTypeId: Number(user.person.documentTypeId),
        documentNumber: user.person.documentNumber,
        firstName: user.person.firstName,
        middleName: user.person.middleName,
        lastName: user.person.lastName,
        secondLastName: user.person.secondLastName,
        birthDate: user.person.birthDate ? user.person.birthDate.toISOString() : null,
        phone: user.person.phone,
        email: user.person.email,
        statusId: Number(user.person.statusId),
        createdAt: user.person.createdAt.toISOString(),
        updatedAt: user.person.updatedAt.toISOString(),
        documentType: {
          id: Number(user.person.documentType.id),
          name: user.person.documentType.name,
        },
        status: {
          id: Number(user.person.status.id),
          name: user.person.status.name,
        },
      },
      roles: user.userRoles.map((ur) => ({
        id: Number(ur.role.id),
        name: ur.role.name,
      })),
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

  async findOne(id: number): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        person: {
          include: {
            documentType: true,
            status: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return {
      id: Number(user.id),
      personId: Number(user.personId),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      person: {
        id: Number(user.person.id),
        documentTypeId: Number(user.person.documentTypeId),
        documentNumber: user.person.documentNumber,
        firstName: user.person.firstName,
        middleName: user.person.middleName,
        lastName: user.person.lastName,
        secondLastName: user.person.secondLastName,
        birthDate: user.person.birthDate ? user.person.birthDate.toISOString() : null,
        phone: user.person.phone,
        email: user.person.email,
        statusId: Number(user.person.statusId),
        createdAt: user.person.createdAt.toISOString(),
        updatedAt: user.person.updatedAt.toISOString(),
        documentType: {
          id: Number(user.person.documentType.id),
          name: user.person.documentType.name,
        },
        status: {
          id: Number(user.person.status.id),
          name: user.person.status.name,
        },
      },
      roles: user.userRoles.map((ur) => ({
        id: Number(ur.role.id),
        name: ur.role.name,
      })),
    };
  }

  async create(dto: CreateUserDto): Promise<UserWithRoles> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    const existingPersonUser = await this.prisma.user.findUnique({
      where: { personId: dto.personId },
    });

    if (existingPersonUser) {
      throw new ConflictException('Esta persona ya tiene una cuenta de usuario asignada');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          personId: dto.personId,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
        },
      });

      await tx.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      });

      return user;
    });

    return this.findOne(Number(created.id));
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserWithRoles> {
    await this.findOne(id);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (existing && Number(existing.id) !== id) {
        throw new ConflictException('El correo electrónico ya está registrado por otro usuario');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.email) updateData.email = dto.email.toLowerCase().trim();
      if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 10);

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id },
          data: updateData,
        });
      }

      if (dto.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }
}

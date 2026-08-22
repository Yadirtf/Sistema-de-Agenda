import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserWithRoles, PaginatedResponse, Role } from '@agendamiento/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Mapper ────────────────────────────────────────────────

  private mapUser(user: any): UserWithRoles {
    return {
      id: Number(user.id),
      personId: Number(user.personId),
      email: user.email,
      isActive: Number(user.person.statusId) === 1,
      createdAt: user.createdAt.toISOString(),
      person: {
        id: Number(user.person.id),
        documentTypeId: Number(user.person.documentTypeId),
        documentNumber: user.person.documentNumber,
        firstName: user.person.firstName,
        middleName: user.person.middleName ?? null,
        lastName: user.person.lastName,
        secondLastName: user.person.secondLastName ?? null,
        birthDate: user.person.birthDate ? user.person.birthDate.toISOString() : null,
        phone: user.person.phone ?? null,
        email: user.person.email ?? null,
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
      roles: user.userRoles.map((ur: any): Role => ({
        id: Number(ur.role.id),
        name: ur.role.name,
        description: ur.role.description ?? null,
        isSystem: ur.role.isSystem,
        permissions: ur.role.rolePermissions?.map((rp: any) => ({
          id: Number(rp.permission.id),
          name: rp.permission.name,
          label: rp.permission.label,
          module: rp.permission.module,
        })) ?? [],
      })),
    };
  }

  // ── Include estándar para queries ─────────────────────────

  private get userInclude() {
    return {
      person: {
        include: {
          documentType: true,
          status: true,
        },
      },
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    };
  }

  // ── findAll ───────────────────────────────────────────────

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
        { person: { documentNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: this.userInclude,
      }),
    ]);

    return {
      success: true,
      data: items.map((u) => this.mapUser(u)),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── findOne ───────────────────────────────────────────────

  async findOne(id: number): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.mapUser(user);
  }

  // ── create (flujo unificado: persona + usuario) ───────────

  async create(dto: CreateUserDto): Promise<UserWithRoles> {
    const emailNorm = dto.email.toLowerCase().trim();

    // Verificar email único
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: emailNorm },
    });
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está en uso');
    }

    // Verificar documento único
    const existingDoc = await this.prisma.people.findUnique({
      where: {
        documentTypeId_documentNumber: {
          documentTypeId: dto.documentTypeId,
          documentNumber: dto.documentNumber.trim(),
        },
      },
    });
    if (existingDoc) {
      throw new ConflictException(
        'Ya existe una persona registrada con ese tipo y número de documento',
      );
    }

    // Verificar que los roles existen
    await this.validateRoleIds(dto.roleIds);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      // 1. Crear la persona
      const person = await tx.people.create({
        data: {
          documentTypeId: dto.documentTypeId,
          documentNumber: dto.documentNumber.trim(),
          firstName: dto.firstName.trim(),
          middleName: dto.middleName?.trim() ?? null,
          lastName: dto.lastName.trim(),
          secondLastName: dto.secondLastName?.trim() ?? null,
          phone: dto.phone?.trim() ?? null,
          email: emailNorm,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          statusId: 1, // Activo
        },
      });

      // 2. Crear el usuario vinculado a la persona
      const user = await tx.user.create({
        data: {
          personId: person.id,
          email: emailNorm,
          passwordHash,
        },
      });

      // 3. Asignar roles
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

  // ── update ─────────────────────────────────────────────────

  async update(id: number, dto: UpdateUserDto): Promise<UserWithRoles> {
    await this.findOne(id);

    if (dto.email) {
      const emailNorm = dto.email.toLowerCase().trim();
      const existing = await this.prisma.user.findUnique({
        where: { email: emailNorm },
      });
      if (existing && Number(existing.id) !== id) {
        throw new ConflictException('El correo electrónico ya está registrado por otro usuario');
      }
    }

    if (dto.roleIds) {
      await this.validateRoleIds(dto.roleIds);
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.email) updateData.email = dto.email.toLowerCase().trim();
      if (dto.password) updateData.passwordHash = await bcrypt.hash(dto.password, 10);

      if (Object.keys(updateData).length > 0) {
        await tx.user.update({ where: { id }, data: updateData });
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

  // ── toggleStatus (activar / desactivar) ──────────────────

  async toggleStatus(id: number): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const currentStatusId = Number(user.person.statusId);
    const newStatusId = currentStatusId === 1 ? 2 : 1; // 1=Activo, 2=Inactivo

    await this.prisma.people.update({
      where: { id: user.personId },
      data: { statusId: newStatusId },
    });

    return this.findOne(id);
  }

  // ── remove ────────────────────────────────────────────────

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }

  // ── Helpers ───────────────────────────────────────────────

  private async validateRoleIds(roleIds: number[]): Promise<void> {
    if (!roleIds || roleIds.length === 0) {
      throw new BadRequestException('Debe asignar al menos un rol');
    }
    const found = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    if (found.length !== roleIds.length) {
      const foundIds = found.map((r) => Number(r.id));
      const notFound = roleIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Los siguientes IDs de rol no existen: ${notFound.join(', ')}`,
      );
    }
  }
}

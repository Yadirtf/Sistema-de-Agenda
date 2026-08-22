import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import type { Role, Permission } from '@agendamiento/shared';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Mappers ────────────────────────────────────────────────

  private mapPermission(p: any): Permission {
    return {
      id: Number(p.id),
      name: p.name,
      label: p.label,
      module: p.module,
    };
  }

  private mapRole(r: any): Role {
    return {
      id: Number(r.id),
      name: r.name,
      description: r.description ?? null,
      isSystem: r.isSystem,
      permissions: r.rolePermissions
        ? r.rolePermissions.map((rp: any) => this.mapPermission(rp.permission))
        : [],
    };
  }

  // ── Listar todos los roles ─────────────────────────────────

  async findAll(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
    return roles.map((r) => this.mapRole(r));
  }

  // ── Obtener un rol por ID ──────────────────────────────────

  async findOne(id: number): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return this.mapRole(role);
  }

  // ── Listar todos los permisos del sistema ──────────────────

  async findAllPermissions(): Promise<Permission[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
    return permissions.map((p) => this.mapPermission(p));
  }

  // ── Crear rol ──────────────────────────────────────────────

  async create(dto: CreateRoleDto): Promise<Role> {
    // Verificar nombre único
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un rol con el nombre "${dto.name}"`);
    }

    // Verificar que los permissionIds existen
    await this.validatePermissionIds(dto.permissionIds);

    const created = await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() ?? null,
          isSystem: false,
        },
      });

      await tx.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
      });

      return role;
    });

    return this.findOne(Number(created.id));
  }

  // ── Actualizar rol ─────────────────────────────────────────

  async update(id: number, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    // No se puede cambiar el nombre de roles de sistema
    if (role.isSystem && dto.name && dto.name.trim() !== role.name) {
      throw new BadRequestException(
        'No se puede cambiar el nombre de un rol de sistema',
      );
    }

    // Verificar nombre único si se está cambiando
    if (dto.name && dto.name.trim() !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: dto.name.trim() },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un rol con el nombre "${dto.name}"`);
      }
    }

    if (dto.permissionIds) {
      await this.validatePermissionIds(dto.permissionIds);
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.name && !role.isSystem) updateData.name = dto.name.trim();
      if (dto.description !== undefined) updateData.description = dto.description?.trim() ?? null;

      if (Object.keys(updateData).length > 0) {
        await tx.role.update({ where: { id }, data: updateData });
      }

      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    });

    return this.findOne(id);
  }

  // ── Eliminar rol ───────────────────────────────────────────

  async remove(id: number): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    if (role.isSystem) {
      throw new BadRequestException(
        'No se puede eliminar un rol de sistema. Solo los roles personalizados son eliminables.',
      );
    }

    // Verificar que no haya usuarios activos con este rol
    const usersWithRole = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (usersWithRole > 0) {
      throw new ConflictException(
        `No se puede eliminar el rol porque tiene ${usersWithRole} usuario(s) asignado(s). Reasigne los usuarios primero.`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
  }

  // ── Helpers ────────────────────────────────────────────────

  private async validatePermissionIds(permissionIds: number[]): Promise<void> {
    if (!permissionIds || permissionIds.length === 0) {
      throw new BadRequestException('Debe asignar al menos un permiso al rol');
    }

    const found = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });

    if (found.length !== permissionIds.length) {
      const foundIds = found.map((p) => Number(p.id));
      const notFound = permissionIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Los siguientes IDs de permiso no existen: ${notFound.join(', ')}`,
      );
    }
  }
}

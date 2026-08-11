import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOG_TYPES, CatalogType, CatalogItem } from '@agendamiento/shared';

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(type: string): Promise<CatalogItem[]> {
    switch (type) {
      case CATALOG_TYPES.DOCUMENT_TYPES:
        return (await this.prisma.documentType.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.ROLES:
        return (await this.prisma.role.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.PERSON_STATUSES:
        return (await this.prisma.personStatus.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.ENTRY_STATUSES:
        return (await this.prisma.entryStatus.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.PERIOD_STATUSES:
        return (await this.prisma.periodStatus.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.APPOINTMENT_STATUSES:
        return (await this.prisma.appointmentStatus.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.RESCHEDULING_REASONS:
        return (await this.prisma.reschedulingReason.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
          description: item.description,
        }));

      case CATALOG_TYPES.FOLLOW_UP_TYPES:
        return (await this.prisma.followUpType.findMany({ orderBy: { id: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
        }));

      case CATALOG_TYPES.SCHEDULING_INTERVALS:
        return (await this.prisma.schedulingInterval.findMany({ orderBy: { days: 'asc' } })).map((item) => ({
          id: Number(item.id),
          name: item.name,
          days: item.days,
          description: item.description,
        }));

      default:
        throw new BadRequestException(`Catálogo desconocido: '${type}'`);
    }
  }

  async getAllCatalogs(): Promise<Record<string, CatalogItem[]>> {
    const catalogKeys = Object.values(CATALOG_TYPES);
    const result: Record<string, CatalogItem[]> = {};

    for (const key of catalogKeys) {
      result[key] = await this.getCatalog(key);
    }

    return result;
  }
}

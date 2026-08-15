import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { Public } from '../common/decorators/public.decorator';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';

@UseInterceptors(CacheInterceptor)
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.catalogsService.getAllCatalogs();
  }

  @Public()
  @Get(':type')
  async getByType(@Param('type') type: string) {
    return this.catalogsService.getCatalog(type);
  }
}

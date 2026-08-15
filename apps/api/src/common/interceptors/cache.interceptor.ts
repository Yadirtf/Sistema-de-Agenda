import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Solo cachear peticiones GET
    if (method !== 'GET') {
      return next.handle();
    }

    const cacheKey = `cache:${url}`;
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      return of(JSON.parse(cachedData));
    }

    return next.handle().pipe(
      tap(async (data) => {
        if (data) {
          // Cachear por 5 minutos por defecto para catálogos
          await this.redisService.set(cacheKey, JSON.stringify(data), 300);
        }
      }),
    );
  }
}

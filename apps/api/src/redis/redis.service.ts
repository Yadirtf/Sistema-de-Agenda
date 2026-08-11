import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryFallback = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis connection retries exceeded. Falling back to in-memory store.');
            return null;
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Connected to Redis');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis error: ${err.message}. Using in-memory fallback.`);
      });
    } catch (error) {
      this.logger.warn(`Could not initialize Redis client. Using in-memory fallback.`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } else {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
      this.memoryFallback.set(key, { value, expiresAt });
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      return this.client.get(key);
    }
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      await this.client.del(key);
    } else {
      this.memoryFallback.delete(key);
    }
  }
}

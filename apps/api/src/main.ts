import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';

// Forzar zona horaria local
process.env.TZ = 'America/Bogota';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3001);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');

  // Prefix
  app.setGlobalPrefix(prefix);

  // Helmet para seguridad de cabeceras
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  // CORS
  app.enableCors({
    origin: configService.get<string>('ALLOWED_ORIGINS', '*').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API REST escuchando en: http://localhost:${port}/${prefix}`);
}

bootstrap();

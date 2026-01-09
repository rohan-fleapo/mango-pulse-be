import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { swagger } from './libs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  // Middleware
  app.use(cookieParser());
  app.use(helmet());
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // CORS
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:8080'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = configService.get<number>('PORT') || 3000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  swagger.setup(app);

  logger.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);

  await app.listen(port);

  logger.log(`🚀 MangoPulse API is running on: http://localhost:${port}/api`);
  if (nodeEnv === 'development') {
    logger.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
  }
  logger.log(`📋 Auth endpoints: http://localhost:${port}/api/auth`);
  logger.log(`👥 Users endpoints: http://localhost:${port}/api/users`);
  logger.log(`📹 Zoom webhooks: http://localhost:${port}/api/zoom`);
}

void bootstrap();

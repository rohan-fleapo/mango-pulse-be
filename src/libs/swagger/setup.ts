import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setup = (app: INestApplication): void => {
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  const builder = new DocumentBuilder()
    .setTitle('Mango Pulse API')
    .setDescription(
      'Behavioral CRM - Smart Engagement Automator API Documentation',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name must match @ApiBearerAuth('JWT-auth') in controllers
    )
    .addServer(`http://localhost:${port}`, 'Local Development Server');

  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config);

  const options = {
    explorer: true,
    persistAuthorization: true, // Persist authorization across page refreshes
    defaultModelsExpandDepth: 1,
    tryItOutEnabled: true,
  };

  SwaggerModule.setup('api-docs', app, document, options);
};

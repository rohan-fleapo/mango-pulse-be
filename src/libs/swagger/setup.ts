import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const setup = (app: INestApplication): void => {
  const builder = new DocumentBuilder()
    .setTitle('Mango Pulse API')
    .addBearerAuth();

  const config = builder.build();
  const document = SwaggerModule.createDocument(app, config);

  const options = {
    explorer: true,
  };

  SwaggerModule.setup('api-docs', app, document, options);
};

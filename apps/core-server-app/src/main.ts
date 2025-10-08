import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getConfig } from './config/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform payloads to DTO instances
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Innogram Core API')
    .setDescription('Core microservice API documentation')
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
      'JWT-auth', // This name is used in @ApiBearerAuth() decorator
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = getConfig().coreServicePort;
  await app.listen(port);

  console.log(`✓ Core Server is running on: http://localhost:${port}`);
  console.log(`✓ Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`✓ Health check: http://localhost:${port}/api/health`);
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});

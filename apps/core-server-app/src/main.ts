import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

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
      disableErrorMessages: false, // Keep error messages in production
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Core Server API')
    .setDescription('The core server API for Innogram social media platform')
    .setVersion('1.0')
    .addTag('Users', 'User management endpoints')
    .addTag('Health', 'Application health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.CORE_SERVER_PORT || 8000;
  await app.listen(port);

  console.log(`Core Server is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log(`Users API: http://localhost:${port}/api/users`);
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});

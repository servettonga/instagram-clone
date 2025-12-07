import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { getConfig } from './config/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = getConfig();

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), config.uploadDir), {
    prefix: '/uploads/',
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS configuration
  // In development, allow any origin for local network testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  app.enableCors({
    origin: isDevelopment ? true : config.frontendUrl,
    credentials: true, // Allow cookies (for future cookie-based auth if needed)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'], // Allow client to read Authorization header
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform payloads to DTO instances
    }),
  );

  // Swagger documentation
  const isProduction = process.env.NODE_ENV === 'production';
  const swaggerBuilder = new DocumentBuilder()
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
    .addTag('Users', 'User management');

  // Add server URL for production to handle /innogram base path
  if (isProduction && process.env.BACKEND_URL) {
    swaggerBuilder.addServer(process.env.BACKEND_URL, 'Production server');
  }

  const swaggerConfig = swaggerBuilder.build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.coreServicePort;
  // Listen on all interfaces (0.0.0.0) to allow local network access in development
  await app.listen(port, '0.0.0.0');

  console.log(`✓ Core Server is running on: http://localhost:${port}`);
  console.log(`✓ Network access: http://0.0.0.0:${port}`);
  console.log(`✓ Swagger documentation: http://localhost:${port}/api/docs`);
  console.log(`✓ Health check: http://localhost:${port}/api/health`);
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});

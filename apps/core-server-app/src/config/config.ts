export const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Server
    coreServicePort: process.env.CORE_SERVER_PORT || 8000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:8000',

    // File Upload
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10), // 10MB

    // Storage Configuration
    storage: {
      // 'local' for development, 'r2' for production with Cloudflare R2
      type: isDevelopment ? 'local' : process.env.STORAGE_TYPE || 'r2',
      r2: {
        endpoint: process.env.CLOUDFLARE_ENDPOINT_S3_CLIENT || '',
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
        bucket: process.env.CLOUDFLARE_BUCKET || 'innogram-uploads',
        // Public URL for accessing files (R2 public bucket or custom domain)
        publicUrl: process.env.CLOUDFLARE_PUBLIC_URL || '',
      },
    },

    // PostgreSQL
    databaseUrl: isDevelopment
      ? process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5433/innogram?schema=public'
      : process.env.DATABASE_URL ||
        'postgresql://postgres:password@postgres:5432/innogram?schema=public',

    // Redis
    redisUrl: isDevelopment
      ? `redis://:${process.env.REDIS_PASSWORD || 'password'}@localhost:${process.env.REDIS_PORT || 6380}`
      : `redis://:${process.env.REDIS_PASSWORD || 'password'}@redis:6379`,

    // RabbitMQ
    rabbitmqUrl: isDevelopment
      ? process.env.RABBITMQ_URL ||
        'amqp://admin:rabbitmq_password@localhost:5672'
      : process.env.RABBITMQ_URL ||
        'amqp://admin:rabbitmq_password@rabbitmq:5672',

    // Auth Service (internal)
    authServiceUrl: isDevelopment
      ? process.env.AUTH_SERVICE_URL || 'http://localhost:4000'
      : process.env.AUTH_SERVICE_URL || 'http://auth-service:4000',

    // Auth Service (public - for OAuth redirects from browser)
    authServicePublicUrl:
      process.env.AUTH_PUBLIC_URL || 'http://localhost:4000',
  };
};

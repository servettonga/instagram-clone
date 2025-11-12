export const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Server
    coreServicePort: process.env.CORE_SERVER_PORT || 8000,

    // PostgreSQL
    databaseUrl: isDevelopment
      ? process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5433/innogram?schema=public'
      : process.env.DATABASE_URL ||
        'postgresql://postgres:password@postgres:5432/innogram?schema=public',

    // MongoDB
    mongodbUrl: isDevelopment
      ? process.env.MONGODB_URL ||
        'mongodb://admin:password@localhost:27018/innogram_messages?authSource=admin'
      : process.env.MONGODB_URL ||
        'mongodb://admin:password@mongodb:27017/innogram_messages?authSource=admin',

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

    // Auth Service
    authServiceUrl: isDevelopment
      ? process.env.AUTH_SERVICE_URL || 'http://localhost:4000'
      : process.env.AUTH_SERVICE_URL || 'http://auth-service:4000',
  };
};

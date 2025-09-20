export const getDatabaseConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // PostgreSQL
    databaseUrl: isDevelopment
      ? process.env.DATABASE_URL ||
        'postgresql://postgres:password@localhost:5433/polaroid?schema=public'
      : process.env.DATABASE_URL ||
        'postgresql://postgres:password@postgres:5432/polaroid?schema=public',

    // MongoDB
    mongodbUrl: isDevelopment
      ? process.env.MONGODB_URL ||
        'mongodb://admin:password@localhost:27018/polaroid_messages?authSource=admin'
      : process.env.MONGODB_URL ||
        'mongodb://admin:password@mongodb:27017/polaroid_messages?authSource=admin',

    // Redis
    redisUrl: isDevelopment
      ? `redis://:${process.env.REDIS_PASSWORD || 'password'}@localhost:${process.env.REDIS_PORT || 6380}`
      : `redis://:${process.env.REDIS_PASSWORD || 'password'}@redis:6379`,
  };
};

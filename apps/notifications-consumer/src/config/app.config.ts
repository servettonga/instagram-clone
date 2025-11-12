export const getConfig = () => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    // Environment
    nodeEnv: process.env.NODE_ENV || "development",

    // PostgreSQL
    databaseUrl: isDevelopment
      ? process.env.DATABASE_URL ||
        "postgresql://postgres:password@localhost:5433/innogram?schema=public"
      : process.env.DATABASE_URL ||
        "postgresql://postgres:password@postgres:5432/innogram?schema=public",

    // RabbitMQ
    rabbitmqUrl: isDevelopment
      ? process.env.RABBITMQ_URL ||
        "amqp://admin:rabbitmq_password@localhost:5672"
      : process.env.RABBITMQ_URL ||
        "amqp://admin:rabbitmq_password@rabbitmq:5672",

    // Email Configuration
    mailConfig: {
      host: process.env.MAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.MAIL_PORT || "587", 10),
      user: process.env.MAIL_USER || "",
      password: process.env.MAIL_PASSWORD || "",
      from: process.env.MAIL_FROM || "noreply@innogram.com",
    },

    // Frontend URL
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  };
};

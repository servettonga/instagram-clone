import * as Joi from "joi";

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  DATABASE_URL: Joi.string().required(),
  RABBITMQ_URL: Joi.string().required(),
  MAIL_HOST: Joi.string().default("smtp.gmail.com"),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().allow("").optional(),
  MAIL_PASSWORD: Joi.string().allow("").optional(),
  MAIL_FROM: Joi.string().default("notifications@mg.web-dev.codes"),
  FRONTEND_URL: Joi.string().default("http://localhost:3000"),
});

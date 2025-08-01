// src/config/configuration.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // 应用配置
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // 数据库配置
  DATABASE_URL: Joi.string().required(),

  // Redis配置
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // JWT配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // 跨域配置
  ALLOWED_ORIGINS: Joi.string().required(),
});

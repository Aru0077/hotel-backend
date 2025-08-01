// src/config/configuration.ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // 应用配置
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().required(),

  // 数据库配置
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // 可选配置示例
  API_TIMEOUT: Joi.number().default(5000),
  ENABLE_CACHE: Joi.boolean().default(true),
});

// src/config/configuration.ts - 配置工厂函数
import * as Joi from 'joi';
import { AppConfig } from './config.types';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  ALLOWED_ORIGINS: Joi.string().required(),
  API_TIMEOUT: Joi.number().default(5000),
  ENABLE_CACHE: Joi.boolean().default(true),
});

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const redisPort = process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT, 10)
    : 6379;
  const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0;
  const apiTimeout = process.env.API_TIMEOUT
    ? parseInt(process.env.API_TIMEOUT, 10)
    : 5000;
  const enableCache = process.env.ENABLE_CACHE !== 'false';

  return {
    app: {
      port,
      nodeEnv,
      isDevelopment: nodeEnv === 'development',
      isProduction: nodeEnv === 'production',
    },
    database: {
      url: process.env.DATABASE_URL || '',
    },
    redis: {
      host: process.env.REDIS_HOST || '',
      port: redisPort,
      password: process.env.REDIS_PASSWORD || '',
      db: redisDb,
    },
    jwt: {
      secret: process.env.JWT_SECRET || '',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET || '',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    cors: {
      allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
        : [],
    },
    features: {
      apiTimeout,
      enableCache,
    },
  };
};

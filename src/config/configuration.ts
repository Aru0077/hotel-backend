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
  // 新增验证
  BCRYPT_SALT_ROUNDS: Joi.number().default(12),
  PASSWORD_MIN_LENGTH: Joi.number().default(8),
  PASSWORD_MAX_LENGTH: Joi.number().default(128),
  USER_SESSION_TTL: Joi.number().default(1800),
  MAX_LOGIN_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCKOUT_DURATION: Joi.number().default(900),
  USER_CACHE_TTL: Joi.number().default(300),
  CREDENTIAL_CACHE_TTL: Joi.number().default(600),
  FACEBOOK_APP_ID: Joi.string().required(),
  FACEBOOK_APP_SECRET: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  // 阿里云短信
  ALIYUN_SMS_ACCESS_KEY_ID: Joi.string().required(),
  ALIYUN_SMS_ACCESS_KEY_SECRET: Joi.string().required(),
  ALIYUN_SMS_ENDPOINT: Joi.string().default('dysmsapi.aliyuncs.com'),
  ALIYUN_SMS_SIGN_NAME: Joi.string().required(),
  ALIYUN_SMS_TEMPLATE_REGISTER: Joi.string().required(),
  ALIYUN_SMS_TEMPLATE_LOGIN: Joi.string().required(),
  ALIYUN_SMS_TEMPLATE_RESET_PASSWORD: Joi.string().required(),
  ALIYUN_SMS_TEMPLATE_VERIFY_EMAIL: Joi.string().required(),
  ALIYUN_SMS_TEMPLATE_VERIFY_PHONE: Joi.string().required(),
});

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
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
      url: process.env.DATABASE_URL ?? '',
    },
    redis: {
      host: process.env.REDIS_HOST ?? '',
      port: redisPort,
      password: process.env.REDIS_PASSWORD ?? '',
      db: redisDb,
    },
    jwt: {
      secret: process.env.JWT_SECRET ?? '',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
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
    security: {
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
      passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH ?? '8', 10),
      passwordMaxLength: parseInt(process.env.PASSWORD_MAX_LENGTH ?? '128', 10),
      userSessionTtl: parseInt(process.env.USER_SESSION_TTL ?? '1800', 10),
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '5', 10),
      accountLockoutDuration: parseInt(
        process.env.ACCOUNT_LOCKOUT_DURATION ?? '900',
        10,
      ),
      userCacheTtl: parseInt(process.env.USER_CACHE_TTL ?? '300', 10),
      credentialCacheTtl: parseInt(
        process.env.CREDENTIAL_CACHE_TTL ?? '600',
        10,
      ),
    },
    auth: {
      facebook: {
        appId: process.env.FACEBOOK_APP_ID ?? '',
        appSecret: process.env.FACEBOOK_APP_SECRET ?? '',
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
    sms: {
      aliyun: {
        accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID ?? '',
        accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET ?? '',
        endpoint: process.env.ALIYUN_SMS_ENDPOINT ?? 'dysmsapi.aliyuncs.com',
        signName: process.env.ALIYUN_SMS_SIGN_NAME ?? '',
        templates: {
          register: process.env.ALIYUN_SMS_TEMPLATE_REGISTER ?? '',
          login: process.env.ALIYUN_SMS_TEMPLATE_LOGIN ?? '',
          resetPassword: process.env.ALIYUN_SMS_TEMPLATE_RESET_PASSWORD ?? '',
          verifyEmail: process.env.ALIYUN_SMS_TEMPLATE_VERIFY_EMAIL ?? '',
          verifyPhone: process.env.ALIYUN_SMS_TEMPLATE_VERIFY_PHONE ?? '',
        },
      },
    },
  };
};

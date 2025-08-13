// src/config/config.types.ts - 配置类型定义
export interface AppConfig {
  app: {
    port: number;
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  features: {
    apiTimeout: number;
    enableCache: boolean;
  };
}

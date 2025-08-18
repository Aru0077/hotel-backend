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
  // 新增：密码安全配置
  security: {
    bcryptSaltRounds: number;
    passwordMinLength: number;
    passwordMaxLength: number;
    userSessionTtl: number;
    maxLoginAttempts: number;
    accountLockoutDuration: number;
    userCacheTtl: number;
    credentialCacheTtl: number;
  };
  // 新增：第三方认证配置
  auth: {
    facebook: {
      appId: string;
      appSecret: string;
    };
    google: {
      clientId: string;
      clientSecret: string;
    };
  };
  sms: {
    aliyun: {
      accessKeyId: string;
      accessKeySecret: string;
      endpoint: string;
      signName: string;
      templates: {
        register: string;
        login: string;
        resetPassword: string;
        verifyEmail: string;
        verifyPhone: string;
      };
    };
  };
}

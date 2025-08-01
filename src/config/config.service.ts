// src/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // 应用配置
  get port(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  get nodeEnv(): string {
    return this.configService.getOrThrow<string>('NODE_ENV');
  }

  // 数据库配置
  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  // Redis配置
  get redisConfig() {
    return {
      host: this.configService.getOrThrow<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      db: this.configService.get<number>('REDIS_DB', 0),
    };
  }

  // JWT配置
  get jwtConfig() {
    return {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      refreshSecret:
        this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      refreshExpiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ),
    };
  }

  // 跨域配置
  get allowedOrigins(): string[] {
    const origins = this.configService.getOrThrow<string>('ALLOWED_ORIGINS');
    return origins.split(',').map((origin) => origin.trim());
  }

  // 使用 get 并提供默认值
  get apiTimeout(): number {
    return this.configService.get<number>('API_TIMEOUT', 5000);
  }

  // 处理可选布尔值
  get enableCache(): boolean {
    return this.configService.get<boolean>('ENABLE_CACHE', true);
  }
}

// src/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // 使用 getOrThrow 确保值存在 + 类型转换
  get port(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  get appName(): string {
    return this.configService.getOrThrow<string>('APP_NAME');
  }

  // 使用 get 并提供默认值
  get apiTimeout(): number {
    return this.configService.get<number>('API_TIMEOUT', 5000);
  }

  // 处理可选布尔值
  get enableCache(): boolean {
    return this.configService.get<boolean>('ENABLE_CACHE', true);
  }

  // 结构化配置
  get dbConfig() {
    return {
      host: this.configService.getOrThrow<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT', 5432),
      user: this.configService.getOrThrow<string>('DB_USER'),
      password: this.configService.getOrThrow<string>('DB_PASSWORD'),
      database: this.configService.getOrThrow<string>('DB_NAME'),
    };
  }
}

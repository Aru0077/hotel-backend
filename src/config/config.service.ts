// src/config/config.service.ts - 增强的配置服务
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config.types';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService<AppConfig, true>) {}

  // 应用配置
  get app() {
    return this.configService.get('app', { infer: true });
  }

  get port(): number {
    return this.app.port;
  }

  get nodeEnv(): string {
    return this.app.nodeEnv;
  }

  get isDevelopment(): boolean {
    return this.app.isDevelopment;
  }

  get isProduction(): boolean {
    return this.app.isProduction;
  }

  // 数据库配置
  get database() {
    return this.configService.get('database', { infer: true });
  }

  get databaseUrl(): string {
    return this.database.url;
  }

  // Redis配置
  get redis() {
    return this.configService.get('redis', { infer: true });
  }

  get redisConfig() {
    return this.redis;
  }

  // JWT配置
  get jwt() {
    return this.configService.get('jwt', { infer: true });
  }

  get jwtConfig() {
    return this.jwt;
  }

  // 跨域配置
  get cors() {
    return this.configService.get('cors', { infer: true });
  }

  get allowedOrigins(): string[] {
    return this.cors.allowedOrigins;
  }

  // 功能配置
  get features() {
    return this.configService.get('features', { infer: true });
  }

  // 新增：安全配置
  get security() {
    return this.configService.get('security', { infer: true });
  }

  // 新增：第三方认证配置
  get auth() {
    return this.configService.get('auth', { infer: true });
  }

  get apiTimeout(): number {
    return this.features.apiTimeout;
  }

  get enableCache(): boolean {
    return this.features.enableCache;
  }

  // 新增：短信配置
  get sms() {
    return this.configService.get('sms', { infer: true });
  }

  get aliyunSmsConfig() {
    return this.sms.aliyun;
  }
}

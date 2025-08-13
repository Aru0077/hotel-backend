// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  /**
   * 就绪检查 - 检查所有依赖服务
   */
  @Get('readiness')
  @HealthCheck()
  async checkReadiness(): Promise<HealthCheckResult> {
    const checks = [() => this.prismaHealth.isHealthy('database')];

    // 只有在 Redis 已连接时才检查其健康状态
    // 这样可以让 Redis 成为可选依赖
    if (this.redisHealth['redisService'].isConnected()) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(checks);
  }

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const checks = [() => this.prismaHealth.isHealthy('database')];

    // Redis 作为可选服务
    if (this.redisHealth['redisService'].isConnected()) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(checks);
  }
}

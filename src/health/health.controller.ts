// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      (): HealthIndicatorResult => ({
        app: {
          status: 'up',
          environment: this.config.nodeEnv,
          port: this.config.port,
        },
      }),
      async (): Promise<HealthIndicatorResult> => {
        const isHealthy = await this.prisma.isHealthy();
        return {
          database: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
      async (): Promise<HealthIndicatorResult> => {
        const isHealthy = await this.redis.isHealthy();
        return {
          redis: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      (): HealthIndicatorResult => ({
        app: {
          status: 'up',
          timestamp: new Date().toISOString(),
        },
      }),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        const isHealthy = await this.prisma.isHealthy();
        return {
          database: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
      async (): Promise<HealthIndicatorResult> => {
        const isHealthy = await this.redis.isHealthy();
        return {
          redis: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
    ]);
  }
}

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
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('健康检查')
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
  @ApiOperation({ summary: '系统整体健康检查' })
  @ApiResponse({
    status: 200,
    description: '健康检查成功',
    type: Object, // 或者创建专门的响应DTO类型
  })
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
  @ApiOperation({ summary: '存活性检查' })
  @ApiResponse({
    status: 200,
    description: '存活性检查成功',
    type: Object,
  })
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
  @ApiOperation({ summary: '就绪性检查' })
  @ApiResponse({
    status: 200,
    description: '就绪性检查成功',
    type: Object,
  })
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

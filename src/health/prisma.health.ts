// src/health/prisma.health.ts - 使用新的 HealthIndicatorService API
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    super();
  }

  /**
   * 检查数据库连接状态 - 使用新的 API
   */
  async isHealthy(
    key = 'database',
    timeout = 3000,
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Health check timeout after ${timeout}ms`)),
        timeout,
      ),
    );

    try {
      await Promise.race([
        this.prismaService.$queryRaw`SELECT 1`,
        timeoutPromise,
      ]);
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : 'Database connection failed',
      });
    }
  }
}

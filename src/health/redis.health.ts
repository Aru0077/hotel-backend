// src/health/redis.health.ts
import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    private readonly redisService: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {
    super();
  }

  /**
   * 检查 Redis 连接状态
   */
  async isHealthy(
    key = 'redis',
    timeout = 3000,
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    // 如果 Redis 未连接，直接返回 down 状态
    if (!this.redisService.isConnected()) {
      return indicator.down({
        message: 'Redis is not connected',
      });
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`Redis health check timeout after ${timeout}ms`)),
        timeout,
      ),
    );

    try {
      const result = await Promise.race([
        this.redisService.ping(),
        timeoutPromise,
      ]);

      if (result === 'PONG') {
        return indicator.up();
      } else {
        return indicator.down({
          message: 'Unexpected PING response',
        });
      }
    } catch (error) {
      return indicator.down({
        message:
          error instanceof Error ? error.message : 'Redis health check failed',
      });
    }
  }
}

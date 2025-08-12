// src/health/health.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  details?: any;
  error?: string;
}

export interface OverallHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: HealthCheckResult[];
  totalResponseTime: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private prisma: PrismaService) {}

  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.prisma.healthCheck();
      const responseTime = Date.now() - startTime;

      if (!isHealthy) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime,
          error: 'Database query failed',
        };
      }

      const connectionInfo = await this.prisma.getConnectionInfo();

      return {
        service: 'database',
        status: 'healthy',
        responseTime,
        details: {
          database: connectionInfo.databaseName,
          version: connectionInfo.serverVersion?.split(' ')[0],
          connectionPool: 'active',
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async checkRedisHealth(): Promise<HealthCheckResult> {
    // TODO: 实现Redis健康检查
    // 当您添加Redis服务时，可以在这里实现
    const startTime = Date.now();

    try {
      // 示例：await this.redis.ping();
      return {
        service: 'redis',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          message: 'Redis service not yet implemented',
        },
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async checkMemoryHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();
    const heapUsedPercent =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (heapUsedPercent > 90) {
      status = 'unhealthy';
    } else if (heapUsedPercent > 75) {
      status = 'degraded';
    }

    return {
      service: 'memory',
      status,
      responseTime: Date.now() - startTime,
      details: {
        heapUsedPercent: Math.round(heapUsedPercent),
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      },
    };
  }

  checkDiskHealth(): Promise<HealthCheckResult> {
    // TODO: 实现磁盘空间检查
    // 可以使用 node-disk-info 或类似的库
    const startTime = Date.now();

    return {
      service: 'disk',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        message: 'Disk monitoring not yet implemented',
      },
    };
  }

  async getOverallHealth(): Promise<OverallHealthStatus> {
    const startTime = Date.now();

    // 并行执行所有健康检查
    const healthChecks = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkMemoryHealth(),
      this.checkDiskHealth(),
    ]);

    const services: HealthCheckResult[] = healthChecks.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: 'unknown',
          status: 'unhealthy' as const,
          error: result.reason?.message || 'Health check failed',
        };
      }
    });

    // 确定整体状态
    const hasUnhealthy = services.some((s) => s.status === 'unhealthy');
    const hasDegraded = services.some((s) => s.status === 'degraded');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      totalResponseTime: Date.now() - startTime,
    };
  }
}

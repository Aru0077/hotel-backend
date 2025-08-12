// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DatabaseInfo {
  version: string;
  current_database: string;
}

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch {
      // 不需要使用error参数，避免ESLint警告
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection failed',
      };
    }
  }

  @Get('database')
  async checkDatabase() {
    const startTime = Date.now();
    try {
      // 明确指定返回类型以避免类型推断问题
      const result = await this.prisma.$queryRaw<DatabaseInfo[]>`
        SELECT version() as version, 
               current_database() as current_database
      `;

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          version: result[0]?.version || 'unknown',
          database: result[0]?.current_database || 'unknown',
        },
      };
    } catch (err) {
      // 安全地处理错误类型
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  @Get('memory')
  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      status: heapUsedPercent > 90 ? 'unhealthy' : 'healthy',
      heapUsedPercent: Math.round(heapUsedPercent),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      unit: 'MB',
    };
  }
}

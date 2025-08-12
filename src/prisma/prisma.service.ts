// src/prisma/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor() {
    super({
      // 添加日志配置（开发环境）
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error', 'warn'],

      // 添加错误格式化
      errorFormat:
        process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
    });

    // 配置查询中间件以监控性能
    if (process.env.NODE_ENV === 'development') {
      this.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();

        if (after - before > 1000) {
          this.logger.warn(
            `Query ${params.model}.${params.action} took ${after - before}ms`,
          );
        }

        return result;
      });
    }
  }

  async onModuleInit() {
    try {
      await this.connectWithRetry();
      this.logger.log('Database connection established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  private async connectWithRetry() {
    try {
      await this.$connect();
      this.retryCount = 0;
    } catch (error) {
      this.retryCount++;
      this.logger.warn(
        `Database connection attempt ${this.retryCount} failed. Retrying...`,
      );

      if (this.retryCount >= this.maxRetries) {
        throw new Error(`Failed to connect after ${this.maxRetries} attempts`);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 2000 * this.retryCount),
      );
      return this.connectWithRetry();
    }
  }

  // 健康检查方法
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  // 获取连接信息
  async getConnectionInfo() {
    try {
      // 对于PostgreSQL
      const result = await this.$queryRaw<
        Array<{ version: string; current_database: string }>
      >`
        SELECT version() as version, current_database() as current_database
      `;

      return {
        isConnected: true,
        databaseName: result[0]?.current_database,
        serverVersion: result[0]?.version,
      };
    } catch (error) {
      this.logger.error('Failed to get connection info', error);
      return {
        isConnected: false,
        databaseName: null,
        serverVersion: null,
      };
    }
  }

  // 清理空闲连接（用于优化连接池）
  async cleanupConnections() {
    try {
      await this.$disconnect();
      await this.$connect();
      this.logger.log('Connection pool refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh connections', error);
    }
  }
}

// src/prisma/prisma.service.ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // 仅在开发环境启用查询日志
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 连接数据库（带重试）
   * 根据官方文档建议，在应用层实现重试逻辑
   */
  private async connectWithRetry(retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to database');
        return;
      } catch (error) {
        const attempt = i + 1;
        this.logger.warn(
          `Database connection attempt ${attempt}/${retries} failed`,
        );

        if (attempt === retries) {
          this.logger.error('Failed to connect to database');
          throw error;
        }

        // 指数退避：1秒、2秒、4秒
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i)),
        );
      }
    }
  }

  /**
   * 执行查询（带重试）
   * 用于处理暂时性连接错误
   */
  async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const isRetryable = this.isRetryableError(error);
        const attempt = i + 1;

        if (!isRetryable || attempt === retries) {
          throw error;
        }

        this.logger.warn(
          `Query attempt ${attempt}/${retries} failed: ${error.message}`,
        );

        // 对于连接错误，尝试重新连接
        if (error.code === 'P1001' || error.code === 'P2024') {
          try {
            await this.$disconnect();
            await this.$connect();
          } catch (reconnectError) {
            this.logger.error('Reconnection failed', reconnectError);
          }
        }

        // 指数退避
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i)),
        );
      }
    }
    throw new Error('Retry failed');
  }
  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: any): boolean {
    // Prisma已知的可重试错误代码
    const retryableCodes = [
      'P1001', // 无法连接到数据库
      'P1002', // 数据库服务器超时
      'P2024', // 连接池超时
    ];

    if (error.code && retryableCodes.includes(error.code)) {
      return true;
    }

    // 检查错误消息中的特定模式
    const message = error.message || '';
    return (
      message.includes('server has closed the connection') ||
      message.includes('Connection pool timeout') ||
      message.includes('connect ETIMEDOUT')
    );
  }
}

// src/redis/redis.service.ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: AppConfigService) {
    const config = this.configService.redisConfig;

    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
      password: config.password || undefined,
      database: config.db,
    }) as RedisClientType;

    // 错误处理
    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis Client Connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis Client Ready');
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      // 根据业务需求决定是否抛出错误
      // 如果Redis是可选的，可以不抛出错误
      // throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  /**
   * 获取 Redis 客户端实例
   */
  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * 检查 Redis 连接状态
   */
  isConnected(): boolean {
    return this.client.isOpen;
  }

  /**
   * 执行 PING 命令测试连接
   */
  async ping(): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Redis client is not connected');
    }
    return await this.client.ping();
  }

  // ========================================
  // 基础 Redis 操作封装（可选）
  // ========================================

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}

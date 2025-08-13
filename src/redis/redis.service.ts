// src/redis/redis.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: AppConfigService) {}

  // 建立 Redis 连接
  async onModuleInit() {
    const redisConfig = this.configService.redis;

    this.client = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      password: redisConfig.password || undefined,
      database: redisConfig.db,
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis客户端错误:', err);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis连接已建立');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis客户端就绪');
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Redis连接失败:', error);
      throw error;
    }
  }

  // 优雅地关闭 Redis 连接
  async onModuleDestroy() {
    try {
      await this.client?.quit();
      this.logger.log('Redis连接已关闭');
    } catch (error) {
      this.logger.error('关闭Redis连接时出错:', error);
    }
  }

  // 获取原生 Redis 客户端实例
  getClient(): RedisClientType {
    return this.client;
  }

  // 在 Redis 中存储键值对的核心方法
  async set(
    key: string,
    value: string | object,
    ttlSeconds?: number,
  ): Promise<string | null> {
    const stringValue =
      typeof value === 'object' ? JSON.stringify(value) : value;
    if (ttlSeconds) {
      return await this.client.setEx(key, ttlSeconds, stringValue);
    }
    return await this.client.set(key, stringValue);
  }

  // 从 Redis 中根据键名获取对应值的方法
  async get<T = string>(key: string, parseJson = false): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;

    if (parseJson) {
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        this.logger.error(`JSON解析错误 - key: ${key}`, error);
        return null;
      }
    }
    return value as T;
  }

  // 从 Redis 中删除指定键及其对应值的方法
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  // 检查指定键是否存在于 Redis 中的方法
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // 执行 Redis 连接健康检查的方法
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis健康检查失败:', error);
      return false;
    }
  }
}

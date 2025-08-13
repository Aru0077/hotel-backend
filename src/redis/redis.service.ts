// src/redis/redis.service.ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnectionReady = false;

  constructor(private readonly configService: AppConfigService) {
    const config = this.configService.redisConfig;

    // 构建 Redis URL
    const redisUrl = this.buildRedisUrl(config);

    // 创建 Redis 客户端
    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    this.setupEventListeners();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnectionReady = true;
      this.logger.log('Redis 客户端连接成功');
    } catch (error) {
      this.logger.error('Redis 连接失败:', error);
      this.isConnectionReady = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      try {
        await this.client.quit();
        this.logger.log('Redis 客户端已断开连接');
      } catch (error) {
        this.logger.error('Redis 断开连接时出错:', error);
      }
    }
  }

  /**
   * 构建 Redis 连接 URL
   */
  private buildRedisUrl(config: any): string {
    const { host, port, password, db } = config;
    let url = `redis://`;

    if (password) {
      url += `:${password}@`;
    }

    url += `${host}:${port}`;

    if (db && db !== 0) {
      url += `/${db}`;
    }

    return url;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.client.on('error', (error) => {
      this.logger.error('Redis 客户端错误:', error);
      this.isConnectionReady = false;
    });

    this.client.on('connect', () => {
      this.logger.debug('Redis 客户端正在连接...');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis 客户端已准备就绪');
      this.isConnectionReady = true;
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis 客户端正在重连...');
      this.isConnectionReady = false;
    });

    this.client.on('end', () => {
      this.logger.warn('Redis 连接已关闭');
      this.isConnectionReady = false;
    });
  }

  /**
   * 获取原始 Redis 客户端实例
   */
  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * 检查 Redis 连接状态
   */
  isConnected(): boolean {
    return this.client.isOpen && this.isConnectionReady;
  }

  /**
   * 执行 PING 命令测试连接
   */
  async ping(): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Redis 客户端未连接');
    }
    return await this.client.ping();
  }

  // ========================================
  // 基础操作方法
  // ========================================

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected()) {
      this.logger.warn(`Redis 未连接，跳过设置 ${key}`);
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`设置 Redis 键 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    if (!this.isConnected()) {
      this.logger.warn(`Redis 未连接，无法获取 ${key}`);
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`获取 Redis 键 ${key} 失败:`, error);
      return null;
    }
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    if (!this.isConnected()) {
      this.logger.warn(`Redis 未连接，无法删除 ${key}`);
      return 0;
    }

    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error(`删除 Redis 键 ${key} 失败:`, error);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`检查 Redis 键 ${key} 是否存在失败:`, error);
      return false;
    }
  }

  /**
   * 设置键的过期时间
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === true;
    } catch (error) {
      this.logger.error(`设置 Redis 键 ${key} 过期时间失败:`, error);
      return false;
    }
  }

  /**
   * 获取键的剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    if (!this.isConnected()) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error(`获取 Redis 键 ${key} 过期时间失败:`, error);
      return -1;
    }
  }

  // ========================================
  // Hash 操作
  // ========================================

  /**
   * 设置哈希字段
   */
  async hSet(key: string, field: string, value: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      this.logger.error(`设置 Redis 哈希 ${key}.${field} 失败:`, error);
      return 0;
    }
  }

  /**
   * 获取哈希字段值
   */
  async hGet(key: string, field: string): Promise<string | undefined> {
    if (!this.isConnected()) {
      return undefined;
    }

    try {
      const result = await this.client.hGet(key, field);
      return result ?? undefined;
    } catch (error) {
      this.logger.error(`获取 Redis 哈希 ${key}.${field} 失败:`, error);
      return undefined;
    }
  }

  /**
   * 获取哈希所有字段和值
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    if (!this.isConnected()) {
      return {};
    }

    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      this.logger.error(`获取 Redis 哈希 ${key} 全部字段失败:`, error);
      return {};
    }
  }

  /**
   * 删除哈希字段
   */
  async hDel(key: string, field: string): Promise<number> {
    if (!this.isConnected()) {
      return 0;
    }

    try {
      return await this.client.hDel(key, field);
    } catch (error) {
      this.logger.error(`删除 Redis 哈希 ${key}.${field} 失败:`, error);
      return 0;
    }
  }
}

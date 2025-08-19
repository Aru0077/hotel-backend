import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';

// src/auth/services/token-blacklist.service.ts
@Injectable()
export class TokenBlacklistService {
  constructor(private readonly redis: RedisService) {}

  async addToBlacklist(jti: string, expiresAt: number): Promise<void> {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, '1', ttl);
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return await this.redis.exists(`blacklist:${jti}`);
  }

  async blacklistRefreshToken(refreshTokenId: string): Promise<void> {
    await this.redis.set(`refresh_blacklist:${refreshTokenId}`, '1', 604800); // 7天
  }
}

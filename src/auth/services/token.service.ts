// src/auth/services/token.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../redis/redis.service';
import { AppConfigService } from '../../config/config.service';
import { RefreshTokenDto } from '../dto/auth.dto';
import {
  AuthTokenResponse,
  JwtPayload,
  RefreshTokenPayload,
  UserWithRoles,
} from '../../types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * 生成访问令牌和刷新令牌
   */
  async generateTokens(user: UserWithRoles): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  }> {
    // 1. 构建JWT载荷
    const payload = this.buildJwtPayload(user);
    // 2. 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.jwt.secret,
      expiresIn: this.configService.jwt.expiresIn,
    });
    // 3. 生成刷新令牌
    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.jwt.refreshSecret,
      expiresIn: this.configService.jwt.refreshExpiresIn,
    });
    // 4. 将刷新令牌存储到Redis
    const refreshTokenKey = `refresh_token:${user.id}:${Date.now()}`;
    const refreshTokenTtl = this.parseExpirationTime(
      this.configService.jwt.refreshExpiresIn,
    );
    await this.redis.set(refreshTokenKey, refreshToken, refreshTokenTtl);

    // 5. 返回令牌信息
    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.jwt.expiresIn,
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(
    dto: RefreshTokenDto,
    userWithRoles: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    try {
      // 1. 验证刷新令牌格式并获取类型安全的 payload
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        {
          secret: this.configService.jwt.refreshSecret,
        },
      );

      // 2. 验证令牌类型
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌类型');
      }

      // 3. 从 payload 中获取用户ID（现在是类型安全的）
      const userId = payload.sub;

      // 4. 从Redis验证刷新令牌有效性
      // 使用用户ID作为键进行简化处理
      const userRefreshTokenKey = `refresh_token:${userId}:current`;
      const storedToken = await this.redis.get(userRefreshTokenKey);

      if (!storedToken || storedToken !== dto.refreshToken) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      // 5. 生成新的访问令牌和刷新令牌
      const tokens = await this.generateTokens(userWithRoles);

      // 6. 更新Redis中的刷新令牌
      await this.redis.set(
        userRefreshTokenKey,
        tokens.refreshToken,
        this.parseExpirationTime(this.configService.jwt.refreshExpiresIn),
      );

      // 7. 返回新的认证响应
      return this.formatAuthResponse(tokens, userWithRoles);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 格式化认证响应
   */
  formatAuthResponse(
    tokens: { accessToken: string; refreshToken: string; expiresIn: string },
    user: UserWithRoles,
  ): AuthTokenResponse {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: 'Bearer',
      user,
    };
  }

  /**
   * 用户注销 - 清除刷新令牌
   */
  async logout(userId: number, refreshToken?: string): Promise<void> {
    // 1. 删除Redis中的刷新令牌
    if (refreshToken) {
      const userRefreshTokenKey = `refresh_token:${userId}:current`;
      await this.redis.del(userRefreshTokenKey);
    }
  }

  // ============ Token黑名单功能（合并自TokenBlacklistService） ============

  /**
   * 将令牌添加到黑名单
   */
  async addToBlacklist(jti: string, expiresAt: number): Promise<void> {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, '1', ttl);
    }
  }

  /**
   * 检查令牌是否在黑名单中
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    return await this.redis.exists(`blacklist:${jti}`);
  }

  /**
   * 将刷新令牌添加到黑名单
   */
  async blacklistRefreshToken(refreshTokenId: string): Promise<void> {
    await this.redis.set(`refresh_blacklist:${refreshTokenId}`, '1', 604800); // 7天
  }

  /**
   * 验证刷新令牌并返回payload
   */
  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    return await this.jwtService.verifyAsync<RefreshTokenPayload>(
      refreshToken,
      {
        secret: this.configService.jwt.refreshSecret,
      },
    );
  }

  // ============ 私有辅助方法 ============

  /**
   * 构建JWT载荷
   */
  private buildJwtPayload(user: UserWithRoles): JwtPayload {
    return {
      sub: user.id,
      username: user.credentials?.username ?? undefined,
      email: user.credentials?.email ?? undefined,
      phone: user.credentials?.phone ?? undefined,
      roles: user.roles.map((role) => role.roleType),
      iat: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * 解析过期时间字符串为秒数
   */
  private parseExpirationTime(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return value; // 默认为秒
    }
  }
}

// src/auth/services/token.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(TokenService.name);

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
    const payload = this.buildJwtPayload(user);

    // 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.jwt.secret,
      expiresIn: this.configService.jwt.expiresIn,
    });

    // 生成刷新令牌
    const refreshTokenPayload: RefreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.jwt.refreshSecret,
      expiresIn: this.configService.jwt.refreshExpiresIn,
    });

    // 存储刷新令牌到Redis
    const refreshTokenKey = `refresh_token:${user.id}`;
    const refreshTokenTtl = this.parseExpirationTime(
      this.configService.jwt.refreshExpiresIn,
    );
    await this.redis.set(refreshTokenKey, refreshToken, refreshTokenTtl);

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
      // 验证刷新令牌
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        {
          secret: this.configService.jwt.refreshSecret,
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌类型');
      }

      // 从Redis验证刷新令牌
      const refreshTokenKey = `refresh_token:${payload.sub}`;
      const storedToken = await this.redis.get(refreshTokenKey);

      if (!storedToken || storedToken !== dto.refreshToken) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }

      // 生成新的令牌对
      const tokens = await this.generateTokens(userWithRoles);

      return this.formatAuthResponse(tokens, userWithRoles);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('刷新令牌验证失败', error);
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 验证刷新令牌
   */
  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    return await this.jwtService.verifyAsync<RefreshTokenPayload>(
      refreshToken,
      {
        secret: this.configService.jwt.refreshSecret,
      },
    );
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
      expiresIn: this.parseExpirationTime(tokens.expiresIn),
      tokenType: 'Bearer',
      user,
    };
  }

  /**
   * 用户注销 - 清除刷新令牌
   */
  async logout(userId: number): Promise<void> {
    const refreshTokenKey = `refresh_token:${userId}`;
    await this.redis.del(refreshTokenKey);
  }

  /**
   * 令牌黑名单功能
   */
  async addToBlacklist(jti: string, expiresAt: number): Promise<void> {
    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.set(`blacklist:${jti}`, '1', ttl);
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    return await this.redis.exists(`blacklist:${jti}`);
  }

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
        return value;
    }
  }
}

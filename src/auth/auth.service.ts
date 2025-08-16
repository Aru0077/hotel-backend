// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, UserWithCredentials } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';

export interface JwtPayload {
  sub: number; // 用户ID
  username: string; // 用户标识符
  roleType: string; // 当前激活的角色
  iat?: number; // 签发时间
  exp?: number; // 过期时间
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: UserWithCredentials;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60; // 15分钟（秒）

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * 验证用户凭据（用于本地策略）
   */
  async validateUser(
    identifier: string,
    password: string,
    provider = 'USERNAME',
  ): Promise<UserWithCredentials | null> {
    // 检查是否被锁定
    await this.checkLoginLockout(identifier);

    try {
      const user = await this.usersService.validatePassword(
        provider,
        identifier,
        password,
      );

      if (!user) {
        // 记录失败尝试
        await this.recordFailedLogin(identifier);
        return null;
      }

      // 清除失败记录
      await this.clearFailedLoginAttempts(identifier);

      return user;
    } catch (error) {
      await this.recordFailedLogin(identifier);
      throw error;
    }
  }

  /**
   * 用户登录
   */
  async login(
    user: UserWithCredentials,
    roleType?: string,
  ): Promise<LoginResult> {
    // 验证角色
    const activeRoles = user.roles.map((role) => role.roleType);

    if (activeRoles.length === 0) {
      throw new UnauthorizedException('用户没有可用的角色');
    }

    // 如果指定了角色，验证用户是否拥有该角色
    const selectedRole = roleType || activeRoles[0];
    if (!activeRoles.includes(selectedRole)) {
      throw new UnauthorizedException('用户不具有指定角色');
    }

    // 更新最后登录时间
    await this.usersService.updateLastLogin(user.id);

    // 生成令牌
    const tokens = await this.generateTokens(user, selectedRole);

    // 存储刷新令牌
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      tokens,
    };
  }

  /**
   * 用户注册
   */
  async register(
    provider: string,
    identifier: string,
    password: string,
    roleTypes: string[],
    additionalData?: Record<string, any>,
  ): Promise<LoginResult> {
    // 验证角色类型
    if (!roleTypes || roleTypes.length === 0) {
      throw new BadRequestException('必须指定至少一个角色类型');
    }

    // 创建用户
    const user = await this.usersService.createUser({
      provider,
      identifier,
      password,
      roleTypes,
      additionalData,
    });

    // 自动登录新注册的用户
    return await this.login(user, roleTypes[0]);
  }

  /**
   * 刷新访问令牌
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // 验证刷新令牌
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.jwt.refreshSecret,
        },
      );

      // 检查刷新令牌是否有效
      const storedToken = await this.getStoredRefreshToken(payload.sub);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('刷新令牌无效');
      }

      // 获取用户信息
      const user = await this.usersService.findUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 验证角色仍然有效
      const activeRoles = user.roles.map((role) => role.roleType);
      if (!activeRoles.includes(payload.roleType)) {
        throw new UnauthorizedException('用户角色已变更，请重新登录');
      }

      // 生成新的令牌对
      const newTokens = await this.generateTokens(user, payload.roleType);

      // 更新存储的刷新令牌
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      // 将旧的刷新令牌加入黑名单
      await this.addTokenToBlacklist(refreshToken, 'refresh');

      return newTokens;
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  /**
   * 用户登出
   */
  async logout(
    userId: number,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    // 将访问令牌加入黑名单
    await this.addTokenToBlacklist(accessToken, 'access');

    // 如果提供了刷新令牌，也加入黑名单
    if (refreshToken) {
      await this.addTokenToBlacklist(refreshToken, 'refresh');
    }

    // 清除存储的刷新令牌
    await this.clearStoredRefreshToken(userId);
  }

  /**
   * 验证访问令牌是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:token:${token}`;
    return await this.redisService.exists(key);
  }

  /**
   * 切换用户角色
   */
  async switchRole(
    user: UserWithCredentials,
    newRoleType: string,
  ): Promise<AuthTokens> {
    const activeRoles = user.roles.map((role) => role.roleType);

    if (!activeRoles.includes(newRoleType)) {
      throw new UnauthorizedException('用户不具有指定角色');
    }

    return await this.generateTokens(user, newRoleType);
  }

  /**
   * 生成JWT令牌对
   */
  private async generateTokens(
    user: UserWithCredentials,
    roleType: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      username: this.getUserIdentifier(user),
      roleType,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.jwt.secret,
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.jwt.refreshSecret,
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15分钟
    };
  }

  /**
   * 获取用户主要标识符
   */
  private getUserIdentifier(user: UserWithCredentials): string {
    // 优先返回邮箱，其次用户名，最后手机号
    const emailCredential = user.credentials.find(
      (c) => c.provider === 'EMAIL',
    );
    if (emailCredential) {
      return emailCredential.identifier;
    }

    const usernameCredential = user.credentials.find(
      (c) => c.provider === 'USERNAME',
    );
    if (usernameCredential) {
      return usernameCredential.identifier;
    }

    const phoneCredential = user.credentials.find(
      (c) => c.provider === 'PHONE',
    );
    if (phoneCredential) {
      return phoneCredential.identifier;
    }

    return `user_${user.id}`;
  }

  /**
   * 存储刷新令牌
   */
  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    const ttl = 7 * 24 * 60 * 60; // 7天
    await this.redisService.set(key, refreshToken, ttl);
  }

  /**
   * 获取存储的刷新令牌
   */
  private async getStoredRefreshToken(userId: number): Promise<string | null> {
    const key = `refresh_token:${userId}`;
    return await this.redisService.get(key);
  }

  /**
   * 清除存储的刷新令牌
   */
  private async clearStoredRefreshToken(userId: number): Promise<void> {
    const key = `refresh_token:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * 将令牌加入黑名单
   */
  private async addTokenToBlacklist(
    token: string,
    type: 'access' | 'refresh',
  ): Promise<void> {
    const key = `blacklist:token:${token}`;
    const ttl = type === 'access' ? 15 * 60 : 7 * 24 * 60 * 60; // 访问令牌15分钟，刷新令牌7天
    await this.redisService.set(key, type, ttl);
  }

  /**
   * 检查登录锁定状态
   */
  private async checkLoginLockout(identifier: string): Promise<void> {
    const lockoutKey = `lockout:${identifier}`;
    const isLocked = await this.redisService.exists(lockoutKey);

    if (isLocked) {
      throw new UnauthorizedException('账户已被锁定，请稍后再试');
    }
  }

  /**
   * 记录失败的登录尝试
   */
  private async recordFailedLogin(identifier: string): Promise<void> {
    const attemptsKey = `failed_attempts:${identifier}`;
    const attempts = await this.redisService.get(attemptsKey);
    const currentAttempts = attempts ? parseInt(attempts) : 0;
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= this.maxLoginAttempts) {
      // 锁定账户
      const lockoutKey = `lockout:${identifier}`;
      await this.redisService.set(lockoutKey, '1', this.lockoutDuration);

      // 清除失败尝试记录
      await this.redisService.del(attemptsKey);
    } else {
      // 记录失败尝试
      const ttl = 60 * 60; // 1小时后重置
      await this.redisService.set(attemptsKey, newAttempts.toString(), ttl);
    }
  }

  /**
   * 清除失败的登录尝试记录
   */
  private async clearFailedLoginAttempts(identifier: string): Promise<void> {
    const attemptsKey = `failed_attempts:${identifier}`;
    await this.redisService.del(attemptsKey);
  }

  /**
   * 修改密码
   */
  async changePassword(
    userId: number,
    provider: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    return await this.usersService.updatePassword(
      userId,
      provider,
      oldPassword,
      newPassword,
    );
  }

  /**
   * 验证令牌是否有效（用于JWT策略）
   */
  async validateJwtPayload(
    payload: JwtPayload,
  ): Promise<UserWithCredentials | null> {
    // 检查用户是否存在
    const user = await this.usersService.findUserById(payload.sub);
    if (!user) {
      return null;
    }

    // 检查角色是否仍然有效
    const activeRoles = user.roles.map((role) => role.roleType);
    if (!activeRoles.includes(payload.roleType)) {
      return null;
    }

    return user;
  }
}

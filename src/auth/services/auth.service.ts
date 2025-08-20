// src/auth/services/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { LogoutDto } from '../dto/auth.dto';
import {
  AuthTokenResponse,
  UserWithCredentials,
  CurrentUser,
} from '../../types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  /**
   * 验证用户凭证
   * 核心认证方法，被登录服务调用
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials | null> {
    const user = await this.userService.findUserByIdentifier(identifier);

    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );

    if (!isPasswordValid) {
      return null;
    }

    await this.userService.updateLastLoginTime(user.id);
    return user;
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const dto = { refreshToken };
    return await this.tokenService.refreshToken(dto, user);
  }

  /**
   * 用户注销
   */
  async logout(
    currentUser: CurrentUser,
    dto?: LogoutDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const userId = currentUser.userId;

      // 将当前访问令牌加入黑名单
      if (currentUser.jti) {
        const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
        await this.tokenService.addToBlacklist(currentUser.jti, expiresAt);
        this.logger.log(
          `访问令牌已加入黑名单: userId=${userId}, jti=${currentUser.jti}`,
        );
      }

      // 清除刷新令牌
      if (dto?.refreshToken) {
        try {
          const payload = await this.tokenService.verifyRefreshToken(
            dto.refreshToken,
          );
          if (payload.sub === userId) {
            await this.tokenService.logout(userId);
            this.logger.log(`指定刷新令牌已清除: userId=${userId}`);
          }
        } catch (error) {
          this.logger.warn(
            `刷新令牌验证失败，清除用户所有令牌: userId=${userId}`,
            error,
          );
          await this.tokenService.logout(userId);
        }
      } else {
        await this.tokenService.logout(userId);
        this.logger.log(`用户所有令牌已清除: userId=${userId}`);
      }

      this.logger.log(
        `用户注销成功: userId=${userId}, username=${currentUser.username}`,
      );

      return {
        success: true,
        message: '注销成功',
      };
    } catch (error) {
      this.logger.error(`用户注销失败: userId=${currentUser?.userId}`, error);
      return {
        success: false,
        message: '注销失败，请稍后重试',
      };
    }
  }
}

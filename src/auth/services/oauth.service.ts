// src/auth/services/oauth.service.ts - OAuth认证服务
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import {
  CreateUserData,
  UserWithRoles,
  FacebookProfile,
  GoogleProfile,
} from '../../types';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private readonly userService: UserService) {}

  /**
   * Facebook认证
   */
  async authenticateWithFacebook(
    facebookId: string,
    profile: FacebookProfile,
  ): Promise<UserWithRoles> {
    let user = await this.userService.findUserByFacebookId(facebookId);

    if (!user) {
      // 创建新用户
      const userData: CreateUserData = {
        facebookId,
        isFacebookVerified: true,
        roleType: 'CUSTOMER', // 默认角色
        email: profile.email,
        isEmailVerified: !!profile.email,
      };
      user = await this.userService.createUser(userData);
      this.logger.log(`Facebook新用户创建: userId=${user.id}`);
    } else {
      // 更新登录时间
      await this.userService.updateLastLoginTime(user.id);
      this.logger.log(`Facebook用户登录: userId=${user.id}`);
    }

    return user;
  }

  /**
   * Google认证
   */
  async authenticateWithGoogle(
    googleId: string,
    profile: GoogleProfile,
  ): Promise<UserWithRoles> {
    let user = await this.userService.findUserByGoogleId(googleId);

    if (!user) {
      // 创建新用户
      const userData: CreateUserData = {
        googleId,
        isGoogleVerified: true,
        roleType: 'CUSTOMER', // 默认角色
        email: profile.email,
        isEmailVerified: !!profile.email,
      };
      user = await this.userService.createUser(userData);
      this.logger.log(`Google新用户创建: userId=${user.id}`);
    } else {
      // 更新登录时间
      await this.userService.updateLastLoginTime(user.id);
      this.logger.log(`Google用户登录: userId=${user.id}`);
    }

    return user;
  }
}

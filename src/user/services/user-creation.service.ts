// src/user/services/user-creation.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserWithRoles } from '../../types';

export interface CreateUserWithCredentialsData {
  username?: string;
  email?: string;
  phone?: string;
  facebookId?: string;
  googleId?: string;
  hashedPassword?: string;
  roleTypes?: string;
  isUsernameVerified?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isFacebookVerified?: boolean;
  isGoogleVerified?: boolean;
  additionalData?: Record<string, unknown>;
}

@Injectable()
export class UserCreationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建用户及其认证凭证 - 事务操作
   */
  async createUserWithCredentials(
    data: CreateUserWithCredentialsData,
  ): Promise<UserWithRoles> {
    const user = await this.prisma.$transaction(async (tx) => {
      // 1. 创建用户记录
      const newUser = await tx.user.create({
        data: {
          lastLoginAt: new Date(),
        },
      });

      // 2. 创建认证凭证记录
      await tx.authCredential.create({
        data: {
          userId: newUser.id,
          username: data.username,
          email: data.email,
          phone: data.phone,
          facebookId: data.facebookId,
          googleId: data.googleId,
          hashedPassword: data.hashedPassword,
          isUsernameVerified: data.isUsernameVerified ?? false,
          isEmailVerified: data.isEmailVerified ?? false,
          isPhoneVerified: data.isPhoneVerified ?? false,
          isFacebookVerified: data.isFacebookVerified ?? false,
          isGoogleVerified: data.isGoogleVerified ?? false,
          lastUsedUsername: data.username ? new Date() : undefined,
          lastUsedEmail: data.email ? new Date() : undefined,
          lastUsedPhone: data.phone ? new Date() : undefined,
          lastUsedFacebook: data.facebookId ? new Date() : undefined,
          lastUsedGoogle: data.googleId ? new Date() : undefined,
          additionalData: data.additionalData,
        },
      });

      // 3. 创建用户角色记录
      const roleType = data.roleTypes ?? 'customer';
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType,
          status: 'ACTIVE',
        },
      });

      // 4. 返回包含关联数据的用户信息
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
          },
        },
      });
    });

    if (!user) {
      throw new Error('用户创建失败');
    }

    return user;
  }

  /**
   * 创建用户名密码用户
   */
  async createUsernamePasswordUser(
    username: string,
    hashedPassword: string,
    roleTypes?: string,
  ): Promise<UserWithRoles> {
    return this.createUserWithCredentials({
      username,
      hashedPassword,
      roleTypes,
      isUsernameVerified: true,
    });
  }

  /**
   * 创建邮箱验证码用户
   */
  async createEmailCodeUser(
    email: string,
    hashedPassword?: string,
    roleTypes?: string,
  ): Promise<UserWithRoles> {
    return this.createUserWithCredentials({
      email,
      hashedPassword,
      roleTypes,
      isEmailVerified: true,
    });
  }

  /**
   * 创建手机验证码用户
   */
  async createPhoneCodeUser(
    phone: string,
    hashedPassword?: string,
    roleTypes?: string,
  ): Promise<UserWithRoles> {
    return this.createUserWithCredentials({
      phone,
      hashedPassword,
      roleTypes,
      isPhoneVerified: true,
    });
  }

  /**
   * 创建Facebook用户
   */
  async createFacebookUser(
    facebookId: string,
    email?: string,
    additionalData?: Record<string, unknown>,
    roleTypes?: string,
  ): Promise<UserWithRoles> {
    return this.createUserWithCredentials({
      facebookId,
      email,
      roleTypes,
      isFacebookVerified: true,
      isEmailVerified: email ? true : false,
      additionalData,
    });
  }

  /**
   * 创建Google用户
   */
  async createGoogleUser(
    googleId: string,
    email?: string,
    additionalData?: Record<string, unknown>,
    roleTypes?: string,
  ): Promise<UserWithRoles> {
    return this.createUserWithCredentials({
      googleId,
      email,
      roleTypes,
      isGoogleVerified: true,
      isEmailVerified: email ? true : false,
      additionalData,
    });
  }
}

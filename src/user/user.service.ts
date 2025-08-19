// src/user/user.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UserWithCredentials,
  UserWithRoles,
  CreateUserData,
  CredentialType,
} from '../types';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ 用户创建 ============

  async createUser(data: CreateUserData): Promise<UserWithRoles> {
    // 验证至少有一个身份标识符
    const hasIdentifier =
      data.username ??
      data.email ??
      data.phone ??
      data.facebookId ??
      data.googleId;
    if (!hasIdentifier) {
      throw new BadRequestException('至少需要提供一个身份标识符');
    }

    // 验证字段格式
    if (data.username) this.validateUsername(data.username);
    if (data.email) this.validateEmail(data.email);
    if (data.phone) this.validatePhone(data.phone);

    const user = await this.prisma.$transaction(async (tx) => {
      // 创建用户记录
      const newUser = await tx.user.create({
        data: {
          lastLoginAt: new Date(),
        },
      });

      // 创建认证凭证记录
      await tx.authCredential.create({
        data: {
          userId: newUser.id,
          username: data.username,
          email: data.email,
          phone: data.phone,
          facebookId: data.facebookId,
          googleId: data.googleId,
          hashedPassword: data.hashedPassword,
          isUsernameVerified: data.isUsernameVerified,
          isEmailVerified: data.isEmailVerified,
          isPhoneVerified: data.isPhoneVerified,
          isFacebookVerified: data.isFacebookVerified,
          isGoogleVerified: data.isGoogleVerified,
          lastUsedUsername: data.username ? new Date() : undefined,
          lastUsedEmail: data.email ? new Date() : undefined,
          lastUsedPhone: data.phone ? new Date() : undefined,
          lastUsedFacebook: data.facebookId ? new Date() : undefined,
          lastUsedGoogle: data.googleId ? new Date() : undefined,
          additionalData: data.additionalData,
        },
      });

      // 创建用户角色记录
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType: data.roleType,
          status: 'ACTIVE',
        },
      });

      // 返回完整用户信息
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

  // ============ 用户查询 ============

  async checkUserExists(
    identifier: string,
    type: CredentialType,
  ): Promise<boolean> {
    const whereCondition = this.buildWhereCondition(identifier, type);
    const credential = await this.prisma.authCredential.findFirst({
      where: whereCondition,
    });
    return Boolean(credential);
  }

  async findUserByIdentifier(
    identifier: string,
  ): Promise<UserWithCredentials | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: {
          OR: [
            { username: identifier },
            { email: identifier },
            { phone: identifier },
          ],
        },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  }

  async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { email },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  }

  async findUserByPhone(phone: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { phone },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  }

  async findUserById(userId: number): Promise<UserWithRoles | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });
  }

  // ============ 用户更新 ============

  async updateLastLoginTime(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateCredentialLastUsedTime(
    userId: number,
    type: CredentialType,
  ): Promise<void> {
    const updateData: Record<string, Date> = {};

    switch (type) {
      case 'username':
        updateData.lastUsedUsername = new Date();
        break;
      case 'email':
        updateData.lastUsedEmail = new Date();
        break;
      case 'phone':
        updateData.lastUsedPhone = new Date();
        break;
      case 'facebook':
        updateData.lastUsedFacebook = new Date();
        break;
      case 'google':
        updateData.lastUsedGoogle = new Date();
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.authCredential.update({
        where: { userId },
        data: updateData,
      });
    }
  }

  // ============ 用户状态检查 ============

  isUserActive(user: UserWithRoles | UserWithCredentials): boolean {
    return user.roles && user.roles.length > 0;
  }

  // ============ 私有辅助方法 ============

  private buildWhereCondition(
    identifier: string,
    type: CredentialType,
  ): Record<string, string> {
    const whereCondition: Record<string, string> = {};

    switch (type) {
      case 'username':
        whereCondition.username = identifier;
        break;
      case 'email':
        whereCondition.email = identifier;
        break;
      case 'phone':
        whereCondition.phone = identifier;
        break;
      case 'facebook':
        whereCondition.facebookId = identifier;
        break;
      case 'google':
        whereCondition.googleId = identifier;
        break;
    }

    return whereCondition;
  }

  private validateUsername(username: string): void {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      throw new BadRequestException(
        '用户名格式不正确，只能包含字母、数字和下划线，长度3-50字符',
      );
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  private validatePhone(phone: string): void {
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }
}

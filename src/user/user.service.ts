// src/user/user.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserWithRoles, CreateUserData, CredentialType } from '../types';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // ============ 用户创建 ============

  async createUser(data: CreateUserData): Promise<UserWithRoles> {
    this.validateCreateUserData(data);

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
          isEmailVerified: data.isEmailVerified ?? false,
          isPhoneVerified: data.isPhoneVerified ?? false,
          isFacebookVerified: data.isFacebookVerified ?? false,
          isGoogleVerified: data.isGoogleVerified ?? false,
        },
      });

      // 创建用户角色记录
      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleType: data.roleType,
          status: data.roleStatus ?? 'ACTIVE',
          expiresAt: data.roleExpiresAt,
        },
      });

      // 返回完整用户信息
      return await tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          credentials: true,
          roles: {
            where: { status: 'ACTIVE' },
            include: {
              merchant: true,
              customer: true,
              admin: true,
            },
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
  ): Promise<UserWithRoles | null> {
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
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
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
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
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
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
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
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
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

    // 同时更新认证凭证的最后登录时间
    await this.prisma.authCredential.update({
      where: { userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ============ 私有辅助方法 ============

  private validateCreateUserData(data: CreateUserData): void {
    const hasIdentifier =
      data.username ??
      data.email ??
      data.phone ??
      data.facebookId ??
      data.googleId;

    if (!hasIdentifier) {
      throw new BadRequestException('至少需要提供一个身份标识符');
    }

    if (data.username) this.validateUsername(data.username);
    if (data.email) this.validateEmail(data.email);
    if (data.phone) this.validatePhone(data.phone);
  }

  private buildWhereCondition(
    identifier: string,
    type: CredentialType,
  ): Record<string, string> {
    const conditions: Record<CredentialType, string> = {
      username: 'username',
      email: 'email',
      phone: 'phone',
      facebook: 'facebookId',
      google: 'googleId',
    };

    return { [conditions[type]]: identifier };
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

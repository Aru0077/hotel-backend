// src/user/user.service.ts - 重构后的用户服务
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RoleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserWithRoles, CreateUserData, CredentialType } from '../types';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============ 用户存在性检查 ============

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
      throw new BadRequestException('用户创建失败');
    }

    this.logger.log(`用户创建成功: userId=${user.id}`);
    return user;
  }

  // ============ 用户查询方法 ============

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
      include: this.getUserIncludeOptions(),
    });
  }

  async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { email },
      },
      include: this.getUserIncludeOptions(),
    });
  }

  async findUserByPhone(phone: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { phone },
      },
      include: this.getUserIncludeOptions(),
    });
  }

  async findUserById(userId: number): Promise<UserWithRoles | null> {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: this.getUserIncludeOptions(),
    });
  }

  async findUserByFacebookId(
    facebookId: string,
  ): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { facebookId },
      },
      include: this.getUserIncludeOptions(),
    });
  }

  async findUserByGoogleId(googleId: string): Promise<UserWithRoles | null> {
    return await this.prisma.user.findFirst({
      where: {
        credentials: { googleId },
      },
      include: this.getUserIncludeOptions(),
    });
  }

  // ============ 用户更新方法 ============

  async updateLastLoginTime(userId: number): Promise<void> {
    const now = new Date();

    await Promise.all([
      this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: now },
      }),
      this.prisma.authCredential.update({
        where: { userId },
        data: { lastLoginAt: now },
      }),
    ]);

    this.logger.log(`用户登录时间更新: userId=${userId}`);
  }

  async updateUserCredentials(
    userId: number,
    data: {
      hashedPassword?: string;
      isEmailVerified?: boolean;
      isPhoneVerified?: boolean;
      isFacebookVerified?: boolean;
      isGoogleVerified?: boolean;
    },
  ): Promise<void> {
    await this.prisma.authCredential.update({
      where: { userId },
      data: {
        ...data,
        ...(data.hashedPassword && { passwordChanged: new Date() }),
      },
    });

    this.logger.log(`用户凭证更新: userId=${userId}`);
  }

  // ============ 标识符检测与构建方法 ============

  detectIdentifierType(identifier: string): 'username' | 'email' | 'phone' {
    // 邮箱正则
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return 'email';
    }
    // 手机号正则（国内外）
    if (/^(\+\d{1,3})?\d{10,14}$/.test(identifier.replace(/\s/g, ''))) {
      return 'phone';
    }
    // 默认为用户名
    return 'username';
  }

  buildCredentialsByType(
    identifier: string,
    type: 'username' | 'email' | 'phone',
    isVerified: boolean,
  ) {
    const credentials = {
      username: undefined as string | undefined,
      email: undefined as string | undefined,
      phone: undefined as string | undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
    };

    switch (type) {
      case 'email':
        credentials.email = identifier;
        credentials.isEmailVerified = isVerified;
        break;
      case 'phone':
        credentials.phone = identifier;
        credentials.isPhoneVerified = isVerified;
        break;
      case 'username':
        credentials.username = identifier;
        break;
    }

    return credentials;
  }

  // ============ 数据验证方法 ============

  validateCreateUserData(data: CreateUserData): void {
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

  validateUsername(username: string): void {
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      throw new BadRequestException(
        '用户名格式不正确，只能包含字母、数字和下划线，长度3-50字符',
      );
    }
  }

  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  validatePhone(phone: string): void {
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  // ============ 工具方法 ============

  maskIdentifier(
    identifier: string,
    type: 'username' | 'email' | 'phone',
  ): string {
    switch (type) {
      case 'email':
        return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
      case 'phone':
        if (identifier.startsWith('+86')) {
          return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
        } else if (identifier.startsWith('+')) {
          return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
        } else {
          return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
      case 'username':
        return identifier.length > 4
          ? identifier.slice(0, 2) + '***' + identifier.slice(-2)
          : identifier.slice(0, 1) + '***';
      default:
        return identifier.slice(0, 3) + '***';
    }
  }

  // ============ 私有辅助方法 ============

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

  private getUserIncludeOptions() {
    return {
      credentials: true,
      roles: {
        where: { status: RoleStatus.ACTIVE },
        include: {
          merchant: true,
          customer: true,
          admin: true,
        },
      },
    };
  }
}

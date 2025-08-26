// src/user/user.service.ts - 重构后的用户服务
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RoleStatus, RoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserWithRoles, CreateUserData, CredentialType } from '../types';
import { ValidatorsUtil } from '../common/utils/validators.util';

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

  // ============ 角色管理方法 ============

  /**
   * 检查用户是否已有某个角色
   */
  async userHasRole(userId: number, roleType: RoleType): Promise<boolean> {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleType,
        status: RoleStatus.ACTIVE,
      },
    });
    return Boolean(role);
  }

  /**
   * 为现有用户添加新角色
   */
  async addRoleToUser(
    userId: number,
    roleType: RoleType,
    options?: {
      status?: RoleStatus;
      expiresAt?: Date;
    },
  ): Promise<UserWithRoles> {
    // 检查用户是否已有该角色
    const hasRole = await this.userHasRole(userId, roleType);
    if (hasRole) {
      throw new BadRequestException(`用户已拥有 ${roleType} 角色`);
    }

    // 添加新角色
    await this.prisma.userRole.create({
      data: {
        userId,
        roleType,
        status: options?.status ?? RoleStatus.ACTIVE,
        expiresAt: options?.expiresAt,
      },
    });

    this.logger.log(`为用户添加角色: userId=${userId}, roleType=${roleType}`);

    // 返回更新后的用户信息
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return user;
  }

  /**
   * 检查用户是否拥有指定角色（包含非活跃状态）
   */
  async checkUserRole(
    userId: number,
    roleType: RoleType,
  ): Promise<{
    hasRole: boolean;
    roleStatus?: RoleStatus;
    roleId?: number;
  }> {
    const role = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleType,
      },
    });

    return {
      hasRole: Boolean(role),
      roleStatus: role?.status,
      roleId: role?.id,
    };
  }

  // ============ 标识符检测与构建方法 ============

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

    if (data.username) ValidatorsUtil.validateUsername(data.username);
    if (data.email) ValidatorsUtil.validateEmail(data.email);
    if (data.phone) ValidatorsUtil.validatePhone(data.phone);
  }

  // ============ 工具方法 ============

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

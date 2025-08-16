// src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, AuthCredential, RoleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface CreateUserData {
  provider: string;
  identifier: string;
  password?: string;
  roleTypes: string[];
  additionalData?: Record<string, any>;
}

export interface CredentialData {
  hashedPassword?: string;
  [key: string]: any;
}

// export interface SafeCredential extends Omit<AuthCredential, 'credentialData'> {
//   credentialData: CredentialData | null;
// }

export interface UserWithCredentials extends User {
  credentials: AuthCredential[];
  roles: Array<{
    id: number;
    userId: number;
    roleType: string;
    status: RoleStatus;
    createdAt: Date;
    expiresAt: Date | null;
    merchant?: any;
    customer?: any;
    admin?: any;
  }>;
}

/**
 * 用户服务
 * 负责核心用户管理功能：创建、查询、更新用户信息及认证凭据管理
 */
@Injectable()
export class UsersService {
  private readonly saltRounds = 12;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新用户及其认证凭据
   */
  async createUser(userData: CreateUserData): Promise<UserWithCredentials> {
    const { provider, identifier, password, roleTypes, additionalData } =
      userData;

    // 检查标识符是否已存在
    await this.checkIdentifierUniqueness(provider, identifier);

    // 加密密码（如果提供）
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, this.saltRounds);
    }

    // 使用事务创建用户和相关数据
    return await this.prisma.$transaction(async (tx) => {
      // 创建基础用户
      const user = await tx.user.create({
        data: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 创建认证凭据
      await tx.authCredential.create({
        data: {
          userId: user.id,
          provider,
          identifier,
          credentialData: hashedPassword
            ? { hashedPassword, ...additionalData }
            : additionalData,
          isVerified: provider === 'USERNAME' || provider === 'EMAIL',
        },
      });

      // 创建用户角色
      const rolePromises = roleTypes.map((roleType) =>
        tx.userRole.create({
          data: {
            userId: user.id,
            roleType,
            status: RoleStatus.ACTIVE,
          },
        }),
      );

      await Promise.all(rolePromises);

      // 返回完整的用户信息
      const createdUser = await this.findUserById(user.id);
      if (!createdUser) {
        throw new Error('创建用户后无法查询到用户信息');
      }
      return createdUser;
    });
  }

  /**
   * 根据ID查找用户
   */
  async findUserById(id: number): Promise<UserWithCredentials | null> {
    return await this.prisma.user.findUnique({
      where: { id },
      include: {
        credentials: true,
        roles: {
          where: { status: RoleStatus.ACTIVE },
          include: {
            merchant: true,
            customer: true,
            admin: true,
          },
        },
      },
    });
  }

  /**
   * 根据登录凭据查找用户
   */
  async findUserByCredentials(
    provider: string,
    identifier: string,
  ): Promise<UserWithCredentials | null> {
    const credential = await this.prisma.authCredential.findUnique({
      where: {
        provider_identifier: {
          provider,
          identifier,
        },
      },
      include: {
        user: {
          include: {
            credentials: true,
            roles: {
              where: { status: RoleStatus.ACTIVE },
              include: {
                merchant: true,
                customer: true,
                admin: true,
              },
            },
          },
        },
      },
    });

    return credential?.user || null;
  }

  /**
   * 验证用户密码
   */
  async validatePassword(
    provider: string,
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials | null> {
    const user = await this.findUserByCredentials(provider, identifier);

    if (!user) {
      return null;
    }

    // 获取对应的认证凭据
    const credential = user.credentials.find(
      (c) => c.provider === provider && c.identifier === identifier,
    );

    if (!credential?.credentialData) {
      return null;
    }

    // 验证密码
    const credentialData = credential.credentialData as CredentialData | null;
    if (!credentialData?.hashedPassword) {
      return null;
    }

    const isValid = await bcrypt.compare(
      password,
      credentialData.hashedPassword,
    );
    return isValid ? user : null;
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLogin(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    // 更新认证凭据的最后使用时间
    await this.prisma.authCredential.updateMany({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * 更新用户密码
   */
  async updatePassword(
    userId: number,
    provider: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const credential = user.credentials.find((c) => c.provider === provider);
    if (!credential?.credentialData) {
      throw new NotFoundException('认证凭据不存在');
    }

    const credentialData = credential.credentialData as CredentialData | null;
    if (!credentialData?.hashedPassword) {
      throw new NotFoundException('认证凭据中缺少密码信息');
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      credentialData.hashedPassword,
    );

    if (!isOldPasswordValid) {
      return false;
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);
    const updatedCredentialData: CredentialData = {
      ...credentialData,
      hashedPassword: hashedNewPassword,
    };
    await this.prisma.authCredential.update({
      where: { id: credential.id },
      data: {
        credentialData: updatedCredentialData,
        updatedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * 添加新的登录方式
   */
  async addCredential(
    userId: number,
    provider: string,
    identifier: string,
    additionalData?: Record<string, any>,
  ): Promise<AuthCredential> {
    // 检查标识符唯一性
    await this.checkIdentifierUniqueness(provider, identifier);

    // 检查用户是否已有该提供商的凭据
    const existingCredential = await this.prisma.authCredential.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (existingCredential) {
      throw new ConflictException(`用户已存在${provider}认证方式`);
    }

    return await this.prisma.authCredential.create({
      data: {
        userId,
        provider,
        identifier,
        credentialData: additionalData,
        isVerified: false,
      },
    });
  }

  /**
   * 验证认证凭据
   */
  async verifyCredential(credentialId: number): Promise<boolean> {
    const result = await this.prisma.authCredential.update({
      where: { id: credentialId },
      data: { isVerified: true },
    });

    return !!result;
  }

  /**
   * 软删除用户
   */
  async softDeleteUser(userId: number): Promise<boolean> {
    // 停用所有角色
    await this.prisma.userRole.updateMany({
      where: { userId },
      data: { status: RoleStatus.SUSPENDED },
    });

    return true;
  }

  /**
   * 检查标识符唯一性
   */
  private async checkIdentifierUniqueness(
    provider: string,
    identifier: string,
  ): Promise<void> {
    const existingCredential = await this.prisma.authCredential.findUnique({
      where: {
        provider_identifier: {
          provider,
          identifier,
        },
      },
    });

    if (existingCredential) {
      throw new ConflictException('该登录方式已被使用');
    }
  }
}

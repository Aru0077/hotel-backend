// src/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, AuthCredential, UserRole, RoleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface CreateUserData {
  provider: string;
  identifier: string;
  password?: string;
  roleTypes: string[];
  additionalData?: Record<string, any>;
}

export interface UserWithCredentials extends User {
  credentials: AuthCredential[];
  roles: (UserRole & {
    merchant?: any;
    customer?: any;
    admin?: any;
  })[];
}

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
      return await this.findUserById(user.id);
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
    const credentialData = credential.credentialData as any;
    const hashedPassword = credentialData.hashedPassword;

    if (!hashedPassword) {
      return null;
    }

    const isValid = await bcrypt.compare(password, hashedPassword);
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

    const credentialData = credential.credentialData as any;
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      credentialData.hashedPassword,
    );

    if (!isOldPasswordValid) {
      return false;
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);
    await this.prisma.authCredential.update({
      where: { id: credential.id },
      data: {
        credentialData: {
          ...credentialData,
          hashedPassword: hashedNewPassword,
        },
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
   * 获取用户的活跃角色
   */
  async getUserActiveRoles(userId: number): Promise<string[]> {
    const roles = await this.prisma.userRole.findMany({
      where: {
        userId,
        status: RoleStatus.ACTIVE,
      },
      select: {
        roleType: true,
      },
    });

    return roles.map((role) => role.roleType);
  }

  /**
   * 添加用户角色
   */
  async addUserRole(userId: number, roleType: string): Promise<UserRole> {
    // 检查是否已存在该角色
    const existingRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleType: {
          userId,
          roleType,
        },
      },
    });

    if (existingRole) {
      if (existingRole.status === RoleStatus.ACTIVE) {
        throw new ConflictException('用户已具有该角色');
      }

      // 重新激活已存在但未激活的角色
      return await this.prisma.userRole.update({
        where: { id: existingRole.id },
        data: { status: RoleStatus.ACTIVE },
      });
    }

    return await this.prisma.userRole.create({
      data: {
        userId,
        roleType,
        status: RoleStatus.ACTIVE,
      },
    });
  }

  /**
   * 移除用户角色
   */
  async removeUserRole(userId: number, roleType: string): Promise<boolean> {
    const result = await this.prisma.userRole.updateMany({
      where: {
        userId,
        roleType,
      },
      data: {
        status: RoleStatus.INACTIVE,
      },
    });

    return result.count > 0;
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

  /**
   * 软删除用户
   */
  async softDeleteUser(userId: number): Promise<boolean> {
    // 停用所有角色
    await this.prisma.userRole.updateMany({
      where: { userId },
      data: { status: RoleStatus.SUSPENDED },
    });

    // 这里可以添加更多的软删除逻辑
    return true;
  }

  /**
   * 统计方法 - 获取用户总数
   */
  async getUserCount(): Promise<number> {
    return await this.prisma.user.count();
  }

  /**
   * 统计方法 - 按角色类型统计用户数
   */
  async getUserCountByRole(roleType: string): Promise<number> {
    return await this.prisma.userRole.count({
      where: {
        roleType,
        status: RoleStatus.ACTIVE,
      },
    });
  }
}

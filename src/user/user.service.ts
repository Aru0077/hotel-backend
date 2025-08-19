// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserWithCredentials, UserWithRoles } from '../types';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查用户是否存在（根据不同标识符）
   */
  async checkUserExists(
    identifier: string,
    type: 'username' | 'email' | 'phone' | 'facebook' | 'google',
  ): Promise<boolean> {
    // 1. 根据类型构建查询条件
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
    // 2. 查询数据库
    const credential = await this.prisma.authCredential.findFirst({
      where: whereCondition,
    });
    // 3. 返回是否存在
    return Boolean(credential);
  }

  /**
   * 根据标识符查找用户（用于登录验证）
   */
  async findUserByIdentifier(
    identifier: string,
  ): Promise<UserWithCredentials | null> {
    const user = await this.prisma.user.findFirst({
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

    return user;
  }

  /**
   * 根据邮箱查找用户
   */
  async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        credentials: {
          email: email,
        },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    return user;
  }

  /**
   * 根据手机号查找用户
   */
  async findUserByPhone(phone: string): Promise<UserWithRoles | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        credentials: {
          phone: phone,
        },
      },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    return user;
  }

  /**
   * 根据用户ID查找用户
   */
  async findUserById(userId: number): Promise<UserWithRoles | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        credentials: true,
        roles: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    return user;
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLoginTime(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 更新认证凭证最后使用时间
   */
  async updateCredentialLastUsedTime(
    userId: number,
    type: 'username' | 'email' | 'phone' | 'facebook' | 'google',
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
        where: { userId: userId },
        data: updateData,
      });
    }
  }

  /**
   * 检查用户状态是否正常
   */
  isUserActive(user: UserWithRoles): boolean {
    return user.roles.length > 0;
  }
}

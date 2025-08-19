// src/types/core.types.ts
import {
  Prisma,
  RoleType,
  RoleStatus,
  AuthProvider,
  MerchantVerifyStatus,
  Gender,
} from '@prisma/client';

// ============ 重新导出Prisma枚举 ============
export { RoleType, RoleStatus, AuthProvider, MerchantVerifyStatus, Gender };

// ============ 业务枚举（应用层） ============
export enum VerificationCodeType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export enum VerificationCodePurpose {
  REGISTER = 'register',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email',
  VERIFY_PHONE = 'verify_phone',
}

// ============ 核心用户类型 ============
export type BaseUser = Prisma.UserGetPayload<{
  select: {
    id: true;
    createdAt: true;
    updatedAt: true;
    lastLoginAt: true;
  };
}>;

export type UserWithCredentials = Prisma.UserGetPayload<{
  include: {
    credentials: true;
  };
}>;

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    credentials: true;
    roles: {
      where: { status: 'ACTIVE' };
    };
  };
}>;

// ============ 业务实体类型（简化版） ============
export type MerchantProfile = Prisma.MerchantGetPayload<{
  include: {
    userRole: {
      include: {
        user: {
          include: {
            credentials: {
              select: {
                email: true;
                phone: true;
                username: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export type CustomerProfile = Prisma.CustomerGetPayload<{
  include: {
    userRole: {
      include: {
        user: {
          include: {
            credentials: {
              select: {
                email: true;
                phone: true;
                username: true;
              };
            };
          };
        };
      };
    };
  };
}>;

// ============ Prisma事务类型 ============
export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

// ============ 用户创建数据接口 ============
export interface CreateUserData {
  // 认证标识符 - 至少需要一个
  username?: string;
  email?: string;
  phone?: string;
  facebookId?: string;
  googleId?: string;

  // 密码相关
  hashedPassword?: string;

  // 角色信息 - 使用RoleType枚举
  roleType: RoleType; // 更改为使用Prisma的RoleType枚举

  // 验证状态 - 匹配AuthCredential表字段
  isUsernameVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isFacebookVerified: boolean;
  isGoogleVerified: boolean;

  // 额外数据 - 匹配AuthCredential.additionalData字段
  additionalData?: Record<string, unknown>;
}

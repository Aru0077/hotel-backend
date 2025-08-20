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

export enum VerificationCodePurpose {
  REGISTER = 'register',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email',
  VERIFY_PHONE = 'verify_phone',
}

// 验证码类型枚举（用于区分邮件和短信）
export enum VerificationCodeType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

// 认证凭证类型枚举
export type CredentialType =
  | 'username'
  | 'email'
  | 'phone'
  | 'facebook'
  | 'google';

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
      include: {
        merchant: true;
        customer: true;
        admin: true;
      };
    };
  };
}>;

// ============ 业务实体类型 ============
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

export type AdminProfile = Prisma.AdminGetPayload<{
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
  // 认证标识符
  username?: string;
  email?: string;
  phone?: string;
  facebookId?: string;
  googleId?: string;

  // 密码
  hashedPassword?: string;

  // 验证状态
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isFacebookVerified?: boolean;
  isGoogleVerified?: boolean;

  // 角色信息
  roleType: RoleType;
  roleStatus?: RoleStatus;
  roleExpiresAt?: Date;

  // 角色特定数据
  merchantData?: Omit<Prisma.MerchantCreateInput, 'userRole'>;
  customerData?: Omit<Prisma.CustomerCreateInput, 'userRole'>;
  adminData?: Omit<Prisma.AdminCreateInput, 'userRole'>;
}

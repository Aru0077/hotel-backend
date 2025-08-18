// src/types/prisma.types.ts - 简化版本
import { Prisma, PrismaClient } from '@prisma/client';

// ============ 基础类型（保留，使用频繁） ============

// 用户基础信息（最常用）
export type UserWithCredentials = Prisma.UserGetPayload<{
  include: { credentials: true };
}>;

// 用户完整信息（用于认证和用户管理）
export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    credentials: true;
    roles: {
      where: { status: 'ACTIVE' };
    };
  };
}>;

// ============ 业务实体类型（简化，仅保留必要的） ============

// 商家信息（仅包含基本用户信息）
export type MerchantWithUser = Prisma.MerchantGetPayload<{
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

// 客户信息（仅包含基本用户信息）
export type CustomerWithUser = Prisma.CustomerGetPayload<{
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

// ============ 工具类型（保留） ============

// Prisma 事务类型
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

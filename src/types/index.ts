// src/types/index.ts

import { ServiceError, ServiceResult } from './auth.types';
import { UserWithRoles } from './core.types';

// ============ 核心类型导出 ============
export {
  // Prisma枚举
  RoleStatus,
  AuthProvider,
  MerchantVerifyStatus,
  Gender,
  // 应用枚举
  VerificationCodeType,
  VerificationCodePurpose,
  // 用户相关类型
  BaseUser,
  UserWithCredentials,
  UserWithRoles,
  MerchantProfile,
  CustomerProfile,
  PrismaTransaction,
  CreateUserData,
} from './core.types';

// ============ 认证类型导出 ============
export {
  // JWT类型
  JwtPayload,
  RefreshTokenPayload,
  // 认证响应
  AuthTokenResponse,
  AuthUserInfo,
  // 社交登录
  SocialUserInfo,
  // 验证码
  VerificationCodeData,
  // 短信服务
  SmsResponse,
  SendSmsOptions,
  // 服务结果
  ServiceError,
  ServiceResult,
  // 常量类型
  CredentialType,
} from './auth.types';

// ============ API类型导出 ============
export {
  // API响应
  ApiResponse,
  PaginatedResponse,
  ApiResponseDto,
  PaginatedResponseDto,
  // 查询参数
  PaginationParams,
  BaseFilter,
  SearchParams,
  SearchResult,
  // 基础实体
  BaseEntity,
  // 文件上传
  FileUploadResponse,
  // 批量操作
  BatchOperationResult,
  // 健康检查
  HealthStatus,
} from './api.types';

// ============ 工具类型 ============
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// ============ 类型守卫工具函数 ============
export function isUserWithRoles(user: any): user is UserWithRoles {
  return user && Array.isArray(user.roles);
}

export function isServiceError(
  result: any,
): result is { success: false; error: ServiceError } {
  return result && result.success === false && result.error;
}

export function isServiceSuccess<T>(
  result: ServiceResult<T>,
): result is { success: true; data: T } {
  return result && result.success === true;
}

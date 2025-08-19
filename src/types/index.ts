// src/types/index.ts

import { ServiceError, ServiceResult } from './auth.types';
import { UserWithRoles } from './core.types';

// ============ 核心类型导出 ============
export {
  // Prisma枚举
  RoleType, // 新增RoleType导出
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

/**
 * 检查对象是否为UserWithRoles类型
 * @param user - 待检查的用户对象
 * @returns 类型守卫结果
 */
export function isUserWithRoles(user: unknown): user is UserWithRoles {
  return (
    typeof user === 'object' &&
    user !== null &&
    'roles' in user &&
    Array.isArray((user as { roles: unknown }).roles)
  );
}

/**
 * 检查结果对象是否为服务错误类型
 * @param result - 待检查的结果对象
 * @returns 类型守卫结果
 */
export function isServiceError(
  result: unknown,
): result is { success: false; error: ServiceError } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    (result as { success: unknown }).success === false &&
    'error' in result &&
    typeof (result as { error: unknown }).error === 'object'
  );
}

/**
 * 检查结果对象是否为服务成功类型
 * @param result - 待检查的结果对象
 * @returns 类型守卫结果
 */
export function isServiceSuccess<T>(
  result: ServiceResult<T>,
): result is { success: true; data: T } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    result.success === true &&
    'data' in result
  );
}

/**
 * 检查对象是否具有指定的属性
 * @param obj - 待检查的对象
 * @param prop - 属性名
 * @returns 类型守卫结果
 */
export function hasProperty<
  T extends Record<string, unknown>,
  K extends string,
>(obj: T, prop: K): obj is T & Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

/**
 * 检查值是否不为null且不为undefined
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查值是否为有效字符串（非空且不仅包含空格）
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 检查值是否为有效数字（不为NaN且为有限数）
 * @param value - 待检查的值
 * @returns 类型守卫结果
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 检查对象是否为有效的分页参数
 * @param params - 待检查的参数对象
 * @returns 类型守卫结果
 */
export function isPaginationParams(
  params: unknown,
): params is { page?: number; limit?: number } {
  if (typeof params !== 'object' || params === null) {
    return false;
  }

  const obj = params as Record<string, unknown>;

  // 检查page参数（如果存在）
  if ('page' in obj && obj.page !== undefined) {
    if (!isValidNumber(obj.page) || obj.page < 1) {
      return false;
    }
  }

  // 检查limit参数（如果存在）
  if ('limit' in obj && obj.limit !== undefined) {
    if (!isValidNumber(obj.limit) || obj.limit < 1 || obj.limit > 100) {
      return false;
    }
  }

  return true;
}

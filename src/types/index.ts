// src/types/index.ts

import { ServiceError, ServiceResult } from './auth.types';
import { UserWithRoles } from './core.types';

// 核心类型导出
export {
  RoleType,
  RoleStatus,
  AuthProvider,
  MerchantVerifyStatus,
  Gender,
  VerificationCodePurpose,
  BaseUser,
  UserWithCredentials,
  UserWithRoles,
  MerchantProfile,
  CustomerProfile,
  AdminProfile,
  PrismaTransaction,
  CreateUserData,
  VerificationCodeType,
  CredentialType,
} from './core.types';

// 认证类型导出
export {
  JwtPayload,
  RefreshTokenPayload,
  AuthTokenResponse,
  AuthUserInfo,
  SocialUserInfo,
  VerificationCodeData,
  ServiceError,
  ServiceResult,
} from './auth.types';

// API类型导出
export {
  ApiResponse,
  PaginatedResponse,
  ApiResponseDto,
  PaginatedResponseDto,
  PaginationParams,
  BaseEntity,
} from './api.types';

// 工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 类型守卫工具函数
export function isUserWithRoles(user: unknown): user is UserWithRoles {
  return (
    typeof user === 'object' &&
    user !== null &&
    'roles' in user &&
    Array.isArray((user as { roles: unknown }).roles)
  );
}

export function isServiceError(
  result: unknown,
): result is { success: false; error: ServiceError } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    (result as { success: unknown }).success === false &&
    'error' in result
  );
}

export function isServiceSuccess<T>(
  result: ServiceResult<T>,
): result is { success: true; data: T } {
  return result.success === true;
}

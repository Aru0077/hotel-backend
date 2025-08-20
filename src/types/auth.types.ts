// src/types/auth.types.ts
import { RoleType } from '@prisma/client';
import { UserWithRoles } from './core.types';

// ============ JWT相关类型 ============
export interface JwtPayload {
  sub: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: RoleType[];
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface RefreshTokenPayload {
  sub: number;
  type: 'refresh';
  iat: number;
  exp?: number;
  jti?: string;
}

// ============ 当前用户类型 ============
export interface CurrentUser {
  userId: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: RoleType[];
  jti?: string;
}

// ============ 认证响应类型 ============
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: UserWithRoles;
}

export interface AuthUserInfo {
  id: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: RoleType[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
}

// ============ 社交登录类型 ============
export interface SocialUserInfo {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  provider: 'facebook' | 'google';
}

// ============ 验证码相关类型 ============
export interface VerificationCodeData {
  identifier: string;
  code: string;
  purpose: string;
  expiresAt: Date;
}

// ============ 服务结果类型 ============
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

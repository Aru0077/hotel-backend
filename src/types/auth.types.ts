// src/types/auth.types.ts
import { UserWithRoles } from './core.types';
import { RoleType } from '@prisma/client';

// ============ JWT相关类型 ============
export interface JwtPayload {
  sub: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: RoleType[]; // 更改为使用RoleType枚举数组
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

// ============ 认证响应类型 ============
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
  user: UserWithRoles;
}

export interface AuthUserInfo {
  id: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: RoleType[]; // 更改为使用RoleType枚举数组
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

// ============ 短信服务类型 ============
export interface SmsResponse {
  success: boolean;
  bizId?: string;
  message?: string;
  code?: string;
}

export interface SendSmsOptions {
  phoneNumber: string;
  templateCode: string;
  templateParam: Record<string, string>;
  signName?: string;
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

// ============ 认证操作类型 ============
export type CredentialType =
  | 'username'
  | 'email'
  | 'phone'
  | 'facebook'
  | 'google';

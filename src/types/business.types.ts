// src/types/business.types.ts - 优化版本

// ============ 保留的核心类型 ============

// 创建用户凭证数据（核心业务逻辑，保留）
export interface CreateUserCredentialsData {
  username?: string;
  email?: string;
  phone?: string;
  facebookId?: string;
  googleId?: string;
  hashedPassword?: string;
  roleTypes: string[];
  isUsernameVerified?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isFacebookVerified?: boolean;
  isGoogleVerified?: boolean;
  additionalData?: Record<string, unknown>;
}

// 更新用户资料数据（基础功能，保留）
export interface UpdateUserProfileData {
  username?: string;
  email?: string;
  phone?: string;
  additionalData?: Record<string, unknown>;
}

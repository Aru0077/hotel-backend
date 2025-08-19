// ===============================
// src/types/auth.types.ts
// ===============================
import { Prisma } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: string[];
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID，用于令牌撤销
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
  user: Prisma.UserGetPayload<{
    include: { credentials: true; roles: true };
  }>;
}

export interface AuthUserInfo {
  id: number;
  username?: string;
  email?: string;
  phone?: string;
  roles: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
}

export interface SocialUserInfo {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  provider: 'facebook' | 'google';
}

export interface RefreshTokenPayload {
  sub: number;
  type: 'refresh';
  iat: number;
  exp?: number;
  jti?: string;
}

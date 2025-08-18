// ===============================
// src/types/enums.ts
// ===============================
// 重新导出Prisma生成的枚举，提供统一的导入入口
export {
  RoleStatus,
  AuthProvider,
  MerchantVerifyStatus,
  Gender,
} from '@prisma/client';

// 验证码相关枚举（仅用于前端和DTO，不存储到数据库）
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

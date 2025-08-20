// src/auth/services/password.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class PasswordService {
  constructor(private readonly configService: AppConfigService) {}

  /**
   * 加密密码
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.configService.security.bcryptSaltRounds);
  }

  /**
   * 验证密码
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const { passwordMinLength, passwordMaxLength } =
      this.configService.security;

    if (password.length < passwordMinLength) {
      errors.push(`密码长度不能少于${passwordMinLength}个字符`);
    }

    if (password.length > passwordMaxLength) {
      errors.push(`密码长度不能超过${passwordMaxLength}个字符`);
    }

    // 检查密码复杂度
    if (!/[a-z]/.test(password)) {
      errors.push('密码必须包含小写字母');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('密码必须包含大写字母');
    }

    if (!/\d/.test(password)) {
      errors.push('密码必须包含数字');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('密码必须包含特殊字符');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

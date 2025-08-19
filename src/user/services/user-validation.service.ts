// src/user/services/user-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { VerificationCodeType } from '../../types';

@Injectable()
export class UserValidationService {
  /**
   * 验证邮箱格式
   */
  validateEmailFormat(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  /**
   * 验证手机号格式
   */
  validatePhoneFormat(phone: string): void {
    // 支持国内手机号和国际手机号格式
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  /**
   * 验证用户名格式
   */
  validateUsernameFormat(username: string): void {
    // 用户名：3-50字符，支持字母、数字、下划线
    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      throw new BadRequestException(
        '用户名格式不正确，只能包含字母、数字和下划线，长度3-50字符',
      );
    }
  }

  /**
   * 标识符脱敏处理
   */
  maskIdentifier(identifier: string, type: string): string {
    if (type === 'email' || type === VerificationCodeType.EMAIL.toLowerCase()) {
      // 邮箱脱敏: john@example.com -> j***@example.com
      return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
    } else if (
      type === 'phone' ||
      type === VerificationCodeType.PHONE.toLowerCase()
    ) {
      // 手机号脱敏处理
      if (identifier.startsWith('+86')) {
        // +8613812345678 -> +86138****5678
        return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
      } else if (identifier.startsWith('+')) {
        // 其他国际号码 -> +1234****7890
        return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
      } else {
        // 国内号码 13812345678 -> 138****5678
        return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
    } else if (type === 'username') {
      // 用户名脱敏: johndoe -> jo***e
      if (identifier.length <= 3) {
        return identifier;
      }
      return identifier.replace(/(.{2}).*(.{1})/, '$1***$2');
    }
    return identifier;
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('密码长度不能少于8位');
    }
    if (password.length > 128) {
      throw new BadRequestException('密码长度不能超过128位');
    }

    // 可以添加更复杂的密码强度检查
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    // const hasNumbers = /\d/.test(password);
    // const hasNonalphas = /\W/.test(password);

    // if (!(hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas)) {
    //   throw new BadRequestException('密码必须包含大小写字母、数字和特殊字符');
    // }
  }
}

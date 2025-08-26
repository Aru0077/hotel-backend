// src/common/utils/validators.util.ts - 统一验证工具类
import { BadRequestException } from '@nestjs/common';

export class ValidatorsUtil {
  /**
   * 验证邮箱格式
   */
  static validateEmail(email: string): void {
    if (!email) {
      throw new BadRequestException('邮箱不能为空');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  /**
   * 验证手机号格式
   */
  static validatePhone(phone: string): void {
    if (!phone) {
      throw new BadRequestException('手机号码不能为空');
    }

    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  /**
   * 验证用户名格式
   */
  static validateUsername(username: string): void {
    if (!username) {
      throw new BadRequestException('用户名不能为空');
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
    if (!usernameRegex.test(username)) {
      throw new BadRequestException(
        '用户名格式不正确，只能包含字母、数字和下划线，长度3-50字符',
      );
    }
  }

  /**
   * 验证验证码格式
   */
  static validateVerificationCode(code: string): void {
    if (!code) {
      throw new BadRequestException('验证码不能为空');
    }

    if (code.length < 4 || code.length > 8) {
      throw new BadRequestException('验证码长度应在4-8位之间');
    }

    if (!/^\d+$/.test(code)) {
      throw new BadRequestException('验证码只能包含数字');
    }
  }

  /**
   * 标识符脱敏 - 统一实现
   */
  static maskIdentifier(
    identifier: string,
    type: 'username' | 'email' | 'phone',
  ): string {
    if (!identifier) return '';

    switch (type) {
      case 'email':
        return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
      case 'phone':
        if (identifier.startsWith('+86')) {
          return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
        } else if (identifier.startsWith('+')) {
          return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
        } else {
          return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
      case 'username':
        return identifier.length > 4
          ? identifier.slice(0, 2) + '***' + identifier.slice(-2)
          : identifier.slice(0, 1) + '***';
      default:
        return identifier.slice(0, 3) + '***';
    }
  }

  /**
   * 检测标识符类型
   */
  static detectIdentifierType(
    identifier: string,
  ): 'username' | 'email' | 'phone' {
    // 邮箱正则
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return 'email';
    }
    // 手机号正则（国内外）
    if (/^(\+\d{1,3})?\d{10,14}$/.test(identifier.replace(/\s/g, ''))) {
      return 'phone';
    }
    // 默认为用户名
    return 'username';
  }
}

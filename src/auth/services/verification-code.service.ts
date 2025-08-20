// src/auth/services/verification-code.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppConfigService } from '../../config/config.service';
import { SmsService } from '../../sms/sms.service';
import { SendVerificationCodeDto } from '../dto/auth.dto';
import { VerificationCodeType, VerificationCodePurpose } from '../../types';

interface VerificationCodeData {
  identifier: string;
  code: string;
  purpose: VerificationCodePurpose;
  type: VerificationCodeType;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly configService: AppConfigService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * 发送验证码
   */
  async sendVerificationCode(dto: SendVerificationCodeDto): Promise<void> {
    const { identifier, type } = this.extractIdentifierAndType(dto);

    // 检查发送频率限制
    await this.checkRateLimit(identifier, type);

    // 生成验证码
    const code = this.generateVerificationCode();

    // 存储验证码
    await this.storeVerificationCode(identifier, code, dto.purpose, type);

    // 设置发送频率限制
    await this.setRateLimit(identifier, type);

    // 发送验证码
    await this.sendCode(identifier, code, dto.purpose, type);

    this.logger.log(
      `验证码发送成功: ${this.maskIdentifier(identifier, type)}, 用途: ${dto.purpose}`,
    );
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    identifier: string,
    code: string,
    purpose: VerificationCodePurpose,
  ): Promise<boolean> {
    const cacheKey = this.buildCacheKey(identifier, purpose);
    const storedData = await this.redis.get<VerificationCodeData>(
      cacheKey,
      true,
    );

    if (!storedData) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > storedData.expiresAt) {
      await this.redis.del(cacheKey);
      return false;
    }

    // 验证码匹配
    return storedData.code === code;
  }

  /**
   * 清除验证码
   */
  async clearVerificationCode(
    identifier: string,
    purpose: VerificationCodePurpose,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(identifier, purpose);
    await this.redis.del(cacheKey);
  }

  /**
   * 提取标识符和类型
   */
  private extractIdentifierAndType(dto: SendVerificationCodeDto): {
    identifier: string;
    type: VerificationCodeType;
  } {
    if (dto.email) {
      this.validateEmailFormat(dto.email);
      return {
        identifier: dto.email,
        type: VerificationCodeType.EMAIL,
      };
    }

    if (dto.phone) {
      this.validatePhoneFormat(dto.phone);
      return {
        identifier: dto.phone,
        type: VerificationCodeType.PHONE,
      };
    }

    throw new BadRequestException('必须提供邮箱或手机号');
  }

  /**
   * 检查发送频率限制
   */
  private async checkRateLimit(
    identifier: string,
    type: VerificationCodeType,
  ): Promise<void> {
    const rateLimitKey = `rate_limit:${type.toLowerCase()}:${identifier}`;
    const lastSentTime = await this.redis.get(rateLimitKey);

    if (lastSentTime) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试');
    }
  }

  /**
   * 设置发送频率限制
   */
  private async setRateLimit(
    identifier: string,
    type: VerificationCodeType,
  ): Promise<void> {
    const rateLimitKey = `rate_limit:${type.toLowerCase()}:${identifier}`;
    await this.redis.set(rateLimitKey, Date.now().toString(), 60); // 60秒限制
  }

  /**
   * 存储验证码
   */
  private async storeVerificationCode(
    identifier: string,
    code: string,
    purpose: VerificationCodePurpose,
    type: VerificationCodeType,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(identifier, purpose);
    const now = Date.now();
    const data: VerificationCodeData = {
      identifier,
      code,
      purpose,
      type,
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000, // 5分钟过期
    };

    await this.redis.set(cacheKey, JSON.stringify(data), 300); // 5分钟TTL
  }

  /**
   * 发送验证码
   */
  private async sendCode(
    identifier: string,
    code: string,
    purpose: VerificationCodePurpose,
    type: VerificationCodeType,
  ): Promise<void> {
    try {
      if (type === VerificationCodeType.PHONE) {
        const result = await this.smsService.sendVerificationCodeSms({
          phoneNumber: identifier,
          code,
          purpose,
        });

        if (!result.success) {
          throw new Error(`短信发送失败: ${result.message}`);
        }
      } else {
        // TODO: 实现邮件发送
        if (this.configService.isDevelopment) {
          this.logger.debug(`开发环境验证码: ${code}`);
        }
        // 暂时模拟邮件发送成功
      }
    } catch (error) {
      // 发送失败时清除已存储的验证码
      await this.clearVerificationCode(identifier, purpose);

      this.logger.error(
        `验证码发送失败: ${this.maskIdentifier(identifier, type)}`,
        error instanceof Error ? error.stack : error,
      );

      throw new BadRequestException('验证码发送失败，请稍后重试');
    }
  }

  /**
   * 生成验证码
   */
  private generateVerificationCode(length = 6): string {
    return Math.random()
      .toString()
      .slice(2, 2 + length);
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(
    identifier: string,
    purpose: VerificationCodePurpose,
  ): string {
    return `verification:${purpose}:${identifier}`;
  }

  /**
   * 验证邮箱格式
   */
  private validateEmailFormat(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('邮箱格式不正确');
    }
  }

  /**
   * 验证手机号格式
   */
  private validatePhoneFormat(phone: string): void {
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  /**
   * 标识符脱敏
   */
  private maskIdentifier(
    identifier: string,
    type: VerificationCodeType,
  ): string {
    if (type === VerificationCodeType.EMAIL) {
      return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
    } else {
      if (identifier.startsWith('+86')) {
        return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
      } else if (identifier.startsWith('+')) {
        return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
      } else {
        return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
    }
  }
}

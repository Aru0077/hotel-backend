// src/auth/services/verification-code.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppConfigService } from '../../config/config.service';
import { SmsService } from '../../sms/sms.service';
import { SendVerificationCodeDto } from '../dto/auth.dto';
import { VerificationCodeType } from '../../types';

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
    let identifier: string;

    // 1. 根据类型验证邮箱或手机号格式并获取标识符
    if (dto.type === VerificationCodeType.EMAIL) {
      if (!dto.email) {
        throw new BadRequestException('邮箱地址不能为空');
      }
      identifier = dto.email;
      this.validateEmailFormat(identifier);
    } else if (dto.type === VerificationCodeType.PHONE) {
      if (!dto.phone) {
        throw new BadRequestException('手机号码不能为空');
      }
      identifier = dto.phone;
      this.validatePhoneFormat(identifier);
    } else {
      throw new BadRequestException('不支持的验证码类型');
    }

    // 2. 检查发送频率限制
    const rateLimitKey = `rate_limit:${dto.type}:${identifier}`;
    const lastSentTime = await this.redis.get(rateLimitKey);

    if (lastSentTime) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试');
    }

    // 3. 生成验证码
    const code = this.generateVerificationCode();

    // 4. 存储到Redis缓存
    const cacheKey = this.buildVerificationKey(identifier, dto.purpose);
    await this.redis.set(cacheKey, code, 300); // 5分钟有效期

    // 设置发送频率限制（60秒内不能重复发送）
    await this.redis.set(rateLimitKey, Date.now().toString(), 60);

    // 5. 发送验证码（邮件或短信）
    try {
      if (dto.type === VerificationCodeType.PHONE) {
        // 发送短信验证码
        const smsResult = await this.smsService.sendVerificationCodeSms({
          phoneNumber: identifier,
          code,
          purpose: dto.purpose,
        });

        if (!smsResult.success) {
          throw new Error(`短信发送失败: ${smsResult.message}`);
        }

        this.logger.log(
          `短信验证码发送成功: ${this.maskIdentifier(identifier, 'phone')}, 用途: ${dto.purpose}`,
        );
      } else {
        // 发送邮件验证码
        // TODO: 实现邮件发送功能
        // await this.emailService.sendVerificationCode(identifier, code, dto.purpose);

        this.logger.log(
          `邮件验证码发送成功: ${this.maskIdentifier(identifier, 'email')}, 用途: ${dto.purpose}`,
        );

        // 临时处理：开发环境下在日志中显示验证码
        if (this.configService.isDevelopment) {
          this.logger.debug(`开发环境验证码: ${code}`);
        }
      }
    } catch (error) {
      // 发送失败时清除缓存
      await this.redis.del(cacheKey);
      await this.redis.del(rateLimitKey);

      this.logger.error(
        `验证码发送失败: ${identifier}`,
        error instanceof Error ? error.stack : error,
      );

      throw new BadRequestException('验证码发送失败，请稍后重试');
    }

    // 6. 记录发送日志
    this.logger.log(
      `验证码发送请求完成: ${dto.type} - ${this.maskIdentifier(identifier, dto.type.toLowerCase())}, 用途: ${dto.purpose}`,
    );
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    identifier: string,
    code: string,
    purpose: string,
  ): Promise<boolean> {
    // 1. 从Redis获取存储的验证码
    const cacheKey = this.buildVerificationKey(identifier, purpose);
    const storedCode = await this.redis.get(cacheKey);

    if (!storedCode) {
      return false;
    }
    // 2. 比较验证码是否匹配
    const isMatch = storedCode === code;

    if (!isMatch) {
      return false;
    }

    // 验证成功后不立即删除缓存，等到实际使用时再删除
    // 这样可以避免验证成功后用户没有继续操作导致需要重新获取验证码
    return true;
  }

  /**
   * 清除验证码缓存
   */
  async clearVerificationCode(
    identifier: string,
    purpose: string,
  ): Promise<void> {
    const cacheKey = this.buildVerificationKey(identifier, purpose);
    await this.redis.del(cacheKey);
  }

  /**
   * 生成随机验证码
   */
  private generateVerificationCode(length = 6): string {
    return Math.random()
      .toString()
      .slice(2, 2 + length);
  }

  /**
   * 构建验证码缓存键
   */
  private buildVerificationKey(identifier: string, purpose: string): string {
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
    // 支持国内手机号和国际手机号格式
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  /**
   * 标识符脱敏处理
   */
  private maskIdentifier(identifier: string, type: string): string {
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
    }
    return identifier;
  }
}

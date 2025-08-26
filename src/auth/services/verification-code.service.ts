// src/auth/services/verification-code.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { AppConfigService } from '../../config/config.service';
import { SmsService } from '../../sms/sms.service';
import { SendCodeDto } from '../dto/auth.dto';
import { VerificationCodeType } from '../../types';
import { ValidatorsUtil } from '../../common/utils/validators.util';

interface VerificationCodeData {
  identifier: string;
  code: string;
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
  async sendVerificationCode(dto: SendCodeDto): Promise<void> {
    const { identifier, type } = this.extractIdentifierAndType(dto.identifier);

    // 检查发送频率限制
    await this.checkRateLimit(identifier, type);

    // 生成验证码
    const code = this.generateVerificationCode();

    // 存储验证码
    await this.storeVerificationCode(identifier, code, type);

    // 设置发送频率限制
    await this.setRateLimit(identifier, type);

    // 发送验证码
    await this.sendCode(identifier, code, type);

    const maskType = type === VerificationCodeType.EMAIL ? 'email' : 'phone';
    this.logger.log(
      `验证码发送成功: ${ValidatorsUtil.maskIdentifier(identifier, maskType)}`,
    );
  }

  /**
   * 验证验证码
   */
  async verifyCode(identifier: string, code: string): Promise<boolean> {
    const cacheKey = this.buildCacheKey(identifier);
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
  async clearVerificationCode(identifier: string): Promise<void> {
    const cacheKey = this.buildCacheKey(identifier);
    await this.redis.del(cacheKey);
  }

  // ============ 私有方法 ============

  /**
   * 提取标识符和类型
   */
  private extractIdentifierAndType(identifier: string): {
    identifier: string;
    type: VerificationCodeType;
  } {
    const detectedType = ValidatorsUtil.detectIdentifierType(identifier);

    if (detectedType === 'email') {
      ValidatorsUtil.validateEmail(identifier);
      return {
        identifier,
        type: VerificationCodeType.EMAIL,
      };
    }

    if (detectedType === 'phone') {
      ValidatorsUtil.validatePhone(identifier);
      return {
        identifier,
        type: VerificationCodeType.PHONE,
      };
    }

    throw new BadRequestException('标识符必须是有效的邮箱或手机号');
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
    type: VerificationCodeType,
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(identifier);
    const now = Date.now();
    const data: VerificationCodeData = {
      identifier,
      code,
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
    type: VerificationCodeType,
  ): Promise<void> {
    try {
      if (type === VerificationCodeType.PHONE) {
        // 调用简化后的短信服务，不再需要传递用途参数
        const result = await this.smsService.sendVerificationCodeSms({
          phoneNumber: identifier,
          code,
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
      await this.clearVerificationCode(identifier);

      const maskType = type === VerificationCodeType.EMAIL ? 'email' : 'phone';
      this.logger.error(
        `验证码发送失败: ${ValidatorsUtil.maskIdentifier(identifier, maskType)}`,
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
  private buildCacheKey(identifier: string): string {
    return `verification:${identifier}`;
  }
}

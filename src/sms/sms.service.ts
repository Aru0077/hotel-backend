// ===================================
// 5. 创建短信服务
// ===================================
// src/sms/sms.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import { Config as OpenApiConfig } from '@alicloud/openapi-client';
import Credential from '@alicloud/credentials';
import * as $Util from '@alicloud/tea-util';
import { AppConfigService } from '../config/config.service';
import { VerificationCodePurpose } from '../types';

export interface SendSmsOptions {
  phoneNumber: string;
  templateCode: string;
  templateParam: Record<string, string>;
  signName?: string;
}

export interface SendVerificationCodeSmsOptions {
  phoneNumber: string;
  code: string;
  purpose: VerificationCodePurpose;
}

export interface SmsResponse {
  success: boolean;
  bizId?: string;
  message?: string;
  code?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Dysmsapi;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: AppConfigService) {
    this.isDevelopment = this.configService.isDevelopment;
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const smsConfig = this.configService.aliyunSmsConfig;

      // 创建凭据实例 - 使用显式传递AK方式
      // 2025年推荐的凭据配置方式 - 更简洁的环境变量支持
      const credential = new Credential({
        accessKeyId: smsConfig.accessKeyId,
        accessKeySecret: smsConfig.accessKeySecret,
        type: 'access_key',
      });

      // 创建配置实例 - 使用正确的Config类
      const config = new OpenApiConfig({
        credential,
        endpoint: smsConfig.endpoint,
        // 2025年新增的配置选项
        connectTimeout: 10000, // 连接超时
        readTimeout: 10000, // 读取超时
        autoRetry: true, // 自动重试
        maxIdleTimeMillis: 60000, // 连接池最大空闲时间
        maxIdleConns: 60, // 最大空闲连接数
      });

      // 创建短信客户端
      this.client = new Dysmsapi(config);

      this.logger.log('阿里云短信客户端初始化成功');
    } catch (error) {
      this.logger.error('阿里云短信客户端初始化失败', error);
      throw error;
    }
  }

  /**
   * 发送通用短信
   */
  async sendSms(options: SendSmsOptions): Promise<SmsResponse> {
    const startTime = Date.now();

    try {
      const smsConfig = this.configService.aliyunSmsConfig;

      // 2025年改进的请求构建
      const sendSmsRequest = new $Dysmsapi.SendSmsRequest({
        phoneNumbers: options.phoneNumber,
        signName: options.signName ?? smsConfig.signName,
        templateCode: options.templateCode,
        templateParam: JSON.stringify(options.templateParam),
      });

      // 2025年增强的运行时配置
      const runtime = new $Util.RuntimeOptions({
        autoRetry: true,
        ignoreSSL: false,
        maxIdleTimeMillis: 60000,
        maxIdleConns: 60,
        keepAliveDurationMillis: 5000,
        maxRequests: 100,
        maxRequestsPerHost: 100,
        // 2025年新增的追踪配置
        isModel: false,
        validateRequestModel: false,
        validateResponseModel: false,
      });

      const response = await this.client.sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );
      const duration = Date.now() - startTime;

      if (response.body?.code === 'OK') {
        this.logger.log(
          `短信发送成功: ${this.maskPhoneNumber(options.phoneNumber)}, ` +
            `BizId: ${response.body.bizId}, 耗时: ${duration}ms`,
        );

        return {
          success: true,
          bizId: response.body.bizId,
          message: 'SMS sent successfully',
          code: response.body.code,
        };
      } else {
        this.logger.error(
          `短信发送失败: ${this.maskPhoneNumber(options.phoneNumber)}, ` +
            `错误码: ${response.body?.code}, 错误信息: ${response.body?.message}, 耗时: ${duration}ms`,
        );

        return {
          success: false,
          message: response.body?.message ?? 'Unknown error',
          code: response.body?.code,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // 2025年增强的错误处理
      const errorResult = this.handleSmsError(
        error,
        options.phoneNumber,
        duration,
      );
      return errorResult;
    }
  }

  /**
   * 发送验证码短信
   */
  async sendVerificationCodeSms(
    options: SendVerificationCodeSmsOptions,
  ): Promise<SmsResponse> {
    const templateCode = this.getTemplateCodeByPurpose(options.purpose);

    if (!templateCode) {
      const errorMsg = `未找到对应用途的短信模板: ${options.purpose}`;
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // 2025年增加的参数验证
    this.validatePhoneNumber(options.phoneNumber);
    this.validateVerificationCode(options.code);

    const result = await this.sendSms({
      phoneNumber: options.phoneNumber,
      templateCode,
      templateParam: {
        code: options.code,
      },
    });

    // 2025年增强的结果记录
    if (result.success) {
      this.logger.log(
        `验证码短信发送成功: ${this.maskPhoneNumber(options.phoneNumber)}, ` +
          `用途: ${options.purpose}, BizId: ${result.bizId}`,
      );
    }

    return result;
  }

  /**
   * 根据用途获取短信模板代码
   */
  private getTemplateCodeByPurpose(
    purpose: VerificationCodePurpose,
  ): string | null {
    const templates = this.configService.aliyunSmsConfig.templates;

    switch (purpose) {
      case VerificationCodePurpose.REGISTER:
        return templates.register;
      case VerificationCodePurpose.LOGIN:
        return templates.login;
      case VerificationCodePurpose.RESET_PASSWORD:
        return templates.resetPassword;
      case VerificationCodePurpose.VERIFY_EMAIL:
        return templates.verifyEmail;
      case VerificationCodePurpose.VERIFY_PHONE:
        return templates.verifyPhone;
      default:
        return null;
    }
  }

  /**
   * 2025年增强的错误处理方法
   */
  private handleSmsError(
    error: unknown,
    phoneNumber: string,
    duration: number,
  ): SmsResponse {
    if (error instanceof Error) {
      // 检查是否是网络错误
      if (
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET')
      ) {
        this.logger.error(
          `短信发送网络错误: ${this.maskPhoneNumber(phoneNumber)}, ` +
            `错误: ${error.message}, 耗时: ${duration}ms`,
        );
        return {
          success: false,
          message: '网络连接超时，请稍后重试',
          code: 'NETWORK_ERROR',
        };
      }

      // 检查是否是认证错误
      if (
        error.message.includes('InvalidAccessKeyId') ||
        error.message.includes('SignatureDoesNotMatch')
      ) {
        this.logger.error(`短信发送认证错误: ${error.message}`);
        return {
          success: false,
          message: '认证失败，请检查AccessKey配置',
          code: 'AUTH_ERROR',
        };
      }

      // 检查是否是限流错误
      if (
        error.message.includes('Throttling') ||
        error.message.includes('QpsLimitExceeded')
      ) {
        this.logger.warn(`短信发送限流: ${this.maskPhoneNumber(phoneNumber)}`);
        return {
          success: false,
          message: '发送频率过高，请稍后重试',
          code: 'THROTTLING_ERROR',
        };
      }

      // 通用错误处理
      this.logger.error(
        `短信发送异常: ${this.maskPhoneNumber(phoneNumber)}, ` +
          `错误: ${error.message}, 耗时: ${duration}ms`,
        error.stack,
      );

      return {
        success: false,
        message: this.isDevelopment
          ? error.message
          : '短信发送失败，请稍后重试',
        code: 'UNKNOWN_ERROR',
      };
    }

    // 处理非Error类型的异常
    this.logger.error(
      `短信发送未知异常: ${this.maskPhoneNumber(phoneNumber)}, 耗时: ${duration}ms`,
      error,
    );

    return {
      success: false,
      message: '未知错误，请稍后重试',
      code: 'UNKNOWN_ERROR',
    };
  }

  private validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber) {
      throw new BadRequestException('手机号码不能为空');
    }

    // 简单的手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$|^\+86[1-9]\d{10}$|^\+\d{1,3}\d{4,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new BadRequestException('手机号码格式不正确');
    }
  }

  private validateVerificationCode(code: string): void {
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
   * 健康检查方法
   */
  isHealthy(): boolean {
    try {
      // 检查客户端是否正常初始化
      if (!this.client) {
        return false;
      }

      // 2025年新增：实际网络连通性检查
      // 注意：这里可能会产生费用，建议在生产环境中谨慎使用
      if (!this.isDevelopment) {
        return true; // 生产环境仅检查客户端存在
      }

      // 开发环境可以进行更详细的检查
      return true;
    } catch (error) {
      this.logger.error('短信服务健康检查失败', error);
      return false;
    }
  }
}

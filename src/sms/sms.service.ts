// src/sms/sms.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import Credential from '@alicloud/credentials';
import * as $Util from '@alicloud/tea-util';
import { AppConfigService } from '../config/config.service';
import { ValidatorsUtil } from '../common/utils/validators.util';

export interface SendSmsOptions {
  phoneNumber: string;
  templateCode: string;
  templateParam: Record<string, string>;
  signName?: string;
}

export interface SendVerificationCodeSmsOptions {
  phoneNumber: string;
  code: string;
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
  private client: Dysmsapi20170525;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: AppConfigService) {
    this.isDevelopment = this.configService.isDevelopment;
    this.initializeClient();
  }

  /**
   * 初始化阿里云短信客户端
   */
  private initializeClient(): void {
    try {
      const smsConfig = this.configService.aliyunSmsConfig;

      // 使用官方标准环境变量方式（推荐）
      const credential = new Credential();

      // 根据官方示例创建配置
      const config = new $OpenApi.Config({
        credential: credential,
      });

      // 设置访问的域名
      config.endpoint = smsConfig.endpoint;

      // 创建短信客户端
      this.client = new Dysmsapi20170525(config);

      this.logger.log(
        `阿里云短信客户端初始化成功 - Endpoint: ${smsConfig.endpoint}, SignName: ${smsConfig.signName}`,
      );
    } catch (error) {
      this.logger.error('阿里云短信客户端初始化失败', error);
      throw error;
    }
  }

  /**
   * 发送短信
   */
  async sendSms(options: SendSmsOptions): Promise<SmsResponse> {
    const startTime = Date.now();

    try {
      const smsConfig = this.configService.aliyunSmsConfig;

      // 构建发送短信请求
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: options.phoneNumber,
        signName: options.signName ?? smsConfig.signName,
        templateCode: options.templateCode,
        templateParam: JSON.stringify(options.templateParam),
      });

      // 复制运行时选项
      const runtime = new $Util.RuntimeOptions({});

      // 发送短信
      const response = await this.client.sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      const duration = Date.now() - startTime;

      // 检查响应
      if (response.body?.code === 'OK') {
        this.logger.log(
          `短信发送成功: ${ValidatorsUtil.maskIdentifier(options.phoneNumber, 'phone')}, ` +
            `BizId: ${response.body.bizId}, 耗时: ${duration}ms`,
        );

        return {
          success: true,
          bizId: response.body.bizId,
          message: response.body.message,
          code: response.body.code,
        };
      } else {
        this.logger.error(
          `短信发送失败: ${ValidatorsUtil.maskIdentifier(options.phoneNumber, 'phone')}, ` +
            `错误码: ${response.body?.code}, 错误信息: ${response.body?.message}`,
        );

        return {
          success: false,
          message: response.body?.message ?? 'Unknown error',
          code: response.body?.code,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.handleSmsError(error, options.phoneNumber, duration);
    }
  }

  /**
   * 发送验证码短信
   */
  async sendVerificationCodeSms(
    options: SendVerificationCodeSmsOptions,
  ): Promise<SmsResponse> {
    const smsConfig = this.configService.aliyunSmsConfig;

    // 使用统一的验证码模板
    const templateCode = smsConfig.templates.verifyCode;

    if (!templateCode) {
      const errorMsg = '验证码短信模板未配置';
      this.logger.error(errorMsg);
      throw new BadRequestException(errorMsg);
    }

    // 验证参数
    ValidatorsUtil.validatePhone(options.phoneNumber);
    ValidatorsUtil.validateVerificationCode(options.code);

    const result = await this.sendSms({
      phoneNumber: options.phoneNumber,
      templateCode,
      templateParam: {
        code: options.code,
      },
    });

    if (result.success) {
      this.logger.log(
        `验证码短信发送成功: ${ValidatorsUtil.maskIdentifier(options.phoneNumber, 'phone')}, ` +
          `BizId: ${result.bizId}`,
      );
    }

    return result;
  }

  /**
   * 错误处理方法
   */
  private handleSmsError(
    error: unknown,
    phoneNumber: string,
    duration: number,
  ): SmsResponse {
    if (error instanceof Error) {
      this.logger.error(
        `短信发送异常: ${ValidatorsUtil.maskIdentifier(phoneNumber, 'phone')}, ` +
          `错误: ${error.message}, 耗时: ${duration}ms`,
        error.stack,
      );

      let errorMessage = error.message;
      let errorCode = 'UNKNOWN_ERROR';

      // 检查常见错误类型
      if (error.message.includes('InvalidAccessKeyId')) {
        errorMessage = 'AccessKey ID 无效';
        errorCode = 'INVALID_ACCESS_KEY';
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        errorMessage = 'AccessKey Secret 错误';
        errorCode = 'INVALID_SECRET';
      } else if (error.message.includes('Throttling')) {
        errorMessage = '请求过于频繁';
        errorCode = 'THROTTLING';
      } else if (error.message.includes('InvalidTemplate')) {
        errorMessage = '短信模板不存在';
        errorCode = 'INVALID_TEMPLATE';
      }

      return {
        success: false,
        message: this.isDevelopment ? errorMessage : '短信发送失败，请稍后重试',
        code: errorCode,
      };
    }

    this.logger.error(
      `短信发送未知异常: ${ValidatorsUtil.maskIdentifier(phoneNumber, 'phone')}, 耗时: ${duration}ms`,
      error,
    );

    return {
      success: false,
      message: '未知错误，请稍后重试',
      code: 'UNKNOWN_ERROR',
    };
  }

  /**
   * 健康检查
   */
  isHealthy(): boolean {
    return !!this.client;
  }
}

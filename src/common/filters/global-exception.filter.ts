// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppConfigService } from '../../config/config.service';

interface ErrorResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.getErrorDetails(exception);

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 记录错误日志
    this.logError(request, errorResponse, exception);

    response.status(status).json(errorResponse);
  }

  private getErrorDetails(exception: unknown): {
    status: number;
    message: string;
  } {
    // 优先处理HttpException
    if (this.isHttpException(exception)) {
      return {
        status: exception.getStatus(),
        message: this.extractHttpExceptionMessage(exception),
      };
    }

    // 处理标准Error实例
    if (this.isError(exception)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.configService.isProduction
          ? '服务器内部错误'
          : exception.message,
      };
    }

    // 处理具有错误属性的对象
    if (this.hasErrorProperties(exception)) {
      return {
        status: exception.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
        message: this.configService.isProduction
          ? '服务器内部错误'
          : exception.message,
      };
    }

    // 处理其他未知类型的异常
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: this.configService.isProduction
        ? '服务器内部错误'
        : this.extractErrorMessage(exception),
    };
  }

  private extractHttpExceptionMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      if ('message' in response) {
        const message = (response as Record<string, unknown>).message;

        if (Array.isArray(message)) {
          return message.join(', ');
        }

        if (typeof message === 'string') {
          return message;
        }
      }
    }

    return exception.message;
  }

  private extractErrorMessage(exception: unknown): string {
    if (this.isError(exception)) {
      return exception.message;
    }

    if (this.hasErrorProperties(exception)) {
      return exception.message;
    }

    if (typeof exception === 'string') {
      return exception;
    }

    // 对于完全未知的类型，尝试转换为字符串
    try {
      return String(exception);
    } catch {
      return '未知错误类型';
    }
  }

  /**
   * 类型守卫：检查是否为HttpException
   */
  private isHttpException(exception: unknown): exception is HttpException {
    return exception instanceof HttpException;
  }

  /**
   * 类型守卫：检查是否为Error实例
   */
  private isError(exception: unknown): exception is Error {
    return exception instanceof Error;
  }

  /**
   * 类型守卫：检查是否包含特定错误属性
   */
  private hasErrorProperties(exception: unknown): exception is {
    message: string;
    code?: string;
    statusCode?: number;
  } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'message' in exception &&
      typeof (exception as Error).message === 'string'
    );
  }

  private logError(
    request: Request,
    errorResponse: ErrorResponse,
    exception: unknown,
  ): void {
    const errorType = this.getExceptionType(exception);
    const logMessage = `${request.method} ${request.url} - ${errorResponse.statusCode} - ${errorResponse.message} [${errorType}]`;

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        logMessage,
        this.isError(exception)
          ? exception.stack
          : this.getExceptionDetails(exception),
      );
    } else {
      this.logger.warn(logMessage);
    }
  }

  /**
   * 获取异常类型描述
   */
  private getExceptionType(exception: unknown): string {
    if (this.isHttpException(exception)) {
      return `HttpException(${exception.constructor.name})`;
    }

    if (this.isError(exception)) {
      return `Error(${exception.constructor.name})`;
    }

    if (this.hasErrorProperties(exception)) {
      return 'ErrorLikeObject';
    }

    return typeof exception;
  }

  /**
   * 获取异常详细信息用于日志记录
   */
  private getExceptionDetails(exception: unknown): string {
    try {
      return JSON.stringify(exception, null, 2);
    } catch {
      return String(exception);
    }
  }
}

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
  code: number;
  message: string;
  data: null;
  path?: string;
}

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logError(request, errorResponse, exception);
    response.status(errorResponse.code).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const path = request.url;

    // HttpException优先处理
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = this.extractHttpExceptionMessage(exception);

      return {
        code: status,
        message,
        data: null,
        path,
      };
    }

    // 其他异常统一处理
    const message = this.configService.isProduction
      ? '服务器内部错误'
      : this.extractErrorMessage(exception);

    return {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      data: null,
      path,
    };
  }

  private extractHttpExceptionMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const httpResponse = response as HttpExceptionResponse;

      if (httpResponse.message) {
        return Array.isArray(httpResponse.message)
          ? httpResponse.message.join(', ')
          : httpResponse.message;
      }
    }

    return exception.message || '请求处理失败';
  }

  private extractErrorMessage(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.message;
    }
    return typeof exception === 'string' ? exception : '未知错误';
  }

  private logError(
    request: Request,
    errorResponse: ErrorResponse,
    exception: unknown,
  ): void {
    const { method, url } = request;
    const { code, message } = errorResponse;

    const logMessage = `${method} ${url} - ${code} - ${message}`;

    if (code >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logMessage);
    }
  }
}

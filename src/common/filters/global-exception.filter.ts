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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object' && errorResponse !== null) {
        const errorObj = errorResponse as Record<string, unknown>;
        message =
          (typeof errorObj.message === 'string'
            ? errorObj.message
            : undefined) || exception.message;
        error =
          (typeof errorObj.error === 'string' ? errorObj.error : undefined) ||
          exception.name;
      } else {
        message = String(errorResponse);
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.configService.isProduction
        ? '服务器内部错误'
        : exception.message;
      error = 'Internal Server Error';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '服务器内部错误';
      error = 'Internal Server Error';
    }

    const errorInfo = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // 记录错误日志
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        JSON.stringify(errorInfo),
        exception instanceof Error ? exception.stack : 'Unknown',
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url}`,
        JSON.stringify(errorInfo),
      );
    }

    response.status(status).json(errorInfo);
  }
}

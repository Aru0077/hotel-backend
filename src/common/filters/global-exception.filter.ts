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
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: this.extractHttpExceptionMessage(exception),
      };
    }

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
    if (exception instanceof Error) {
      return exception.message;
    }

    return '未知错误';
  }

  private logError(
    request: Request,
    errorResponse: ErrorResponse,
    exception: unknown,
  ): void {
    const logMessage = `${request.method} ${request.url} - ${errorResponse.statusCode} - ${errorResponse.message}`;

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(logMessage);
    }
  }
}

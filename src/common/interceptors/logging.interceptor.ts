// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] ?? '';
    const startTime = Date.now();

    this.logger.log(`请求开始: ${method} ${url} - IP: ${ip}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { statusCode } = response;

          this.logger.log(
            `请求完成: ${method} ${url} - 状态码: ${statusCode} - 响应时间: ${duration}ms - IP: ${ip} - User-Agent: ${userAgent}`,
          );
        },
        error: (error: unknown) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const errorMessage =
            error instanceof Error ? error.message : '未知错误';
          const errorStack = error instanceof Error ? error.stack : undefined;

          this.logger.error(
            `请求失败: ${method} ${url} - 错误: ${errorMessage} - 响应时间: ${duration}ms - IP: ${ip}`,
            errorStack,
          );
        },
      }),
    );
  }
}

// src/common/interceptors/response-transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseTransformInterceptor<T = unknown>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data: T) => ({
        success: statusCode < 400,
        statusCode,
        message: this.getStatusMessage(statusCode),
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }

  private getStatusMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return '请求成功';
      case 201:
        return '创建成功';
      case 204:
        return '删除成功';
      default:
        return '操作完成';
    }
  }
}

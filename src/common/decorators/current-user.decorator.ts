// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../../types';

/**
 * 获取当前登录用户信息的装饰器
 */
export const GetCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: CurrentUser }>();
    const user = request.user;

    // 直接返回用户对象或null，类型明确
    return user || null;
  },
);

/**
 * 获取当前用户ID的装饰器
 */
export const GetCurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: CurrentUser }>();
    const user = request.user;

    return user?.userId || null;
  },
);

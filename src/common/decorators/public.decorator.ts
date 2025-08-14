// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * 标记路由为公开访问，无需JWT认证
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

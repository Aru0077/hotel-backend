// src/common/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AppConfigService } from '../../config/config.service';
import { TokenService } from '@auth/services/token.service';
import { JwtPayload } from '../../types';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
    private readonly configService: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('访问令牌不存在');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.jwt.secret,
      });

      // 验证payload基本结构
      if (!payload.sub || !payload.roles || payload.roles.length === 0) {
        throw new UnauthorizedException('JWT载荷无效');
      }

      // 检查令牌是否在黑名单中
      if (payload.jti) {
        const isBlacklisted = await this.tokenService.isBlacklisted(
          payload.jti,
        );
        if (isBlacklisted) {
          throw new UnauthorizedException('访问令牌已被撤销');
        }
      }

      // 将用户信息附加到请求对象
      request.user = {
        userId: payload.sub,
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        roles: payload.roles,
        jti: payload.jti,
      };

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'JWT验证失败';
      this.logger.warn(`JWT验证失败: ${errorMessage}`);
      throw new UnauthorizedException('访问令牌无效或已过期');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

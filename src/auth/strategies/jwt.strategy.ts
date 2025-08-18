// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/config.service';
import { JwtPayload } from '../../types/auth.types';
import { TokenBlacklistService } from '@auth/services/token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: AppConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.secret,
    });
  }

  async validate(payload: JwtPayload) {
    // 基础payload验证
    if (!payload.sub || !payload.roles || payload.roles.length === 0) {
      throw new UnauthorizedException('JWT载荷无效');
    }

    // 检查token是否在黑名单中
    if (
      payload.jti &&
      (await this.tokenBlacklistService.isBlacklisted(payload.jti))
    ) {
      throw new UnauthorizedException('访问令牌已被撤销');
    }
    // 检查令牌是否过期,手动检查 payload.exp 是多余的，passport-jwt 已经处理了过期验证
    // if (payload.exp && Date.now() >= payload.exp * 1000) {
    //   throw new UnauthorizedException('访问令牌已过期');
    // }

    // 返回用户信息，将被附加到 request.user
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      roles: payload.roles,
      jti: payload.jti, // JWT ID，用于令牌撤销功能
    };
  }
}

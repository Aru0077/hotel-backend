// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/config.service';
import { JwtPayload } from '../../types';
import { TokenService } from '../services/token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: AppConfigService,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwt.secret,
    });
  }

  async validate(payload: JwtPayload) {
    // 验证payload基本结构
    if (!payload.sub || !payload.roles || payload.roles.length === 0) {
      throw new UnauthorizedException('JWT载荷无效');
    }

    // 检查令牌是否在黑名单中
    if (payload.jti && (await this.tokenService.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException('访问令牌已被撤销');
    }

    // 返回用户信息，附加到 request.user
    return {
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      roles: payload.roles,
      jti: payload.jti,
    };
  }
}

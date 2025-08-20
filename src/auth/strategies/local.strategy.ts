// src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserWithCredentials } from '../../types';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'identifier',
      passwordField: 'password',
    });
  }

  async validate(
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials> {
    if (!identifier || !password) {
      throw new UnauthorizedException('用户标识符和密码不能为空');
    }

    const user = await this.authService.validateUserCredentials(
      identifier,
      password,
    );

    if (!user) {
      throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
    }

    return user;
  }
}

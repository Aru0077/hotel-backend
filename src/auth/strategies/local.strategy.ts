// src/auth/strategies/local.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'identifier', // 支持用户名、邮箱或手机号
      passwordField: 'password',
    });
  }

  async validate(identifier: string, password: string): Promise<unknown> {
    // 注意：这里应该调用AuthService的validateUserCredentials方法
    // 当前先返回基础验证逻辑，实际实现需要在AuthService中完成

    if (!identifier || !password) {
      throw new UnauthorizedException('用户标识符和密码不能为空');
    }

    // 这里应该是：
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

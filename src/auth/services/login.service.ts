// src/auth/services/login.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import {
  PasswordLoginDto,
  EmailLoginDto,
  PhoneLoginDto,
} from '../dto/auth.dto';
import {
  AuthTokenResponse,
  UserWithRoles,
  VerificationCodePurpose,
} from '../../types';
import { AuthService } from './auth.service';
import { VerificationCodeService } from './verification-code.service';
import { TokenService } from './token.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  /**
   * 密码登录 - 支持用户名/邮箱/手机号+密码
   */
  async loginWithPassword(dto: PasswordLoginDto): Promise<AuthTokenResponse> {
    const user = await this.authService.validateUserCredentials(
      dto.identifier,
      dto.password,
    );

    if (!user) {
      throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
    }

    const userWithRoles = await this.userService.findUserById(user.id);
    if (!userWithRoles) {
      throw new UnauthorizedException('用户不存在');
    }

    this.logger.log(
      `密码登录成功: userId=${user.id}, identifier=${dto.identifier}`,
    );

    return this.generateAuthResponse(userWithRoles);
  }

  /**
   * 邮箱验证码登录
   */
  async loginWithEmailCode(dto: EmailLoginDto): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      VerificationCodePurpose.LOGIN,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userService.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    await this.userService.updateLastLoginTime(user.id);

    // 清除验证码
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      VerificationCodePurpose.LOGIN,
    );

    this.logger.log(
      `邮箱验证码登录成功: userId=${user.id}, email=${dto.email}`,
    );

    return this.generateAuthResponse(user);
  }

  /**
   * 手机验证码登录
   */
  async loginWithPhoneCode(dto: PhoneLoginDto): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      VerificationCodePurpose.LOGIN,
    );

    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userService.findUserByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    await this.userService.updateLastLoginTime(user.id);

    // 清除验证码
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      VerificationCodePurpose.LOGIN,
    );

    this.logger.log(
      `手机验证码登录成功: userId=${user.id}, phone=${dto.phone}`,
    );

    return this.generateAuthResponse(user);
  }

  /**
   * 生成认证响应
   */
  private async generateAuthResponse(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}

// src/auth/services/registration.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  UsernamePasswordRegisterDto,
  EmailRegisterDto,
  PhoneRegisterDto,
} from '../dto/auth.dto';
import {
  AuthTokenResponse,
  CreateUserData,
  UserWithRoles,
  VerificationCodePurpose,
} from '../../types';
import { PasswordService } from './password.service';
import { VerificationCodeService } from './verification-code.service';
import { TokenService } from './token.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  /**
   * 用户名密码注册
   */
  async registerWithUsernamePassword(
    dto: UsernamePasswordRegisterDto,
  ): Promise<AuthTokenResponse> {
    if (await this.userService.checkUserExists(dto.username, 'username')) {
      throw new ConflictException('用户名已存在');
    }

    const userData: CreateUserData = {
      username: dto.username,
      hashedPassword: await this.passwordService.hashPassword(dto.password),
      roleType: dto.roleType,
      isEmailVerified: false,
      isPhoneVerified: false,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);
    this.logger.log(
      `用户名密码注册成功: userId=${user.id}, username=${dto.username}`,
    );

    return this.generateAuthResponse(user);
  }

  /**
   * 邮箱验证码注册
   */
  async registerWithEmailCode(
    dto: EmailRegisterDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      VerificationCodePurpose.REGISTER,
    );

    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    if (await this.userService.checkUserExists(dto.email, 'email')) {
      throw new ConflictException('邮箱已存在');
    }

    const userData: CreateUserData = {
      email: dto.email,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType,
      isEmailVerified: true,
      isPhoneVerified: false,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);

    // 清除验证码
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      VerificationCodePurpose.REGISTER,
    );

    this.logger.log(
      `邮箱验证码注册成功: userId=${user.id}, email=${dto.email}`,
    );

    return this.generateAuthResponse(user);
  }

  /**
   * 手机验证码注册
   */
  async registerWithPhoneCode(
    dto: PhoneRegisterDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      VerificationCodePurpose.REGISTER,
    );

    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    if (await this.userService.checkUserExists(dto.phone, 'phone')) {
      throw new ConflictException('手机号已存在');
    }

    const userData: CreateUserData = {
      phone: dto.phone,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType,
      isEmailVerified: false,
      isPhoneVerified: true,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);

    // 清除验证码
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      VerificationCodePurpose.REGISTER,
    );

    this.logger.log(
      `手机验证码注册成功: userId=${user.id}, phone=${dto.phone}`,
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

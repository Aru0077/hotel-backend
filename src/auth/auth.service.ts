// src/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  UsernamePasswordRegisterDto,
  EmailRegisterDto,
  PhoneRegisterDto,
  EmailLoginDto,
  PhoneLoginDto,
  SendVerificationCodeDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import {
  AuthTokenResponse,
  UserWithCredentials,
  UserWithRoles,
  CreateUserData,
} from '../types';
import { PasswordService } from './services/password.service';
import { VerificationCodeService } from './services/verification-code.service';
import { TokenService } from './services/token.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  // ============ 注册方法 ============

  async registerWithUsernamePassword(
    dto: UsernamePasswordRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 检查用户名是否已存在
    if (await this.userService.checkUserExists(dto.username, 'username')) {
      throw new ConflictException('用户名已存在');
    }

    // 创建用户数据
    const userData: CreateUserData = {
      username: dto.username,
      hashedPassword: await this.passwordService.hashPassword(dto.password),
      roleType: dto.roleType ?? 'customer',
      isUsernameVerified: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);
    return this.generateAuthResponse(user);
  }

  async registerWithEmail(dto: EmailRegisterDto): Promise<AuthTokenResponse> {
    // 验证邮箱验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      'register',
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 检查邮箱是否已存在
    if (await this.userService.checkUserExists(dto.email, 'email')) {
      throw new ConflictException('邮箱已存在');
    }

    // 创建用户数据
    const userData: CreateUserData = {
      email: dto.email,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType ?? 'customer',
      isUsernameVerified: false,
      isEmailVerified: true,
      isPhoneVerified: false,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);

    // 清除验证码
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      'register',
    );

    return this.generateAuthResponse(user);
  }

  async registerWithPhone(dto: PhoneRegisterDto): Promise<AuthTokenResponse> {
    // 验证手机验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      'register',
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 检查手机号是否已存在
    if (await this.userService.checkUserExists(dto.phone, 'phone')) {
      throw new ConflictException('手机号已存在');
    }

    // 创建用户数据
    const userData: CreateUserData = {
      phone: dto.phone,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      roleType: dto.roleType ?? 'customer',
      isUsernameVerified: false,
      isEmailVerified: false,
      isPhoneVerified: true,
      isFacebookVerified: false,
      isGoogleVerified: false,
    };

    const user = await this.userService.createUser(userData);

    // 清除验证码
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      'register',
    );

    return this.generateAuthResponse(user);
  }

  // ============ 登录方法 ============

  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials | null> {
    const user = await this.userService.findUserByIdentifier(identifier);

    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    // 验证密码
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );
    if (!isPasswordValid) {
      return null;
    }

    // 更新最后登录时间
    await this.userService.updateLastLoginTime(user.id);

    return user;
  }

  async loginWithEmail(dto: EmailLoginDto): Promise<AuthTokenResponse> {
    // 验证邮箱验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      'login',
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userService.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    await this.userService.updateLastLoginTime(user.id);
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      'login',
    );

    return this.generateAuthResponse(user);
  }

  async loginWithPhone(dto: PhoneLoginDto): Promise<AuthTokenResponse> {
    // 验证手机验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      'login',
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    const user = await this.userService.findUserByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    await this.userService.updateLastLoginTime(user.id);
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      'login',
    );

    return this.generateAuthResponse(user);
  }

  // ============ 辅助方法 ============

  async sendVerificationCode(dto: SendVerificationCodeDto): Promise<void> {
    await this.verificationCodeService.sendVerificationCode(dto);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    const payload = await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );
    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return await this.tokenService.refreshToken(dto, user);
  }

  async logout(userId: number, refreshToken?: string): Promise<void> {
    await this.tokenService.logout(userId, refreshToken);
  }

  // ============ 私有方法 ============

  private async generateAuthResponse(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}

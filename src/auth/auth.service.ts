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
  PasswordLoginDto,
  EmailLoginDto,
  PhoneLoginDto,
  SendVerificationCodeDto,
} from './dto/auth.dto';
import {
  AuthTokenResponse,
  UserWithCredentials,
  UserWithRoles,
  CreateUserData,
  VerificationCodeType,
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
    return this.generateAuthResponse(user);
  }

  async registerWithEmailCode(
    dto: EmailRegisterDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      'register',
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
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      'register',
    );

    return this.generateAuthResponse(user);
  }

  async registerWithPhoneCode(
    dto: PhoneRegisterDto,
  ): Promise<AuthTokenResponse> {
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      'register',
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

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );
    if (!isPasswordValid) {
      return null;
    }

    await this.userService.updateLastLoginTime(user.id);
    return user;
  }

  async loginWithPassword(dto: PasswordLoginDto): Promise<AuthTokenResponse> {
    const user = await this.validateUserCredentials(
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

    return this.generateAuthResponse(userWithRoles);
  }

  async loginWithEmailCode(dto: EmailLoginDto): Promise<AuthTokenResponse> {
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

  async loginWithPhoneCode(dto: PhoneLoginDto): Promise<AuthTokenResponse> {
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

  async sendVerificationCode(
    dto: SendVerificationCodeDto,
  ): Promise<{ success: boolean; message: string }> {
    // 确定验证码类型
    const type = dto.email
      ? VerificationCodeType.EMAIL
      : VerificationCodeType.PHONE;

    // 构造验证码服务所需的参数
    const verificationDto = {
      ...dto,
      type,
    };

    await this.verificationCodeService.sendVerificationCode(verificationDto);
    return {
      success: true,
      message: '验证码发送成功',
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const dto = { refreshToken };
    return await this.tokenService.refreshToken(dto, user);
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: '注销成功',
    };
  }

  // ============ 私有方法 ============

  private async generateAuthResponse(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}

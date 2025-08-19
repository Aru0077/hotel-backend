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
  EmailCodeRegisterDto,
  PhoneCodeRegisterDto,
  EmailCodeLoginDto,
  PhoneCodeLoginDto,
  SendVerificationCodeDto,
  RefreshTokenDto,
} from './dto';
import { AuthTokenResponse, UserWithCredentials } from '../types';

// 导入各个专门化服务
import { PasswordService } from './services/password.service';
import { VerificationCodeService } from './services/verification-code.service';
import { TokenService } from './services/token.service';
import { UserService } from '../user/user.service';
import { UserValidationService } from '../user/services/user-validation.service';
import { UserCreationService } from '../user/services/user-creation.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly userValidationService: UserValidationService,
    private readonly userCreationService: UserCreationService,
  ) {}

  // ============ 注册相关方法 ============

  /**
   * 用户名密码注册
   */
  async registerWithUsernamePassword(
    dto: UsernamePasswordRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 验证用户名格式
    this.userValidationService.validateUsernameFormat(dto.username);
    this.userValidationService.validatePasswordStrength(dto.password);

    // 检查用户名是否已存在
    const existingUser = await this.userService.checkUserExists(
      dto.username,
      'username',
    );
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 对密码进行加密
    const hashedPassword = await this.passwordService.hashPassword(
      dto.password,
    );

    // 创建用户记录
    const user = await this.userCreationService.createUsernamePasswordUser(
      dto.username,
      hashedPassword,
      dto.roleTypes,
    );

    // 生成JWT令牌并返回认证响应
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  /**
   * 邮箱验证码注册
   */
  async registerWithEmailCode(
    dto: EmailCodeRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 验证邮箱验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      'register',
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 验证邮箱是否已存在
    const existingUser = await this.userService.checkUserExists(
      dto.email,
      'email',
    );
    if (existingUser) {
      throw new ConflictException('邮箱已存在');
    }

    // 对密码进行加密（如果提供）
    let hashedPassword: string | undefined;
    if (dto.password) {
      this.userValidationService.validatePasswordStrength(dto.password);
      hashedPassword = await this.passwordService.hashPassword(dto.password);
    }

    // 创建用户记录
    const user = await this.userCreationService.createEmailCodeUser(
      dto.email,
      hashedPassword,
      dto.roleTypes,
    );

    // 清除验证码缓存
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      'register',
    );

    // 生成JWT令牌并返回认证响应
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  /**
   * 手机验证码注册
   */
  async registerWithPhoneCode(
    dto: PhoneCodeRegisterDto,
  ): Promise<AuthTokenResponse> {
    // 验证手机验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      'register',
    );
    if (!isCodeValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 验证手机号是否已存在
    const existingUser = await this.userService.checkUserExists(
      dto.phone,
      'phone',
    );
    if (existingUser) {
      throw new ConflictException('手机号已存在');
    }

    // 对密码进行加密（如果提供）
    let hashedPassword: string | undefined;
    if (dto.password) {
      this.userValidationService.validatePasswordStrength(dto.password);
      hashedPassword = await this.passwordService.hashPassword(dto.password);
    }

    // 创建用户记录
    const user = await this.userCreationService.createPhoneCodeUser(
      dto.phone,
      hashedPassword,
      dto.roleTypes,
    );

    // 清除验证码缓存
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      'register',
    );

    // 生成JWT令牌并返回认证响应
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  // ============ 登录相关方法 ============

  /**
   * 验证用户凭证（用于LocalStrategy）
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithCredentials | null> {
    // 根据标识符查找用户
    const user = await this.userService.findUserByIdentifier(identifier);

    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    // 验证密码是否正确
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );
    if (!isPasswordValid) {
      return null;
    }

    // 检查用户状态是否正常
    if (!this.userService.isUserActive(user)) {
      return null;
    }

    // 更新最后登录时间和使用时间
    await this.userService.updateLastLoginTime(user.id);

    // 确定使用的是哪种登录方式
    let loginType: 'username' | 'email' | 'phone' = 'username';
    if (user.credentials.email === identifier) {
      loginType = 'email';
    } else if (user.credentials.phone === identifier) {
      loginType = 'phone';
    }

    await this.userService.updateCredentialLastUsedTime(user.id, loginType);

    return user;
  }

  /**
   * 邮箱验证码登录
   */
  async loginWithEmailCode(dto: EmailCodeLoginDto): Promise<AuthTokenResponse> {
    // 验证邮箱验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.email,
      dto.verificationCode,
      'login',
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 查找对应的用户
    const user = await this.userService.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 检查用户状态
    if (!this.userService.isUserActive(user)) {
      throw new UnauthorizedException('用户账户状态异常');
    }

    // 更新最后登录时间和邮箱使用时间
    await this.userService.updateLastLoginTime(user.id);
    await this.userService.updateCredentialLastUsedTime(user.id, 'email');

    // 清除验证码缓存
    await this.verificationCodeService.clearVerificationCode(
      dto.email,
      'login',
    );

    // 生成JWT令牌并返回认证响应
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  /**
   * 手机验证码登录
   */
  async loginWithPhoneCode(dto: PhoneCodeLoginDto): Promise<AuthTokenResponse> {
    // 验证手机验证码
    const isCodeValid = await this.verificationCodeService.verifyCode(
      dto.phone,
      dto.verificationCode,
      'login',
    );
    if (!isCodeValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 查找对应的用户
    const user = await this.userService.findUserByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 检查用户状态
    if (!this.userService.isUserActive(user)) {
      throw new UnauthorizedException('用户账户状态异常');
    }

    // 更新最后登录时间和手机使用时间
    await this.userService.updateLastLoginTime(user.id);
    await this.userService.updateCredentialLastUsedTime(user.id, 'phone');

    // 清除验证码缓存
    await this.verificationCodeService.clearVerificationCode(
      dto.phone,
      'login',
    );

    // 生成JWT令牌并返回认证响应
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  // ============ 验证码相关方法 ============

  /**
   * 发送验证码
   */
  async sendVerificationCode(dto: SendVerificationCodeDto): Promise<void> {
    await this.verificationCodeService.sendVerificationCode(dto);
  }

  // ============ 令牌相关方法 ============

  /**
   * 刷新访问令牌
   */
  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    // 验证刷新令牌格式
    const payload = await this.tokenService.verifyRefreshToken(
      dto.refreshToken,
    );

    // 查找用户
    const user = await this.userService.findUserById(payload.sub);
    if (!user || !this.userService.isUserActive(user)) {
      throw new UnauthorizedException('用户不存在或状态异常');
    }

    // 使用TokenService处理刷新逻辑
    return await this.tokenService.refreshToken(dto, user);
  }

  /**
   * 用户注销
   */
  async logout(userId: number, refreshToken?: string): Promise<void> {
    await this.tokenService.logout(userId, refreshToken);
  }

  // ============ 社交媒体认证（预留） ============
  // Facebook和Google相关方法保持不变，暂时不修改
}

// src/auth/auth.service.ts - 重构后的认证服务
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AuthDto, SendCodeDto } from './dto/auth.dto';
import {
  AuthTokenResponse,
  CreateUserData,
  CurrentUser,
  UserWithRoles,
  FacebookProfile,
  GoogleProfile,
} from '../types';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { VerificationCodeService } from './services/verification-code.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  /**
   * 统一注册方法
   */
  async register(dto: AuthDto): Promise<AuthTokenResponse> {
    const identifierType = this.userService.detectIdentifierType(
      dto.identifier,
    );

    // 检查用户是否已存在
    if (
      await this.userService.checkUserExists(dto.identifier, identifierType)
    ) {
      throw new ConflictException('用户已存在');
    }

    // 验证码注册
    if (dto.verificationCode) {
      const isValid = await this.verificationCodeService.verifyCode(
        dto.identifier,
        dto.verificationCode,
      );
      if (!isValid) {
        throw new BadRequestException('验证码错误或已过期');
      }
    }

    // 密码强度验证
    if (dto.password) {
      const validation = this.passwordService.validatePasswordStrength(
        dto.password,
      );
      if (!validation.isValid) {
        throw new BadRequestException(
          `密码强度不足: ${validation.errors.join(', ')}`,
        );
      }
    }

    // 构建用户数据
    const userData: CreateUserData = {
      roleType: dto.roleType,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      ...this.userService.buildCredentialsByType(
        dto.identifier,
        identifierType,
        !!dto.verificationCode,
      ),
    };

    // 创建用户
    const user = await this.userService.createUser(userData);

    // 清除验证码
    if (dto.verificationCode) {
      await this.verificationCodeService.clearVerificationCode(dto.identifier);
    }

    this.logger.log(
      `用户注册成功: ${this.userService.maskIdentifier(dto.identifier, identifierType)}, 角色: ${dto.roleType}`,
    );

    return this.generateTokens(user);
  }

  /**
   * 统一登录方法
   */
  async login(dto: AuthDto): Promise<AuthTokenResponse> {
    let user: UserWithRoles | null = null;

    if (dto.verificationCode) {
      // 验证码登录
      const isValid = await this.verificationCodeService.verifyCode(
        dto.identifier,
        dto.verificationCode,
      );
      if (!isValid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }

      user = await this.userService.findUserByIdentifier(dto.identifier);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      await this.verificationCodeService.clearVerificationCode(dto.identifier);
    } else {
      // 密码登录
      if (!dto.password) {
        throw new BadRequestException('密码登录需要提供密码');
      }

      user = await this.userService.findUserByIdentifier(dto.identifier);
      if (!user?.credentials?.hashedPassword) {
        throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
      }

      const isValid = await this.passwordService.comparePassword(
        dto.password,
        user.credentials.hashedPassword,
      );
      if (!isValid) {
        throw new UnauthorizedException('用户名、邮箱、手机号或密码错误');
      }
    }

    // 更新登录时间
    await this.userService.updateLastLoginTime(user.id);

    this.logger.log(
      `用户登录成功: userId=${user.id}, 角色数量=${user.roles.length}`,
    );

    return this.generateTokens(user);
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(dto: SendCodeDto): Promise<void> {
    return this.verificationCodeService.sendVerificationCode(dto);
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      const user = await this.userService.findUserById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      const dto = { refreshToken };
      return await this.tokenService.refreshToken(dto, user);
    } catch (error) {
      this.logger.warn(
        `刷新令牌失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  /**
   * 用户注销
   */
  async logout(user: CurrentUser): Promise<{ success: boolean }> {
    try {
      await this.tokenService.logout(user.userId);
      this.logger.log(`用户注销成功: userId=${user.userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`用户注销失败: userId=${user.userId}`, error);
      throw error;
    }
  }

  /**
   * 验证用户凭证（供策略使用）
   */
  async validateUserCredentials(
    identifier: string,
    password: string,
  ): Promise<UserWithRoles | null> {
    const user = await this.userService.findUserByIdentifier(identifier);
    if (!user?.credentials?.hashedPassword) {
      return null;
    }

    const isValid = await this.passwordService.comparePassword(
      password,
      user.credentials.hashedPassword,
    );

    return isValid ? user : null;
  }

  // ============ OAuth认证方法 ============

  /**
   * Facebook认证
   */
  async authenticateWithFacebook(
    facebookId: string,
    profile: FacebookProfile,
  ): Promise<UserWithRoles> {
    let user = await this.userService.findUserByFacebookId(facebookId);

    if (!user) {
      // 创建新用户
      const userData: CreateUserData = {
        facebookId,
        isFacebookVerified: true,
        roleType: 'CUSTOMER', // 默认角色
        email: profile.email,
        isEmailVerified: !!profile.email,
      };
      user = await this.userService.createUser(userData);
    } else {
      // 更新登录时间
      await this.userService.updateLastLoginTime(user.id);
    }

    return user;
  }

  /**
   * Google认证
   */
  async authenticateWithGoogle(
    googleId: string,
    profile: GoogleProfile,
  ): Promise<UserWithRoles> {
    let user = await this.userService.findUserByGoogleId(googleId);

    if (!user) {
      // 创建新用户
      const userData: CreateUserData = {
        googleId,
        isGoogleVerified: true,
        roleType: 'CUSTOMER', // 默认角色
        email: profile.email,
        isEmailVerified: !!profile.email,
      };
      user = await this.userService.createUser(userData);
    } else {
      // 更新登录时间
      await this.userService.updateLastLoginTime(user.id);
    }

    return user;
  }

  // ============ 私有方法 ============

  /**
   * 生成认证令牌
   */
  private async generateTokens(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }
}

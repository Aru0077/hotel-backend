// src/auth/auth.service.ts - 简化的统一认证服务
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
} from '../types';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { VerificationCodeService } from './services/verification-code.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationCodeService: VerificationCodeService,
    private readonly userService: UserService,
  ) {}

  /**
   * 统一注册方法
   */
  async register(dto: AuthDto): Promise<AuthTokenResponse> {
    const identifierType = this.detectIdentifierType(dto.identifier);

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
      ...this.buildCredentialsByType(
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
      `用户注册成功: ${this.maskIdentifier(dto.identifier, identifierType)}, 角色: ${dto.roleType}`,
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

      user = await this.findUserByIdentifier(dto.identifier);
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

  // ============ 私有方法 ============

  /**
   * 自动检测标识符类型
   */
  private detectIdentifierType(
    identifier: string,
  ): 'username' | 'email' | 'phone' {
    // 邮箱正则
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      return 'email';
    }
    // 手机号正则（国内外）
    if (/^(\+\d{1,3})?\d{10,14}$/.test(identifier.replace(/\s/g, ''))) {
      return 'phone';
    }
    // 默认为用户名
    return 'username';
  }

  /**
   * 根据标识符类型构建认证凭证
   */
  private buildCredentialsByType(
    identifier: string,
    type: 'username' | 'email' | 'phone',
    isVerified: boolean,
  ) {
    const credentials = {
      username: undefined as string | undefined,
      email: undefined as string | undefined,
      phone: undefined as string | undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
    };

    switch (type) {
      case 'email':
        credentials.email = identifier;
        credentials.isEmailVerified = isVerified;
        break;
      case 'phone':
        credentials.phone = identifier;
        credentials.isPhoneVerified = isVerified;
        break;
      case 'username':
        credentials.username = identifier;
        break;
    }

    return credentials;
  }

  /**
   * 根据标识符查找用户
   */
  private async findUserByIdentifier(
    identifier: string,
  ): Promise<UserWithRoles | null> {
    const type = this.detectIdentifierType(identifier);

    switch (type) {
      case 'email':
        return this.userService.findUserByEmail(identifier);
      case 'phone':
        return this.userService.findUserByPhone(identifier);
      default:
        return this.userService.findUserByIdentifier(identifier);
    }
  }

  /**
   * 生成认证令牌
   */
  private async generateTokens(
    user: UserWithRoles,
  ): Promise<AuthTokenResponse> {
    const tokens = await this.tokenService.generateTokens(user);
    return this.tokenService.formatAuthResponse(tokens, user);
  }

  /**
   * 标识符脱敏
   */
  private maskIdentifier(
    identifier: string,
    type: 'username' | 'email' | 'phone',
  ): string {
    switch (type) {
      case 'email':
        return identifier.replace(/(.{1}).*(@.*)/, '$1***$2');
      case 'phone':
        if (identifier.startsWith('+86')) {
          return identifier.replace(/(\+86\d{3})\d{4}(\d{4})/, '$1****$2');
        } else if (identifier.startsWith('+')) {
          return identifier.replace(/(\+\d{1,3}\d{2})\d*(\d{4})/, '$1****$2');
        } else {
          return identifier.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
      case 'username':
        return identifier.length > 4
          ? identifier.slice(0, 2) + '***' + identifier.slice(-2)
          : identifier.slice(0, 1) + '***';
      default:
        return identifier.slice(0, 3) + '***';
    }
  }
}

// src/auth/auth.service.ts - 简化的统一认证服务
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { RegisterDto, LoginDto, SendCodeDto } from './dto/auth.dto';
import {
  AuthTokenResponse,
  CreateUserData,
  CurrentUser,
  VerificationCodePurpose,
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
  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    const identifier = this.extractIdentifier(dto);
    const identifierType = this.detectIdentifierType(identifier);

    // 检查用户是否已存在
    if (await this.userService.checkUserExists(identifier, identifierType)) {
      throw new ConflictException('用户已存在');
    }

    // 验证码注册
    if (dto.verificationCode) {
      const isValid = await this.verificationCodeService.verifyCode(
        identifier,
        dto.verificationCode,
        VerificationCodePurpose.REGISTER,
      );
      if (!isValid) {
        throw new BadRequestException('验证码错误或已过期');
      }
    }

    // 构建用户数据
    const userData: CreateUserData = {
      roleType: dto.roleType,
      hashedPassword: dto.password
        ? await this.passwordService.hashPassword(dto.password)
        : undefined,
      ...this.buildCredentialsByType(
        identifier,
        identifierType,
        !!dto.verificationCode,
      ),
    };

    // 创建用户
    const user = await this.userService.createUser(userData);

    // 清除验证码
    if (dto.verificationCode) {
      await this.verificationCodeService.clearVerificationCode(
        identifier,
        VerificationCodePurpose.REGISTER,
      );
    }

    return this.generateTokens(user);
  }

  /**
   * 统一登录方法
   */
  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    let user: UserWithRoles | null = null;

    if (dto.verificationCode) {
      // 验证码登录
      const identifier = dto.email || dto.phone;
      if (!identifier) {
        throw new BadRequestException('验证码登录需要提供邮箱或手机号');
      }

      const isValid = await this.verificationCodeService.verifyCode(
        identifier,
        dto.verificationCode,
        VerificationCodePurpose.LOGIN,
      );
      if (!isValid) {
        throw new UnauthorizedException('验证码错误或已过期');
      }

      user = await this.findUserByIdentifier(identifier);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      await this.verificationCodeService.clearVerificationCode(
        identifier,
        VerificationCodePurpose.LOGIN,
      );
    } else {
      // 密码登录
      if (!dto.identifier || !dto.password) {
        throw new BadRequestException('密码登录需要提供用户标识符和密码');
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

    // 验证角色权限
    if (dto.preferredRole) {
      const hasRole = user.roles.some(
        (role) =>
          role.roleType === dto.preferredRole && role.status === 'ACTIVE',
      );
      if (!hasRole) {
        throw new UnauthorizedException('用户不具备该角色权限');
      }
    }

    // 更新登录时间
    await this.userService.updateLastLoginTime(user.id);

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
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const dto = { refreshToken };
    return await this.tokenService.refreshToken(dto, user);
  }

  /**
   * 用户注销
   */
  async logout(user: CurrentUser): Promise<{ success: boolean }> {
    await this.tokenService.logout(user.userId);
    return { success: true };
  }

  // ============ 私有方法 ============

  /**
   * 从DTO中提取标识符
   */
  private extractIdentifier(dto: RegisterDto): string {
    if (dto.username) return dto.username;
    if (dto.email) return dto.email;
    if (dto.phone) return dto.phone;
    throw new BadRequestException('必须提供用户名、邮箱或手机号');
  }

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
}
